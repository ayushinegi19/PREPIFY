// UploadNotes.js - COMPLETE FIXED - PERSISTENT FILE SELECTION
import React, { useState } from 'react';
import { Upload, CheckCircle, Loader2 } from 'lucide-react';
import './UploadNotes.css';

const UploadNotes = ({ onActionComplete }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadedDocument, setUploadedDocument] = useState(null);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadSuccess(false);
      setError(null);
      setUploadedDocument(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a file first!');
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/uploads/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setUploadSuccess(true);
        setUploadedDocument(data);
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch (err) {
      setError('An error occurred during upload');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleAction = async (actionId) => {
    if (!uploadedDocument || !uploadedDocument.document_id) {
      alert('No document uploaded yet!');
      return;
    }

    const documentId = uploadedDocument.document_id;
    
    setActionLoading({ ...actionLoading, [actionId]: true });
    
    // Show processing toast
    if (onActionComplete) {
      onActionComplete({
        type: actionId === 'summarize' ? 'summary' : 
              actionId === 'create_quiz' ? 'quiz' :
              actionId === 'create_mindmap' ? 'mindmap' : 'flowchart',
        status: 'processing'
      });
    }
    
    try {
      const token = localStorage.getItem('token');
      
      const res = await fetch(`/api/uploads/action/${documentId}/${actionId}`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Action failed with status: ${res.status}`);
      }

      const data = await res.json();
      
      // Get content ID based on action type
      let contentId = null;
      if (actionId === 'summarize') contentId = data.summary_id;
      else if (actionId === 'create_quiz') contentId = data.quiz_id;
      else if (actionId === 'create_mindmap' || actionId === 'create_flowchart') contentId = data.mindmap_id;
      
      // Show completed toast
      if (onActionComplete) {
        onActionComplete({
          type: actionId === 'summarize' ? 'summary' : 
                actionId === 'create_quiz' ? 'quiz' :
                actionId === 'create_mindmap' ? 'mindmap' : 'flowchart',
          contentId: contentId,
          status: 'completed'
        });
      }
      
      // Keep file selected for more actions - DON'T RESET
      
    } catch (err) {
      console.error("Action error:", err);
      alert(`Failed to perform action: ${err.message}`);
      
      // Show error toast
      if (onActionComplete) {
        onActionComplete({
          type: actionId === 'summarize' ? 'summary' : 
                actionId === 'create_quiz' ? 'quiz' :
                actionId === 'create_mindmap' ? 'mindmap' : 'flowchart',
          status: 'error'
        });
      }
    } finally {
      setActionLoading({ ...actionLoading, [actionId]: false });
    }
  };

  const handleNewUpload = () => {
    setFile(null);
    setUploadSuccess(false);
    setUploadedDocument(null);
    setError(null);
    setActionLoading({});
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = () => {
    if (!file) return '📄';
    const extension = file.name.split('.').pop().toLowerCase();
    switch (extension) {
      case 'pdf': return '📄';
      case 'jpg':
      case 'jpeg':
      case 'png': return '🖼️';
      default: return '📁';
    }
  };

  return (
    <div className="upload-notes-container">
      <h3>Upload Notes</h3>
      <p>Upload your study materials in PDF or image format (JPG, PNG) for AI processing</p>

      <div className="upload-controls">
        <div className="file-input-wrapper">
          <input
            type="file"
            id="file-input"
            className="file-input"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
          />
          <label htmlFor="file-input" className="file-input-label">
            {file ? (
              <div className="file-selected">
                <span className="file-icon">{getFileIcon()}</span>
                <div className="file-info">
                  <div className="file-name">{file.name}</div>
                  <div className="file-size">{formatFileSize(file.size)}</div>
                </div>
              </div>
            ) : (
              <div className="file-placeholder">
                <Upload className="upload-icon" size={32} />
                <div>Click to select a file or drag and drop</div>
                <div className="file-types">PDF, JPG, PNG (Max 16MB)</div>
              </div>
            )}
          </label>
        </div>

        <button
          className="upload-button"
          onClick={handleUpload}
          disabled={!file || uploading}
        >
          {uploading ? (
            <div className="loading-content">
              <div className="spinner"></div>
              <span>Uploading...</span>
            </div>
          ) : (
            <div className="button-content">
              <Upload size={20} />
              <span>Upload File</span>
            </div>
          )}
        </button>
      </div>

      {uploadSuccess && uploadedDocument && (
        <div className="upload-success">
          <div className="success-header">
            <CheckCircle className="success-icon" size={32} />
            <div>
              <h4>Upload Successful!</h4>
              <p>Your file has been uploaded and processed. Choose multiple actions below.</p>
            </div>
          </div>

          <div className="file-summary">
            <div className="file-details">
              <span className="file-icon-large">{getFileIcon()}</span>
              <div className="file-meta">
                <h5>{uploadedDocument.file_info.original_filename}</h5>
                <div className="file-stats">
                  <span>📊 {uploadedDocument.file_info.size_readable}</span>
                  <span>•</span>
                  <span>📝 {uploadedDocument.text_length} characters extracted</span>
                </div>
              </div>
            </div>
          </div>

          <div className="actions-section">
            <h4>What would you like to do?</h4>
            <p>Select any or all AI-powered actions for this document</p>

            <div className="actions-grid">
              <button
                className={`action-card ${actionLoading['summarize'] ? 'loading' : ''}`}
                onClick={() => handleAction('summarize')}
                disabled={actionLoading['summarize']}
              >
                <div className="action-icon">
                  {actionLoading['summarize'] ? (
                    <Loader2 className="action-spinner" size={32} />
                  ) : (
                    <span className="icon-emoji">📄</span>
                  )}
                </div>
                <div className="action-content">
                  <h5>Summarize</h5>
                  <p>AI-powered summaries</p>
                </div>
                {actionLoading['summarize'] && (
                  <span className="action-loading-text">Processing...</span>
                )}
              </button>

              <button
                className={`action-card ${actionLoading['create_quiz'] ? 'loading' : ''}`}
                onClick={() => handleAction('create_quiz')}
                disabled={actionLoading['create_quiz']}
              >
                <div className="action-icon">
                  {actionLoading['create_quiz'] ? (
                    <Loader2 className="action-spinner" size={32} />
                  ) : (
                    <span className="icon-emoji">❓</span>
                  )}
                </div>
                <div className="action-content">
                  <h5>Create Quiz</h5>
                  <p>Generate practice questions</p>
                </div>
                {actionLoading['create_quiz'] && (
                  <span className="action-loading-text">Processing...</span>
                )}
              </button>

              <button
                className={`action-card ${actionLoading['create_mindmap'] ? 'loading' : ''}`}
                onClick={() => handleAction('create_mindmap')}
                disabled={actionLoading['create_mindmap']}
              >
                <div className="action-icon">
                  {actionLoading['create_mindmap'] ? (
                    <Loader2 className="action-spinner" size={32} />
                  ) : (
                    <span className="icon-emoji">🧠</span>
                  )}
                </div>
                <div className="action-content">
                  <h5>Create Mind Map</h5>
                  <p>Visual knowledge maps</p>
                </div>
                {actionLoading['create_mindmap'] && (
                  <span className="action-loading-text">Processing...</span>
                )}
              </button>

              <button
                className={`action-card ${actionLoading['create_flowchart'] ? 'loading' : ''}`}
                onClick={() => handleAction('create_flowchart')}
                disabled={actionLoading['create_flowchart']}
              >
                <div className="action-icon">
                  {actionLoading['create_flowchart'] ? (
                    <Loader2 className="action-spinner" size={32} />
                  ) : (
                    <span className="icon-emoji">📊</span>
                  )}
                </div>
                <div className="action-content">
                  <h5>Create Flowchart</h5>
                  <p>Process flowcharts</p>
                </div>
                {actionLoading['create_flowchart'] && (
                  <span className="action-loading-text">Processing...</span>
                )}
              </button>
            </div>

            <button className="new-upload-btn" onClick={handleNewUpload}>
              Upload Another File
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="upload-error">
          <div className="error-content">
            <h4>Upload Failed</h4>
            <p className="error-text">{error}</p>
            <button className="retry-button" onClick={() => setError(null)}>
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadNotes;