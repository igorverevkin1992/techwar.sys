import os
import glob
from dotenv import load_dotenv
from langchain_community.document_loaders import Docx2txtLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_chroma import Chroma
import google.generativeai as genai

# 1. Настройка
load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

SOURCE_FOLDER = "Tyler Mowery"
CHROMA_PATH = "chroma_db"
COLLECTION_NAME = "screenwriting_principles"

if not api_key:
    raise ValueError("[ERROR] GOOGLE_API_KEY not found in .env file")

# Классификация по группе на основе имени файла
PRINCIPLE_GROUPS = {
    "conflict": ["conflict", "antagonist", "opposition", "tension", "stakes", "obstacle"],
    "character": ["character", "protagonist", "hero", "want", "need", "belief", "arc", "flaw", "wound"],
    "theme": ["theme", "thesis", "meaning", "truth", "argument", "message", "philosophical"],
    "scene": ["scene", "entry", "exit", "dialogue", "action", "beat", "moment", "setup", "payoff", "cliffhanger"],
    "structure": ["structure", "act", "plot", "story", "momentum", "midpoint", "reversal", "twist", "turn"],
}

def classify_file(filename: str) -> str:
    lower = filename.lower()
    for group, keywords in PRINCIPLE_GROUPS.items():
        if any(kw in lower for kw in keywords):
            return group
    return "general"

def get_available_embedding_model():
    print("[INFO] Searching for available embedding models...")
    try:
        genai.configure(api_key=api_key)
        for model in genai.list_models():
            if 'embedContent' in model.supported_generation_methods:
                print(f"[OK] Found model: {model.name}")
                return model.name
    except Exception as e:
        print(f"[WARN] Error while searching for models: {e}")
        return "models/text-embedding-004"
    return "models/text-embedding-004"

def ingest_tyler_mowery():
    model_name = get_available_embedding_model()
    if not model_name:
        print("[ERROR] No embedding models found! Check your API key.")
        return

    if not os.path.exists(SOURCE_FOLDER):
        print(f"[ERROR] Folder not found: {SOURCE_FOLDER}")
        return

    docx_files = glob.glob(os.path.join(SOURCE_FOLDER, "*.docx"))
    if not docx_files:
        print(f"[ERROR] No .docx files found in {SOURCE_FOLDER}")
        return

    print(f"[INFO] Found {len(docx_files)} transcripts in '{SOURCE_FOLDER}'")

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=150,
        separators=["\n\n", "\n", ". ", " ", ""]
    )

    all_chunks = []
    for filepath in sorted(docx_files):
        filename = os.path.basename(filepath)
        principle_group = classify_file(filename)
        print(f"  [LOAD] {filename} → group: {principle_group}")

        try:
            loader = Docx2txtLoader(filepath)
            documents = loader.load()
            if not documents:
                print(f"  [WARN] Empty file: {filename}")
                continue

            # Add source metadata to each document
            for doc in documents:
                doc.metadata["source"] = filename
                doc.metadata["principle_group"] = principle_group

            chunks = text_splitter.split_documents(documents)

            # Propagate metadata to chunks
            for chunk in chunks:
                chunk.metadata["source"] = filename
                chunk.metadata["principle_group"] = principle_group

            all_chunks.extend(chunks)
            print(f"  [OK] {len(chunks)} chunks from '{filename}'")

        except Exception as e:
            print(f"  [ERROR] Failed to read {filename}: {e}")

    if not all_chunks:
        print("[ERROR] No chunks created. Check your files.")
        return

    print(f"\n[INFO] Total: {len(all_chunks)} chunks from {len(docx_files)} files")
    print(f"[INFO] Creating ChromaDB collection '{COLLECTION_NAME}'...")

    try:
        embeddings = GoogleGenerativeAIEmbeddings(model=model_name, google_api_key=api_key)
        Chroma.from_documents(
            documents=all_chunks,
            embedding=embeddings,
            persist_directory=CHROMA_PATH,
            collection_name=COLLECTION_NAME,
        )
        print(f"[SUCCESS] Tyler Mowery principles saved to '{CHROMA_PATH}' (collection: '{COLLECTION_NAME}')")
    except Exception as e:
        print(f"[ERROR] Failed to create database: {e}")

if __name__ == "__main__":
    ingest_tyler_mowery()
