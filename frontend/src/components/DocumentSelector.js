import React, { useState, useEffect } from 'react';
import { FileText, Search, Calendar, ChevronRight, ArrowLeft } from 'lucide-react';
import './DocumentSelector.css';

const DocumentSelector = ({ action, onBack, onSelect }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);

  useEffect(() => {
    fetchUserDocuments();
  }, []);

  const fetchUserDocuments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/uploads/user-notes', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      } else {
        console.error('Failed to fetch documents');
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionTitle = (actionType) => {
    const titles = {
      'create_quiz': 'Generate Quiz',
      'summarize': 'Create Summary',
      'create_mindmap': 'Create Mind Map',
      'create_flowchart': 'Create Flowchart'
    };
    return titles[actionType] || 'Select Document';
  };

  const getActionDescription = (actionType) => {
    const descriptions = {
      'create_quiz': 'Choose a document to generate practice questions from',
      'summarize': 'Select a document to create an AI-powered summary',
      'create_mindmap': 'Pick a document to generate a visual mind map',
      'create_flowchart': 'Select a document to create a process flowchart'
    };
    return descriptions[actionType] || 'Choose a document to process';
  };

  const getFileIcon = (fileName) => {
    const extension = fileName?.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return '📄';
      case 'jpg':
      case 'jpeg':
      case 'png':
        return '🖼️';
      default:
        return '📁';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredDocuments = documents.filter(doc =>
    doc.original_filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDocumentSelect = (document) => {
    setSelectedDoc(document);
  };

  const handleProceed = () => {
    if (selectedDoc && onSelect) {
      onSelect(selectedDoc, action);
    }
  };

  if (loading) {
    return (
      <div className="document-selector-container">
        <div className="selector-loading">
          <div className="loading-spinner"></div>
          <p>Loading your documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="document-selector-container">
      <div className="selector-header">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={20} />
          Back to Dashboard
        </button>
        
        <div className="selector-title">
          <h2>{getActionTitle(action)}</h2>
          <p>{getActionDescription(action)}</p>
        </div>

        <div className="search-container">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {filteredDocuments.length === 0 ? (
        <div className="no-documents">
          <FileText className="no-docs-icon" />
          <h3>No documents found</h3>
          <p>
            {searchTerm 
              ? `No documents match "${searchTerm}"`
              : "Upload some documents first to get started!"
            }
          </p>
        </div>
      ) : (
        <div className="documents-grid">
          {filteredDocuments.map((doc) => (
            <div 
              key={doc._id} 
              className={`document-card ${selectedDoc?._id === doc._id ? 'selected' : ''}`}
              onClick={() => handleDocumentSelect(doc)}
            >
              <div className="doc-icon-container">
                <span className="doc-icon">{getFileIcon(doc.original_filename)}</span>
              </div>
              
              <div className="doc-content">
                <h4 className="doc-title">{doc.original_filename}</h4>
                <div className="doc-meta">
                  <div className="meta-item">
                    <Calendar size={14} />
                    <span>{new Date(doc.upload_date).toLocaleDateString()}</span>
                  </div>
                  <div className="meta-item">
                    <FileText size={14} />
                    <span>{formatFileSize(doc.file_size)}</span>
                  </div>
                </div>
              </div>
              
              <div className="doc-select-indicator">
                {selectedDoc?._id === doc._id ? (
                  <div className="selected-checkmark">✓</div>
                ) : (
                  <ChevronRight size={20} className="select-arrow" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedDoc && (
        <div className="selection-footer">
          <div className="selected-doc-preview">
            <span className="selected-icon">{getFileIcon(selectedDoc.original_filename)}</span>
            <div className="selected-info">
              <span className="selected-name">{selectedDoc.original_filename}</span>
              <span className="selected-size">{formatFileSize(selectedDoc.file_size)}</span>
            </div>
          </div>
          
          <button className="proceed-button" onClick={handleProceed}>
            {action === 'create_quiz' && 'Generate Quiz'}
            {action === 'summarize' && 'Create Summary'}
            {action === 'create_mindmap' && 'Create Mind Map'}
            {action === 'create_flowchart' && 'Create Flowchart'}
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
};

export default DocumentSelector;