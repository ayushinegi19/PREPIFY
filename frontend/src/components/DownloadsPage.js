import React, { useState, useEffect } from 'react';
import { FileText, Target, GitBranch, Calendar, Eye, Download, Trash2 } from 'lucide-react';
import './DownloadsPage.css';

const DownloadsPage = ({ onViewSummary, onViewMindmap }) => {
  const [summaries, setSummaries] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [mindmaps, setMindmaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summaries');

  useEffect(() => {
    fetchAllContent();
  }, []);

  const fetchAllContent = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Fetch summaries
      const summariesRes = await fetch('/api/uploads/summaries', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (summariesRes.ok) {
        const data = await summariesRes.json();
        setSummaries(data.summaries || []);
      }

      // Fetch quizzes
      const quizzesRes = await fetch('/api/uploads/quizzes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (quizzesRes.ok) {
        const data = await quizzesRes.json();
        setQuizzes(data.quizzes || []);
      }

      // Fetch mindmaps
      const mindmapsRes = await fetch('/api/uploads/mindmaps', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (mindmapsRes.ok) {
        const data = await mindmapsRes.json();
        setMindmaps(data.mindmaps || []);
      }

    } catch (error) {
      console.error('Error fetching content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/uploads/${type}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchAllContent();
        alert(`${type} deleted successfully!`);
      } else {
        alert(`Failed to delete ${type}`);
      }
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Error deleting content');
    }
  };

  const handleDownloadSummary = (summary) => {
    const element = document.createElement('a');
    const file = new Blob([summary.summary], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `summary_${summary.document_name}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const tabs = [
    { id: 'summaries', label: 'Summaries', icon: FileText, count: summaries.length },
    { id: 'quizzes', label: 'Quizzes', icon: Target, count: quizzes.length },
    { id: 'mindmaps', label: 'Mind Maps', icon: GitBranch, count: mindmaps.length }
  ];

  if (loading) {
    return (
      <div className="downloads-page-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading your content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="downloads-page-container">
      <div className="downloads-header">
        <div className="header-info">
          <h2>My Downloads</h2>
          <p>Access all your generated content in one place</p>
        </div>
      </div>

      <div className="downloads-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={20} />
            <span>{tab.label}</span>
            <span className="tab-count">{tab.count}</span>
          </button>
        ))}
      </div>

      <div className="downloads-content">
        {activeTab === 'summaries' && (
          <div className="content-grid">
            {summaries.length === 0 ? (
              <div className="empty-state">
                <FileText size={64} />
                <h3>No summaries yet</h3>
                <p>Create your first summary from uploaded notes</p>
              </div>
            ) : (
              summaries.map(summary => (
                <div key={summary._id} className="content-card summary-card">
                  <div className="card-header">
                    <div className="card-icon">
                      <FileText size={24} />
                    </div>
                    <div className="card-actions">
                      <button
                        className="action-btn"
                        onClick={() => onViewSummary && onViewSummary(summary._id)}
                        title="View"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        className="action-btn"
                        onClick={() => handleDownloadSummary(summary)}
                        title="Download"
                      >
                        <Download size={16} />
                      </button>
                      <button
                        className="action-btn delete"
                        onClick={() => handleDelete('summary', summary._id)}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="card-content">
                    <h4>{summary.document_name}</h4>
                    <div className="card-meta">
                      <div className="meta-item">
                        <Calendar size={14} />
                        <span>{new Date(summary.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="meta-item">
                        <span className="type-badge">{summary.summary_type}</span>
                      </div>
                    </div>
                    <p className="card-description">
                      {summary.summary.substring(0, 100)}...
                    </p>
                  </div>

                  <div className="card-footer">
                    <div className="stat">
                      <span className="stat-label">Compression</span>
                      <span className="stat-value">
                        {Math.round((1 - summary.summary_length / summary.original_length) * 100)}%
                      </span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Key Points</span>
                      <span className="stat-value">{summary.key_points?.length || 0}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'quizzes' && (
          <div className="content-grid">
            {quizzes.length === 0 ? (
              <div className="empty-state">
                <Target size={64} />
                <h3>No quizzes yet</h3>
                <p>Generate your first quiz from uploaded notes</p>
              </div>
            ) : (
              quizzes.map(quiz => (
                <div key={quiz._id} className="content-card quiz-card">
                  <div className="card-header">
                    <div className="card-icon">
                      <Target size={24} />
                    </div>
                    <div className="card-actions">
                      <button
                        className="action-btn delete"
                        onClick={() => handleDelete('quiz', quiz._id)}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="card-content">
                    <h4>{quiz.document_name}</h4>
                    <div className="card-meta">
                      <div className="meta-item">
                        <Calendar size={14} />
                        <span>{new Date(quiz.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="meta-item">
                        <span className="type-badge">{quiz.difficulty}</span>
                      </div>
                    </div>
                  </div>

                  <div className="card-footer">
                    <div className="stat">
                      <span className="stat-label">Questions</span>
                      <span className="stat-value">{quiz.total_questions}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Best Score</span>
                      <span className="stat-value">
                        {quiz.best_score !== null ? `${quiz.best_score}%` : 'N/A'}
                      </span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Attempts</span>
                      <span className="stat-value">{quiz.attempts?.length || 0}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'mindmaps' && (
          <div className="content-grid">
            {mindmaps.length === 0 ? (
              <div className="empty-state">
                <GitBranch size={64} />
                <h3>No mind maps yet</h3>
                <p>Create your first mind map from uploaded notes</p>
              </div>
            ) : (
              mindmaps.map(mindmap => (
                <div key={mindmap._id} className="content-card mindmap-card">
                  <div className="card-header">
                    <div className="card-icon">
                      <GitBranch size={24} />
                    </div>
                    <div className="card-actions">
                      <button
                        className="action-btn"
                        onClick={() => onViewMindmap && onViewMindmap(mindmap._id)}
                        title="View"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        className="action-btn delete"
                        onClick={() => handleDelete('mindmap', mindmap._id)}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="card-content">
                    <h4>{mindmap.title}</h4>
                    <div className="card-meta">
                      <div className="meta-item">
                        <Calendar size={14} />
                        <span>{new Date(mindmap.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="meta-item">
                        <span className="type-badge">{mindmap.type}</span>
                      </div>
                    </div>
                  </div>

                  <div className="card-footer">
                    <div className="stat">
                      <span className="stat-label">Nodes</span>
                      <span className="stat-value">{mindmap.nodes?.length || 0}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Connections</span>
                      <span className="stat-value">{mindmap.edges?.length || 0}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DownloadsPage;