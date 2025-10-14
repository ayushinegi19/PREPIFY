import React, { useState, useEffect } from 'react';
import { FileText, Download, Calendar, TrendingUp, ArrowLeft, CheckCircle } from 'lucide-react';
import './SummaryPage.css';

const SummaryPage = ({ summaryId, onBack }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (summaryId) {
      fetchSummary();
    }
  }, [summaryId]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      console.log('Fetching summary:', summaryId);
      
      const response = await fetch(`/api/uploads/summary/${summaryId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Summary data received:', data.summary);
        setSummary(data.summary);
      } else {
        console.error('Failed to fetch summary:', response.status);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!summary) return;

    // Create formatted text content
    let content = `SUMMARY: ${summary.document_name}\n`;
    content += `Generated: ${new Date(summary.created_at).toLocaleString()}\n`;
    content += `Type: ${summary.summary_type}\n`;
    content += `\n${'='.repeat(60)}\n\n`;
    content += `SUMMARY TEXT:\n\n${summary.summary}\n\n`;
    
    if (summary.key_points && summary.key_points.length > 0) {
      content += `${'='.repeat(60)}\n\n`;
      content += `KEY POINTS:\n\n`;
      summary.key_points.forEach((point, index) => {
        content += `${index + 1}. ${point}\n\n`;
      });
    }

    // Create and download
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `summary_${summary.document_name.replace(/\.[^/.]+$/, '')}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (loading) {
    return (
      <div className="summary-page-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading summary...</p>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="summary-page-container">
        <div className="no-summary">
          <FileText size={64} />
          <h3>Summary not found</h3>
          <button className="back-btn" onClick={onBack}>
            <ArrowLeft size={20} />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="summary-page-container">
      <div className="summary-content">
        <div className="summary-header">
          <button className="back-button" onClick={onBack}>
            <ArrowLeft size={20} />
            Back
          </button>

          <div className="summary-title-section">
            <h2>{summary.document_name}</h2>
            <p>AI-Generated Summary</p>
          </div>

          <button className="download-btn" onClick={handleDownload}>
            <Download size={20} />
            Download
          </button>
        </div>

        <div className="summary-stats">
          <div className="stat-box">
            <Calendar size={20} />
            <div>
              <span className="stat-label">Created</span>
              <span className="stat-value">
                {new Date(summary.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="stat-box">
            <FileText size={20} />
            <div>
              <span className="stat-label">Original Length</span>
              <span className="stat-value">{summary.original_length} chars</span>
            </div>
          </div>

          <div className="stat-box">
            <TrendingUp size={20} />
            <div>
              <span className="stat-label">Compression</span>
              <span className="stat-value">
                {Math.round((1 - summary.summary_length / summary.original_length) * 100)}%
              </span>
            </div>
          </div>

          <div className="stat-box">
            <CheckCircle size={20} />
            <div>
              <span className="stat-label">Type</span>
              <span className="stat-value type-badge">{summary.summary_type}</span>
            </div>
          </div>
        </div>

        <div className="summary-main">
          <div className="summary-section">
            <h3>📝 Summary</h3>
            <div className="summary-text">
              {summary.summary}
            </div>
          </div>

          {summary.key_points && summary.key_points.length > 0 && (
            <div className="summary-section">
              <h3>🎯 Key Points</h3>
              <ul className="key-points-list">
                {summary.key_points.map((point, index) => (
                  <li key={index}>{point}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SummaryPage;