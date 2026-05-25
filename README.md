# AI-Powered Document Question Answering System using RAG

A premium, simplified, stateless Retrieval-Augmented Generation (RAG) system that allows you to upload documents (PDF, CSV, JSON, DOCX), index them into a local Chroma vector store, and ask questions through a clean, unified single-screen web interface.

---

## ⚡ Core Features

- **Stateless Q&A Pipeline:** Simplified single-turn retrieval and generation (removes unnecessary session/agent-routing/critic overhead).
- **Dual LLM Fail-Safe Fallback:** 
  - Queries **Gemini 1.5 Flash** as the primary Q&A engine.
  - Automatically falls back to **Groq (Llama 3.3 70B)** if Gemini hits free-tier rate limits (`429 Resource Exhausted`) or version mismatches.
- **Single-Screen Unified UI:** Clean and responsive single-viewport design. Upload your files and chat on the same workspace layout (no abrupt sidebar transitions).
- **ChromaDB Integration:** Indexes documents locally and uses HuggingFace embeddings (`all-MiniLM-L6-v2`) for semantic search.

---

## 🛠️ Tech Stack

- **Frontend:** React, Vite, Vanilla CSS (harmonized palettes, glassmorphism, micro-animations).
- **Backend:** FastAPI, Python, Uvicorn, Pydantic.
- **AI/RAG:** LangChain, ChromaDB, Google GenAI SDK, Groq SDK.

---

## 🚀 Setup & Execution

### 1. Prerequisites & Environment Setup
Clone the repository and create a `.env` file in the root directory:

```bash
# Clone the repository
git clone https://github.com/RushdaBaqui-08/AI-Powered-Document-Question-Answering-System-using-RAG.git
cd AI-Powered-Document-Question-Answering-System-using-RAG
```

Create a `.env` file in the root containing your API keys:
```env
GOOGLE_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
```

### 2. Running the Backend Server
Initialize the Python virtual environment, install dependencies, and run the FastAPI server:

```bash
# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Run backend on port 8000
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

The backend API will be available at `http://127.0.0.1:8000`. You can visit `/health` to verify it's running.

### 3. Running the Frontend App
Open a separate terminal, navigate to the `frontend` directory, install node modules, and start the development server:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser to start querying your documents!

---

## 📂 Project Structure

```
.
├── backend/
│   ├── main.py             # FastAPI App & Endpoints
│   ├── rag_pipeline.py     # Simple similarity-based RAG pipeline & LLM fallback logic
│   └── requirements.txt    # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Unified layout and state transitions
│   │   ├── index.css       # Premium custom styling system
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
└── README.md               # Main instructions
```
