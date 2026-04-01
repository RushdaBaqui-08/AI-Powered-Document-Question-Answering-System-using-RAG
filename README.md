# 🚀 AI-Powered Document Question Answering System using RAG

## 📌 Overview

This project implements a **Retrieval-Augmented Generation (RAG)** pipeline to enable intelligent question answering over documents such as PDFs. It combines **semantic search** with **Large Language Models (LLMs)** to generate accurate, context-aware responses.

---

## ⚙️ Features

* 📄 Load and process multiple PDF documents
* ✂️ Text chunking for efficient retrieval
* 🔍 Semantic search using vector embeddings
* 🤖 Context-aware answer generation using LLMs
* ⚡ Scalable pipeline for document-based Q&A

---

## 🧠 Tech Stack

* **Language:** Python
* **Frameworks/Libraries:** LangChain, LangChain Community
* **Vector Store:** ChromaDB / Embeddings
* **Document Processing:** PyPDF, PyMuPDF
* **Text Splitting:** RecursiveCharacterTextSplitter

---

## 🔄 Pipeline Architecture

1. **Document Loading**

   * Load PDFs from local directory (`data/pdfs`)

2. **Text Chunking**

   * Split documents into smaller chunks for better retrieval

3. **Embedding Generation**

   * Convert text chunks into vector representations

4. **Vector Storage**

   * Store embeddings in vector database (ChromaDB)

5. **Retrieval + Generation (RAG)**

   * Retrieve relevant chunks
   * Pass context to LLM for answer generation

---

## 📂 Project Structure

```
├── data/
│   ├── pdfs/          # Input documents
│   └── Python.txt     # Sample text file
├── RAG_pipeline.ipynb
├── README.md
```

---

## ▶️ How to Run

### 1. Install Dependencies

```bash
pip install langchain langchain-core langchain-community pypdf pymupdf sentence-transformers chromadb
```

### 2. Add Documents

Place your PDF files inside:

```
data/pdfs/
```

### 3. Run Notebook

Open and execute:

```
RAG_pipeline.ipynb
```

---

## 💡 Key Highlights

* Efficient **multi-document retrieval system**
* Modular pipeline (loading → chunking → embedding → retrieval)
* Supports **scalable document processing**
* Can be extended into APIs using FastAPI

---

## 👩‍💻 Author

**Rushda Baqui**

* iOS Developer → Transitioning into AI & Data Science
* Interested in building intelligent, scalable systems

---

## ⭐ If you like this project

Give it a ⭐ on GitHub!

---
