
import os
import shutil
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

from backend.rag_pipeline import add_document_to_store, clear_vector_store, query_rag
import backend.rag_pipeline as rag_pipeline

app = FastAPI(title="AI Document QA Multi-Agent Backend")

# Configure CORS so our React frontend can query the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In development we allow all, or configure to React server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    session_id: str
    strategy: Optional[str] = "mmr" # similarity, mmr, multi_query

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Backend is running!"}

@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    Accepts file upload (PDF, CSV, JSON, DOCX), parses it using appropriate loader,
    splits it, and stores chunks in ChromaDB.
    """
    temp_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp_uploads")
    os.makedirs(temp_dir, exist_ok=True)
    
    file_path = os.path.join(temp_dir, file.filename)
    try:
        # Write upload to temporary file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Parse and load to vector store
        chunks_added = add_document_to_store(file_path, file.filename)
        
        return {
            "filename": file.filename,
            "status": "success",
            "message": f"Successfully indexed {chunks_added} chunks into vector store.",
            "chunks": chunks_added
        }
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")
    finally:
        # Cleanup temp file
        if os.path.exists(file_path):
            os.remove(file_path)

@app.post("/chat")
async def chat_with_agent(req: ChatRequest):
    """
    Stateless chat endpoint running the simplified single-turn RAG pipeline.
    """
    try:
        result = query_rag(req.message)
        
        # Deduplicate sources retrieved
        retrieved_metadata = result.get("retrieved_metadata", [])
        sources = list(set([m.get("source") for m in retrieved_metadata if m and "source" in m]))
        
        return {
            "response": result["response"],
            "destination": "retriever" if retrieved_metadata else "chat",
            "strategy": "similarity",
            "grounded_status": "grounded" if retrieved_metadata else "not_applicable",
            "sources": sources,
            "chunks_retrieved": len(result["retrieved_docs"])
        }
    except Exception as e:
        print(f"Error during RAG execution: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/files")
def list_uploaded_files():
    """
    Queries ChromaDB directly to fetch the unique document names that have been indexed.
    """
    try:
        data = rag_pipeline.vector_store.get()
        metadatas = data.get("metadatas", [])
        sources = set()
        for meta in metadatas:
            if meta and "source" in meta:
                sources.add(meta["source"])
        return {"files": list(sources)}
    except Exception as e:
        return {"files": [], "error": str(e)}

@app.post("/clear")
def clear_documents():
    """
    Deletes all document data from vector store.
    """
    success = clear_vector_store()
    if success:
        return {"status": "success", "message": "All documents cleared from vector store."}
    else:
        raise HTTPException(status_code=500, detail="Failed to clear vector store.")
