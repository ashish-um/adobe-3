import os
import asyncio
import time
from functools import wraps
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
from asgiref.wsgi import WsgiToAsgi

# Import our core application logic
from indexing_pipeline import IndexingPipeline
from retrieval_handler import RetrievalHandler

# Load environment variables from a .env file
load_dotenv()

# --- Configuration ---
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
UPLOAD_FOLDER = "pdfs"
MODEL_FILE = "models/heading_classifier_model.joblib"
ENCODER_FILE = "models/label_encoder.joblib"
ALLOWED_EXTENSIONS = {'pdf'}

# --- Flask App Initialization ---
flask_app = Flask(__name__)
flask_app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(flask_app.config['UPLOAD_FOLDER'], exist_ok=True)

# --- Initialize Handlers ---
try:
    retrieval_handler = RetrievalHandler(google_api_key=GOOGLE_API_KEY)
except Exception as e:
    print(f"FATAL: Could not initialize RetrievalHandler: {e}")
    retrieval_handler = None

# --- Timing Decorator ---
def time_request(f):
    @wraps(f)
    async def decorated_function(*args, **kwargs):
        start_time = time.time()
        result = await f(*args, **kwargs)
        end_time = time.time()
        duration = end_time - start_time
        print(f"Request to '{request.path}' took {duration:.3f} seconds.")
        return result
    return decorated_function

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# --- API Endpoints ---
@flask_app.route('/upload_batch', methods=['POST'])
@time_request
async def upload_batch():
    if 'files' not in request.files:
        return jsonify({"error": "No file part in the request."}), 400
    files = request.files.getlist('files')
    saved_files = []
    for file in files:
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filepath = os.path.join(flask_app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            saved_files.append(filepath)
    if not saved_files:
        return jsonify({"error": "No valid PDF files were uploaded."}), 400
    try:
        indexing_pipeline = IndexingPipeline(google_api_key=GOOGLE_API_KEY)
        tasks = [
            indexing_pipeline.process_and_index_pdf_async(
                pdf_path, MODEL_FILE, ENCODER_FILE
            ) for pdf_path in saved_files
        ]
        await asyncio.gather(*tasks)
        return jsonify({
            "message": f"Successfully indexed {len(saved_files)} files.",
            "filenames": [os.path.basename(p) for p in saved_files]
        }), 200
    except Exception as e:
        return jsonify({"error": f"Indexing error: {e}"}), 500

@flask_app.route('/get_retrieved_sections', methods=['POST'])
@time_request
async def get_retrieved_sections():
    """
    FAST ENDPOINT: Performs a lightning-fast single query and rerank for the initial UI.
    """
    if not retrieval_handler:
        return jsonify({"error": "Backend handler not initialized."}), 500
    data = request.get_json()
    if not data or 'selection' not in data:
        return jsonify({"error": "Missing 'selection' key."}), 400
        
    user_selection = data['selection']
    print(f"\nReceived FAST retrieval request for: '{user_selection[:50]}...'")
    
    try:
        # Use the lightning-fast, single-query retrieval method
        reranked_sections = await retrieval_handler.retrieve_fast_async(user_selection)
        return jsonify({"retrieved_sections": reranked_sections})
    except Exception as e:
        return jsonify({"error": f"An error occurred: {e}"}), 500

@flask_app.route('/get_generated_insights', methods=['POST'])
@time_request
async def get_generated_insights():
    """
    DEEP ENDPOINT: Uses the more comprehensive multi-query method for the best AI context.
    """
    if not retrieval_handler:
        return jsonify({"error": "Backend handler not initialized."}), 500
    data = request.get_json()
    if not data or 'selection' not in data:
        return jsonify({"error": "Missing 'selection' key."}), 400
        
    user_selection = data['selection']
    print(f"\nReceived DEEP insight request for: '{user_selection[:50]}...'")
    
    try:
        llm_response = await retrieval_handler.generate_initial_insights_async(user_selection)
        return jsonify(llm_response)
    except Exception as e:
        return jsonify({"error": f"An error occurred: {e}"}), 500

@flask_app.route('/get_persona_podcast', methods=['POST'])
@time_request
async def get_persona_podcast():
    """
    ON-DEMAND ENDPOINT: Generates a new podcast script for a specific persona.
    """
    if not retrieval_handler:
        return jsonify({"error": "Backend handler not initialized."}), 500
    data = request.get_json()
    if not data or 'selection' not in data or 'persona' not in data:
        return jsonify({"error": "Missing 'selection' or 'persona' key."}), 400
        
    user_selection = data['selection']
    persona = data['persona']
    print(f"\nReceived on-demand podcast request for persona '{persona}'")
    
    try:
        llm_response = await retrieval_handler.generate_persona_podcast_async(user_selection, persona)
        return jsonify(llm_response)
    except Exception as e:
        return jsonify({"error": f"An error occurred: {e}"}), 500

# --- ASGI Wrapper ---
app = WsgiToAsgi(flask_app)
