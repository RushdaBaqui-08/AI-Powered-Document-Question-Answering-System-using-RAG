import React, { useState, useEffect, useRef } from "react";

const BACKEND_URL = "http://localhost:8000";

function App() {
  const [files, setFiles] = useState([]);
  const [messages, setMessages] = useState([
    {
      sender: "agent",
      text: "Hello! Upload some documents (PDF, CSV, JSON, or DOCX) and start chatting. I will coordinate multiple agents to retrieve, summarize, and critique the responses.",
      destination: "chat",
      strategy: "none",
      grounded_status: "not_applicable"
    }
  ]);
  const [input, setInput] = useState("");
  const [strategy, setStrategy] = useState("mmr");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [sessionId, setSessionId] = useState("");
  
  const messagesEndRef = useRef(null);

  // Initialize or fetch session ID from localStorage
  useEffect(() => {
    let savedSession = localStorage.getItem("rag_session_id");
    if (!savedSession) {
      savedSession = "session_" + Math.random().toString(36).substring(2, 9);
      localStorage.setItem("rag_session_id", savedSession);
    }
    setSessionId(savedSession);
    fetchUploadedFiles();
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const fetchUploadedFiles = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/files`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      }
    } catch (err) {
      console.error("Error fetching files list:", err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setUploadStatus(`Uploading ${file.name}...`);
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${BACKEND_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setUploadStatus(`Successfully indexed file!`);
        fetchUploadedFiles();
      } else {
        const errData = await res.json();
        setUploadStatus(`Upload failed: ${errData.detail || "Server error"}`);
      }
    } catch (err) {
      setUploadStatus("Upload failed: Connection error");
    } finally {
      setUploading(false);
      setTimeout(() => setUploadStatus(""), 4000);
    }
  };

  const handleClearFiles = async () => {
    if (!window.confirm("Are you sure you want to delete all indexed files?")) return;
    
    try {
      const res = await fetch(`${BACKEND_URL}/clear`, { method: "POST" });
      if (res.ok) {
        setFiles([]);
        setMessages(prev => [
          ...prev,
          {
            sender: "agent",
            text: "All files have been cleared from the database.",
            destination: "chat",
            strategy: "none",
            grounded_status: "not_applicable"
          }
        ]);
      }
    } catch (err) {
      alert("Failed to clear files from database.");
    }
  };

  const handleNewSession = () => {
    const newSession = "session_" + Math.random().toString(36).substring(2, 9);
    localStorage.setItem("rag_session_id", newSession);
    setSessionId(newSession);
    setMessages([
      {
        sender: "agent",
        text: "New chat session started. Stored context cleared from current thread.",
        destination: "chat",
        strategy: "none",
        grounded_status: "not_applicable"
      }
    ]);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput("");
    
    // Add user message immediately
    setMessages(prev => [...prev, { sender: "user", text: userText }]);
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          session_id: sessionId,
          strategy: strategy
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [
          ...prev,
          {
            sender: "agent",
            text: data.response,
            destination: data.destination,
            strategy: data.strategy,
            grounded_status: data.grounded_status,
            sources: data.sources
          }
        ]);
      } else {
        const errData = await res.json();
        setMessages(prev => [
          ...prev,
          {
            sender: "agent",
            text: `Error: ${errData.detail || "Failed to communicate with agent."}`,
            destination: "chat",
            strategy: "none",
            grounded_status: "not_applicable"
          }
        ]);
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          sender: "agent",
          text: "Error: Could not connect to the backend server.",
          destination: "chat",
          strategy: "none",
          grounded_status: "not_applicable"
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getFileTagClass = (filename) => {
    const ext = filename.split(".").pop().toLowerCase();
    return `doc-tag tag-${ext}`;
  };

  const getFileExtension = (filename) => {
    return filename.split(".").pop().toLowerCase();
  };

  return (
    <div className="app-container unified-layout">
      {/* Top Header */}
      <header className="app-header">
        <div className="logo-section">
          <div className="logo-icon">QA</div>
          <div className="logo-text">Document RAG</div>
        </div>
        <div className="header-controls">
          {files.length > 0 && (
            <div className="strategy-selector">
              <span>Retrieval Strategy:</span>
              <select 
                value={strategy} 
                onChange={(e) => setStrategy(e.target.value)}
                className="strategy-select"
              >
                <option value="similarity">Cosine Similarity</option>
                <option value="mmr">Max Marginal Relevance (MMR)</option>
                <option value="multi_query">Multi-Query (LLM Expansion)</option>
              </select>
            </div>
          )}
          <button className="new-session-btn" onClick={handleNewSession}>
            🔄 New Conversation
          </button>
          <button className="clear-btn" onClick={handleClearFiles}>
            🗑️ Clear Database
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="main-workspace">
        {/* State A: No files uploaded yet */}
        {files.length === 0 && (
          <div className="landing-container">
            <div className="powered-badge">
              <span>⚡ Powered by Gemini & Groq fallback</span>
            </div>
            
            <h1 className="landing-title">
              What will you <span className="highlight-blue">ask</span> today?
            </h1>
            <p className="landing-subtitle">
              Upload a document and chat with AI to get answers from your data.
            </p>

            <label className="landing-upload-card">
              {uploading ? (
                <>
                  <div className="spinner"></div>
                  <p className="main-text">Uploading and indexing document...</p>
                  <p className="sub-text">We are parsing, splitting, and vectorizing chunks into ChromaDB.</p>
                </>
              ) : (
                <>
                  <svg width="40" height="48" viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: '8px' }}>
                    <path d="M26 0H4C1.8 0 0 1.8 0 4V44C0 46.2 1.8 48 4 48H36C38.2 48 40 46.2 40 44V14L26 0ZM36 44H4V4H24V16H36V44Z" fill="#9ca3af"/>
                  </svg>
                  <p className="main-text">Click to upload or drag and drop</p>
                  <p className="sub-text">PDF, CSV, JSON, DOCX (Max 16MB)</p>
                </>
              )}
              <input 
                type="file" 
                className="file-input" 
                onChange={handleFileUpload} 
                accept=".pdf,.csv,.json,.docx"
                disabled={uploading}
              />
            </label>

            {uploadStatus && (
              <p style={{ fontSize: '0.9rem', color: 'var(--accent-cyan)', marginTop: '8px', marginBottom: '16px', fontWeight: '500' }}>
                {uploadStatus}
              </p>
            )}

            <div className="landing-input-container" style={{ opacity: 0.5 }}>
              <input 
                type="text" 
                placeholder="Upload a document above to enable asking questions..." 
                className="landing-input" 
                disabled 
              />
              <button className="landing-ask-btn" disabled>
                Ask <span style={{ fontSize: '0.8rem', marginLeft: '2px' }}>▶</span>
              </button>
            </div>
          </div>
        )}

        {/* State B: Files uploaded, but chat hasn't started yet */}
        {files.length > 0 && messages.length <= 1 && (
          <div className="landing-container">
            <div className="powered-badge">
              <span>⚡ Powered by Gemini & Groq fallback</span>
            </div>
            
            <h1 className="landing-title">
              What will you <span className="highlight-blue">ask</span> today?
            </h1>
            <p className="landing-subtitle">
              Your documents are ready. Ask any question below.
            </p>

            {/* List of uploaded documents */}
            <div className="files-list-box">
              <h3 className="doc-section-title">Indexed Documents ({files.length})</h3>
              <div className="files-chips-grid">
                {files.map((file, idx) => (
                  <div key={idx} className="file-chip">
                    <span className={`doc-tag tag-${getFileExtension(file)}`}>
                      {getFileExtension(file)}
                    </span>
                    <span className="file-chip-name" title={file}>{file}</span>
                  </div>
                ))}
                
                <label className="upload-more-chip-inline">
                  <span>➕ Add Document</span>
                  <input 
                    type="file" 
                    className="file-input" 
                    onChange={handleFileUpload} 
                    accept=".pdf,.csv,.json,.docx"
                    disabled={uploading}
                  />
                </label>
              </div>
            </div>

            {uploadStatus && (
              <p style={{ fontSize: '0.9rem', color: 'var(--accent-cyan)', marginTop: '8px', marginBottom: '16px', fontWeight: '500' }}>
                {uploadStatus}
              </p>
            )}

            {/* Enabled Chat input on the landing screen */}
            <form onSubmit={handleSendMessage} className="landing-input-container">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question about your uploaded document..." 
                className="landing-input" 
                disabled={loading}
              />
              <button type="submit" className="landing-ask-btn" disabled={!input.trim() || loading}>
                {loading ? "..." : "Ask"} <span style={{ fontSize: '0.8rem', marginLeft: '2px' }}>▶</span>
              </button>
            </form>
          </div>
        )}

        {/* State C: Active conversation feed */}
        {files.length > 0 && messages.length > 1 && (
          <div className="chat-container">
            {/* Horizontal Files bar */}
            <div className="files-bar">
              <div className="files-chips-container">
                <span className="files-bar-title">Indexed Files:</span>
                {files.map((file, idx) => (
                  <div key={idx} className="file-chip">
                    <span className={`doc-tag tag-${getFileExtension(file)}`}>
                      {getFileExtension(file)}
                    </span>
                    <span className="file-chip-name" title={file}>{file}</span>
                  </div>
                ))}
              </div>
              <label className="upload-more-chip">
                <span>➕ Add Document</span>
                <input 
                  type="file" 
                  className="file-input" 
                  onChange={handleFileUpload} 
                  accept=".pdf,.csv,.json,.docx"
                  disabled={uploading}
                />
              </label>
              {uploading && <span className="upload-more-loading">Uploading...</span>}
            </div>

            {/* Chat Messages stream */}
            <div className="chat-messages">
              {messages.map((msg, idx) => (
                <div key={idx} className={`message-bubble message-${msg.sender}`}>
                  <p>{msg.text}</p>
                  
                  {/* Timeline status for Agent replies */}
                  {msg.sender === "agent" && (
                    <div className="agent-status-timeline">
                      <div className="status-step completed">
                        <span className="status-indicator"></span>
                        <span>Source: {msg.destination}</span>
                      </div>
                      
                      {msg.sources && msg.sources.length > 0 && (
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Sources:</span>
                          {msg.sources.map((s, sidx) => (
                            <span key={sidx} style={{ color: 'var(--accent-cyan)', fontWeight: '500' }}>
                              [{s}]
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Loading bubble */}
              {loading && (
                <div className="message-bubble message-agent">
                  <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>Retrieving context and generating answer...</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input area */}
            <form onSubmit={handleSendMessage} className="chat-input-bar">
              <div className="input-container">
                <input 
                  type="text" 
                  value={input} 
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question about the uploaded documents..."
                  className="chat-input"
                  disabled={loading}
                />
                <button type="submit" className="send-btn" disabled={!input.trim() || loading}>
                  Send
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
