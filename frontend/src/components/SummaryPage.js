// ============================================
// SummaryPage.js - UPDATED WITH STRUCTURED PARAGRAPHS
// ============================================
import React, { useState, useEffect } from 'react';
import { FileText, Download, Calendar, TrendingUp, ArrowLeft, CheckCircle, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import './SummaryPage.css';

const SummaryPage = ({ summaryId, onBack }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fontSize, setFontSize] = useState(18);

  useEffect(() => {
    if (summaryId) {
      fetchSummary();
    }
  }, [summaryId]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/uploads/summary/${summaryId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
    } finally {
      setLoading(false);
    }
  };

  // NEW: Format summary into structured paragraphs
  const formatSummaryIntoParagraphs = (text) => {
    if (!text) return [];
    
    // Split by periods followed by space and capital letter (end of sentence)
    // This is a basic way to split sentences.
    const sentences = text.match(/[^.!?]+[.!?\s]+/g) || [text];
    
    const paragraphs = [];
    let currentParagraph = [];
    let sentence_count = 0;
    
    sentences.forEach((sentence, index) => {
      currentParagraph.push(sentence.trim());
      sentence_count++;
      
      // Create paragraph after 3-5 sentences or if it's the last sentence
      if ((sentence_count >= 3 && sentence_count <= 5) || index === sentences.length - 1) {
        if (currentParagraph.length > 0) {
          paragraphs.push(currentParagraph.join(' '));
          currentParagraph = [];
          sentence_count = 0; // Reset sentence count for next paragraph
        }
      }
    });

    // If there are any leftover sentences, add them as a final paragraph
    if (currentParagraph.length > 0) {
        paragraphs.push(currentParagraph.join(' '));
    }
    
    return paragraphs.length > 0 ? paragraphs : [text];
  };

  const handleDownload = () => {
    if (!summary) return;

    let content = `SUMMARY: ${summary.document_name}\n`;
    content += `Generated: ${new Date(summary.created_at).toLocaleString()}\n`;
    content += `Type: ${summary.summary_type}\n`;
    content += `\n${'='.repeat(80)}\n\n`;
    
    // Format summary with paragraphs for download
    const paragraphs = formatSummaryIntoParagraphs(summary.summary);
    content += `SUMMARY TEXT:\n\n${paragraphs.join('\n\n')}\n\n`;
    
    if (summary.key_points && summary.key_points.length > 0) {
      content += `${'='.repeat(80)}\n\n`;
      content += `KEY POINTS:\n\n`;
      summary.key_points.forEach((point, index) => {
        content += `${index + 1}. ${point}\n\n`;
      });
    }

    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `summary_${summary.document_name.replace(/\.[^/.]+$/, '')}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleZoomIn = () => setFontSize(prev => Math.min(prev + 2, 28));
  const handleZoomOut = () => setFontSize(prev => Math.max(prev - 2, 12));
  const handleResetZoom = () => setFontSize(18);

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

  // Format summary into paragraphs
  const paragraphs = formatSummaryIntoParagraphs(summary.summary);

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

          <div className="summary-controls">
            <button className="control-btn" onClick={handleZoomOut} title="Zoom Out">
              <ZoomOut size={18} />
            </button>
            <button className="control-btn" onClick={handleResetZoom} title="Reset Zoom">
              <Maximize2 size={18} />
            </button>
            <button className="control-btn" onClick={handleZoomIn} title="Zoom In">
              <ZoomIn size={18} />
            </button>
            <button className="download-btn" onClick={handleDownload}>
              <Download size={20} />
              Download
            </button>
          </div>
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
              <span className="stat-label">Original</span>
              <span className="stat-value">{summary.original_length} chars</span>
            </div>
          </div>

          <div className="stat-box">
            <TrendingUp size={20} />
            <div>
              <span className="stat-label">Reduction</span>
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
            <h3>📄 Full Summary</h3>
            <div className="summary-text-scrollable">
              {/* UPDATED: Render as structured paragraphs */}
              {paragraphs.map((paragraph, index) => (
                <p 
                  key={index}
                  style={{ 
                    fontSize: `${fontSize}px`, 
                    // line-height, margin-bottom, etc. are now handled by SummaryPage.css
                  }}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          {summary.key_points && summary.key_points.length > 0 && (
            <div className="summary-section">
              <h3>🎯 Key Points</h3>
              <ul className="key-points-list">
                {summary.key_points.map((point, index) => (
                  <li key={index} style={{ fontSize: `${Math.max(16, fontSize - 2)}px` }}> {/* Key points slightly smaller */}
                    {point}
                  </li>
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