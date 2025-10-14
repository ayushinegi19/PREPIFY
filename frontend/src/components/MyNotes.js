import React, { useState, useEffect } from 'react';
import { FileText, Download, Trash2, Calendar, Search, Filter } from 'lucide-react';
import './MyNotes.css';

const MyNotes = () => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date');

  useEffect(() => {
    fetchUserNotes();
  }, []);

  const fetchUserNotes = async () => {
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
        setNotes(data.documents || []);
      } else {
        console.error('Failed to fetch notes');
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (documentId) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/uploads/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setNotes(notes.filter(note => note._id !== documentId));
        alert('Note deleted successfully!');
      } else {
        alert('Failed to delete note');
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Error deleting note');
    }
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

  const filteredNotes = notes.filter(note =>
    note.original_filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedNotes = [...filteredNotes].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.original_filename.localeCompare(b.original_filename);
      case 'size':
        return b.file_size - a.file_size;
      case 'date':
      default:
        return new Date(b.upload_date) - new Date(a.upload_date);
    }
  });

  if (loading) {
    return (
      <div className="my-notes-container">
        <div className="notes-loading">
          <div className="loading-spinner"></div>
          <p>Loading your notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-notes-container">
      <div className="notes-header">
        <div className="notes-title">
          <h3>My Notes</h3>
          <p>Manage and organize all your uploaded study materials</p>
        </div>
        
        <div className="notes-controls">
          <div className="search-box">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="sort-dropdown">
            <Filter className="filter-icon" />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="date">Sort by Date</option>
              <option value="name">Sort by Name</option>
              <option value="size">Sort by Size</option>
            </select>
          </div>
        </div>
      </div>

      {sortedNotes.length === 0 ? (
        <div className="no-notes">
          <FileText className="no-notes-icon" />
          <h4>No notes found</h4>
          <p>
            {searchTerm 
              ? `No notes match "${searchTerm}"`
              : "Upload your first document to get started!"
            }
          </p>
        </div>
      ) : (
        <div className="notes-grid">
          {sortedNotes.map((note) => (
            <div key={note._id} className="note-card">
              <div className="note-header">
                <div className="file-icon-container">
                  <span className="file-icon-large">{getFileIcon(note.original_filename)}</span>
                </div>
                <div className="note-actions">
                  <button 
                    className="action-btn delete-btn"
                    onClick={() => handleDelete(note._id)}
                    title="Delete note"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="note-content">
                <h4 className="note-title">{note.original_filename}</h4>
                <div className="note-details">
                  <div className="detail-row">
                    <Calendar size={14} />
                    <span>{new Date(note.upload_date).toLocaleDateString()}</span>
                  </div>
                  <div className="detail-row">
                    <FileText size={14} />
                    <span>{formatFileSize(note.file_size)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="file-type-badge">
                      {note.file_type?.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="note-footer">
                <button className="primary-btn">
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="notes-stats">
        <div className="stat-item">
          <span className="stat-number">{notes.length}</span>
          <span className="stat-label">Total Notes</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">
            {formatFileSize(notes.reduce((total, note) => total + note.file_size, 0))}
          </span>
          <span className="stat-label">Total Size</span>
        </div>
      </div>
    </div>
  );
};

export default MyNotes;