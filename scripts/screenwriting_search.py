import os
import sys
import google.generativeai as genai
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_chroma import Chroma
from dotenv import load_dotenv

load_dotenv()

CHROMA_PATH = "chroma_db"
COLLECTION_NAME = "screenwriting_principles"
API_KEY = os.getenv("GOOGLE_API_KEY")

genai.configure(api_key=API_KEY)


def get_screenwriting_principles(query: str, k: int = 5) -> str:
    """
    Retrieves top-k screenwriting principles from the Tyler Mowery ChromaDB collection
    relevant to the given query context.

    Returns formatted text with each principle labeled.
    """
    # Use same embedding model as ingestion
    embedding_model = "models/text-embedding-004"
    for model in genai.list_models():
        if 'embedContent' in model.supported_generation_methods:
            embedding_model = model.name
            break

    embeddings = GoogleGenerativeAIEmbeddings(model=embedding_model, google_api_key=API_KEY)

    try:
        db = Chroma(
            persist_directory=CHROMA_PATH,
            embedding_function=embeddings,
            collection_name=COLLECTION_NAME,
        )

        results = db.similarity_search(query, k=k)

        if not results:
            return ""

        parts = []
        for i, doc in enumerate(results):
            source = doc.metadata.get("source", "Unknown")
            group = doc.metadata.get("principle_group", "general")
            parts.append(
                f"--- PRINCIPLE {i + 1} [{group.upper()}] (from: {source}) ---\n{doc.page_content}"
            )

        return "\n\n".join(parts)

    except Exception as e:
        print(f"[WARN] screenwriting_search error: {e}")
        return ""


# Standalone test
if __name__ == "__main__":
    query = sys.argv[1] if len(sys.argv) > 1 else "thematic conflict structure"
    print(f"[TEST] Searching for: '{query}'\n")
    result = get_screenwriting_principles(query, k=5)
    if result:
        print(result)
    else:
        print("[WARN] No results found. Have you run ingest_tyler_mowery.py?")
