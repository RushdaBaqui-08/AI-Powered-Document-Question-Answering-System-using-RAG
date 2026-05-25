import os
import json
from typing import List
from dotenv import load_dotenv
from langchain_community.document_loaders import (
    PyPDFLoader,
    CSVLoader,
    Docx2txtLoader,
    JSONLoader,
)
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_core.documents import Document
from langchain_core.messages import HumanMessage
from langchain_core.prompts import ChatPromptTemplate

load_dotenv()

# Setup paths
PERSIST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "chroma_db")

# Embedding and LLM setup
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)

# Initialize ChromaDB Vector Store
vector_store = Chroma(
    collection_name="document_qa",
    embedding_function=embeddings,
    persist_directory=PERSIST_DIR
)

def load_and_split_document(file_path: str, file_name: str) -> List[Document]:
    """
    Load document using file extension-specific loaders and split into chunks.
    """
    ext = os.path.splitext(file_name.lower())[1]
    
    if ext == ".pdf":
        loader = PyPDFLoader(file_path)
    elif ext == ".csv":
        loader = CSVLoader(file_path)
    elif ext == ".docx":
        loader = Docx2txtLoader(file_path)
    elif ext == ".json":
        # Try JSONLoader (requires jq), otherwise fallback to standard JSON parser
        try:
            loader = JSONLoader(
                file_path=file_path,
                jq_schema=".[]",
                text_content=False
            )
            docs = loader.load()
        except Exception as e:
            print(f"JSONLoader (jq) failed or jq is not installed. Falling back to simple JSON parser: {e}")
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            # Create a document for each item if list of dicts, or whole json string
            docs = []
            if isinstance(data, list):
                for idx, item in enumerate(data):
                    docs.append(Document(
                        page_content=json.dumps(item, indent=2),
                        metadata={"source": file_name, "seq_num": idx}
                    ))
            else:
                docs.append(Document(
                    page_content=json.dumps(data, indent=2),
                    metadata={"source": file_name}
                ))
            text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
            return text_splitter.split_documents(docs)
    else:
        raise ValueError(f"Unsupported file format: {ext}")
        
    docs = loader.load()
    
    # Ensure source metadata is captured correctly
    for doc in docs:
        doc.metadata["source"] = file_name
            
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    return text_splitter.split_documents(docs)

def add_document_to_store(file_path: str, file_name: str) -> int:
    """
    Load, split, and add document chunks to the persistent ChromaDB collection.
    """
    chunks = load_and_split_document(file_path, file_name)
    if chunks:
        vector_store.add_documents(chunks)
    return len(chunks)

def clear_vector_store() -> bool:
    """
    Clear all collection data from the vector store.
    """
    try:
        global vector_store
        # Chroma delete collection
        vector_store.delete_collection()
        # Re-initialize collection
        vector_store = Chroma(
            collection_name="document_qa",
            embedding_function=embeddings,
            persist_directory=PERSIST_DIR
        )
        return True
    except Exception as e:
        print(f"Error clearing vector store: {e}")
        return False

def get_retriever(k: int = 6):
    """
    Build and return a simple Cosine Similarity retriever.
    """
    return vector_store.as_retriever(search_type="similarity", search_kwargs={"k": k})

# Initialize LLMs for Q&A (using Gemini, with Groq as fallback due to rate/quota limits)
gemini_llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash")
groq_llm = ChatGroq(model="llama-3.3-70b-versatile")

def invoke_llm(messages_or_prompt) -> str:
    try:
        response = gemini_llm.invoke(messages_or_prompt)
        return response.content
    except Exception as e:
        print(f"Gemini failed: {e}. Falling back to Groq Llama 3.3...")
        try:
            response = groq_llm.invoke(messages_or_prompt)
            return response.content
        except Exception as groq_err:
            print(f"Groq also failed: {groq_err}")
            raise e

def query_rag(message: str) -> dict:
    """
    Perform simple stateless RAG: retrieve chunks and query Gemini (or Groq fallback).
    """
    retriever = get_retriever(k=6)
    results = retriever.invoke(message)
    
    retrieved_docs = [doc.page_content for doc in results]
    retrieved_metadata = [doc.metadata for doc in results]
    
    if not retrieved_docs:
        ans_content = invoke_llm([
            HumanMessage(content=f"No document context found. Answer this as best as you can: {message}")
        ])
        return {
            "response": ans_content,
            "retrieved_docs": [],
            "retrieved_metadata": []
        }
        
    context_str = "\n\n---\n\n".join(retrieved_docs)
    prompt = ChatPromptTemplate.from_messages([
        ("system",
         "You are an expert Q&A assistant. Use ONLY the following document context to answer the user query.\n"
         "If the answer cannot be found in the context, state that you do not know. Do not hallucinate.\n\n"
         "Document Context:\n{context}"
        ),
        ("human", "{query}")
    ])
    
    ans_content = invoke_llm(prompt.format(context=context_str, query=message))
    return {
        "response": ans_content,
        "retrieved_docs": retrieved_docs,
        "retrieved_metadata": retrieved_metadata
    }
