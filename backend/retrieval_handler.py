import os
import json
import asyncio
from typing import List, Dict, Any

from dotenv import load_dotenv
import google.generativeai as genai
import chromadb
from sentence_transformers import CrossEncoder

# Load environment variables from a .env file
load_dotenv()

# --- Configuration ---
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
EMBEDDING_MODEL = "models/text-embedding-004"
GENERATION_MODEL = "gemini-1.5-flash"
CHROMA_DB_PATH = "chroma_db"
CHROMA_COLLECTION_NAME = "document_insights"
RERANKER_MODEL = 'cross-encoder/ms-marco-MiniLM-L6-v2'

# --- REFINED PROMPT for better JSON compliance ---
INITIAL_INSIGHTS_PROMPT = """
You are an expert AI assistant. Your task is to analyze a user's selected text and categorize the provided context sections.

Based ONLY on the provided context, generate a single, valid JSON object and nothing else. Do not add any explanatory text or markdown formatting before or after the JSON.

The JSON object must have four keys: "contradictions", "enhancements", "connections", and "podcast_script".

1.  **contradictions**: An array of the full JSON objects for any context sections that directly contradict the user's selected text.
2.  **enhancements**: An array of the full JSON objects for any context sections that build upon or provide a detailed example of the user's selection.
3.  **connections**: An array of the full JSON objects for any context sections that are related but not direct enhancements.
4.  **podcast_script**: A two-speaker podcast script of 2-5 minutes summarizing the key findings.

If a category has no relevant sections, its value must be an empty array.

USER'S SELECTED TEXT:
"{user_selection}"

CONTEXT (Sections from the user's library):
{context_sections_json}
---
"""

PERSONA_PODCAST_PROMPT = """
You are a creative podcast script writer. Based on the user's selected text and the provided context, write a short, engaging, two-speaker podcast script (Host, Analyst) of 2-5 minutes in the style of a "{persona}".

USER'S SELECTED TEXT:
"{user_selection}"

CONTEXT (Top 5 most relevant sections):
{context_sections_json}
---
"""

MULTI_QUERY_PROMPT = """
You are a helpful AI assistant. Your task is to generate 3 diverse questions based on a user's text selection. These questions will be used to search a document library. The questions should be tailored to find:
1.  A potential contradiction or opposing viewpoint.
2.  A detailed enhancement or example.
3.  A surprising, analogous connection from a different domain.

Based on the following text, generate a JSON object with a single key "queries" containing a list of 3 question strings.

USER'S SELECTED TEXT:
"{user_selection}"
"""
PERSONA_STYLES = {
    "debater": "The Host and Analyst should present opposing viewpoints or debate the nuances of the findings.",
    "investigator": "The Host and Analyst should dig deep into the evidence, questioning assumptions and focusing on factual details.",
    "fundamentals": "The Host and Analyst should start with the most basic, foundational concepts from the context and progressively build up to the user's selected topic.",
    "connector": "The Host and Analyst should focus on drawing surprising connections and analogies between the selected topic and other concepts found in the context, even from different domains."
}

# *** NEW: More Robust JSON Parsing Function ***
def extract_json_from_string(text: str) -> Dict[str, Any]:
    """
    Finds and parses the first valid JSON object from a string,
    ignoring markdown code fences and other leading/trailing text.
    """
    try:
        # Clean up markdown fences if they exist
        if text.strip().startswith("```json"):
            text = text.strip()[7:-3]
        elif text.strip().startswith("```"):
            text = text.strip()[3:-3]

        # Find the start of the JSON object
        start_index = text.find('{')
        if start_index == -1:
            raise ValueError("No JSON object found in the response string.")

        # Find the end of the JSON object by balancing braces, which is more reliable
        open_braces = 0
        end_index = -1
        for i in range(start_index, len(text)):
            if text[i] == '{':
                open_braces += 1
            elif text[i] == '}':
                open_braces -= 1
            
            if open_braces == 0:
                end_index = i + 1
                break
        
        if end_index == -1:
            raise ValueError("Could not find the end of the JSON object.")

        json_str = text[start_index:end_index]
        return json.loads(json_str)
        
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON: {e}")
        # It's helpful to log the problematic segment for debugging
        print(f"Problematic string segment for parser: {json_str}")
        return {"error": "Failed to parse JSON from model response."}
    except Exception as e:
        print(f"An unexpected error occurred during JSON extraction: {e}")
        return {"error": "An unexpected error occurred."}


class RetrievalHandler:
    def __init__(self, google_api_key: str):
        if not google_api_key:
            raise ValueError("Google API key is required.")
        genai.configure(api_key=google_api_key)
        self.client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
        self.collection = self.client.get_or_create_collection(name=CHROMA_COLLECTION_NAME)
        self.generation_model = genai.GenerativeModel(
            GENERATION_MODEL,
            generation_config={"response_mime_type": "application/json"}
        )
        self.reranker = CrossEncoder(RERANKER_MODEL)
        print("RetrievalHandler initialized successfully with reranker.")

    async def retrieve_fast_async(self, user_selection: str) -> List[Dict[str, Any]]:
        print("Executing FAST retrieval (single-query + rerank)...")
        result = await genai.embed_content_async(
            model=EMBEDDING_MODEL, content=user_selection, task_type="RETRIEVAL_QUERY"
        )
        query_embedding = result['embedding']
        query_results = self.collection.query(query_embeddings=[query_embedding], n_results=40)
        candidate_metadatas = query_results.get('metadatas', [[]])[0]
        if not candidate_metadatas: return []
        rerank_pairs = [[user_selection, meta.get('original_content', '')] for meta in candidate_metadatas]
        scores = self.reranker.predict(rerank_pairs)
        scored_candidates = sorted(zip(scores, candidate_metadatas), key=lambda x: x[0], reverse=True)
        reranked_results = [meta for score, meta in scored_candidates[:15]]
        for meta in reranked_results:
            if 'bounding_box' in meta and isinstance(meta['bounding_box'], str):
                try: meta['bounding_box'] = json.loads(meta['bounding_box'])
                except json.JSONDecodeError: meta['bounding_box'] = {}
        print(f"Fast retrieval complete. Found {len(reranked_results)} sections.")
        return reranked_results

    async def retrieve_deep_async(self, user_selection: str) -> List[Dict[str, Any]]:
        print("Executing DEEP retrieval (multi-query + rerank)...")
        try:
            prompt = MULTI_QUERY_PROMPT.format(user_selection=user_selection)
            fast_model = genai.GenerativeModel(GENERATION_MODEL, generation_config={"response_mime_type": "application/json"})
            response = await fast_model.generate_content_async(prompt)
            print(response)
            # Use the robust parser here as well
            sub_queries = extract_json_from_string(response.text).get("queries", [])
            queries = [user_selection] + sub_queries
        except Exception:
            queries = [user_selection] # Fallback to single query
            
        embeddings = await genai.embed_content_async(model=EMBEDDING_MODEL, content=queries, task_type="RETRIEVAL_QUERY")
        query_results = self.collection.query(query_embeddings=embeddings['embedding'], n_results=10)
        candidate_metadatas = {}
        for metadata_list in query_results.get('metadatas', []):
            for meta in metadata_list:
                unique_id = f"{meta.get('document_name')}_{meta.get('original_content')}"
                candidate_metadatas[unique_id] = meta
        unique_candidates = list(candidate_metadatas.values())
        if not unique_candidates: return []
        rerank_pairs = [[user_selection, meta.get('original_content', '')] for meta in unique_candidates]
        scores = self.reranker.predict(rerank_pairs)
        scored_candidates = sorted(zip(scores, unique_candidates), key=lambda x: x[0], reverse=True)
        reranked_results = [meta for score, meta in scored_candidates[:15]]
        for meta in reranked_results:
            if 'bounding_box' in meta and isinstance(meta['bounding_box'], str):
                try: meta['bounding_box'] = json.loads(meta['bounding_box'])
                except json.JSONDecodeError: meta['bounding_box'] = {}
        print(f"Deep retrieval complete. Found {len(reranked_results)} sections for context.")
        return reranked_results

    async def generate_initial_insights_async(self, user_selection: str) -> Dict[str, Any]:
        context_sections = await self.retrieve_deep_async(user_selection)
        if not context_sections:
            return {"contradictions": [], "enhancements": [], "connections": [], "podcast_script": "No relevant context found."}
        
        prompt = INITIAL_INSIGHTS_PROMPT.format(
            user_selection=user_selection, context_sections_json=json.dumps(context_sections, indent=2)
        )
        try:
            response = await self.generation_model.generate_content_async(prompt)
            print("Deep insight generation complete.")
            # *** USE THE ROBUST PARSER ***
            return extract_json_from_string(response.text)
        except Exception as e:
            return {"error": f"Could not generate initial insights: {e}"}

    async def generate_persona_podcast_async(self, user_selection: str, persona: str) -> Dict[str, Any]:
        context_sections = await self.retrieve_deep_async(user_selection)
        if not context_sections:
            return {"podcast_script": "Cannot generate a podcast without context."}
            
        style_guide = PERSONA_STYLES.get(persona, "a balanced and informative style")
        prompt = PERSONA_PODCAST_PROMPT.format(
            persona=style_guide, user_selection=user_selection, context_sections_json=json.dumps(context_sections, indent=2)
        )
        try:
            # For text-only generation, no need for JSON mime type
            text_generation_model = genai.GenerativeModel(GENERATION_MODEL)
            response = await text_generation_model.generate_content_async(prompt)
            return {"podcast_script": response.text.strip()}
        except Exception as e:
            return {"error": f"Could not generate persona podcast: {e}"}
            
    def delete_document(self, document_name: str):
        """
        Deletes all vector entries associated with a specific document name
        from the ChromaDB collection.
        """
        print(f"Attempting to delete all entries for document: {document_name}")
        
        try:
            # The 'where' filter is the key. It tells ChromaDB to only
            # delete items that match this metadata condition.
            self.collection.delete(
                where={"document_name": document_name}
            )
            print(f"Successfully deleted all entries for {document_name}.")
            return {"status": "success", "message": f"Document '{document_name}' deleted."}
        except Exception as e:
            print(f"Error deleting document {document_name}: {e}")
            return {"status": "error", "message": str(e)}
