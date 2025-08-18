import os
import asyncio
from dotenv import load_dotenv

# Import the asynchronous pipeline
from indexing_pipeline import IndexingPipeline

# Load environment variables from a .env file
load_dotenv()

# --- Configuration ---
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
PDF_DIRECTORY = "pdfs"  # Directory containing all your "past knowledge" PDFs
MODEL_FILE = "models/heading_classifier_model.joblib"
ENCODER_FILE = "models/label_encoder.joblib"


async def run_batch_indexing():
    """
    Finds all PDFs in the specified directory and processes them concurrently.
    """
    if not GOOGLE_API_KEY:
        print("Error: GOOGLE_API_KEY not found. Please set it in your .env file.")
        return

    if not os.path.isdir(PDF_DIRECTORY):
        print(f"Error: PDF directory not found at '{PDF_DIRECTORY}'")
        return

    # Initialize the pipeline once
    pipeline = IndexingPipeline(google_api_key=GOOGLE_API_KEY)

    # Find all PDF files in the directory
    pdf_files = [os.path.join(PDF_DIRECTORY, f) for f in os.listdir(PDF_DIRECTORY) if f.lower().endswith('.pdf')]

    if not pdf_files:
        print(f"No PDF files found in '{PDF_DIRECTORY}'.")
        return

    print(f"Found {len(pdf_files)} PDFs to process: {[os.path.basename(p) for p in pdf_files]}")

    # Create a list of asynchronous tasks to run
    tasks = []
    for pdf_path in pdf_files:
        task = pipeline.process_and_index_pdf_async(
            pdf_path=pdf_path,
            model_path=MODEL_FILE,
            encoder_path=ENCODER_FILE
        )
        tasks.append(task)

    # Run all tasks concurrently
    print("\n--- Starting concurrent batch processing ---")
    await asyncio.gather(*tasks)
    print("\n--- Batch processing complete ---")


if __name__ == "__main__":
    # This command will start the asynchronous batch processing
    asyncio.run(run_batch_indexing())
