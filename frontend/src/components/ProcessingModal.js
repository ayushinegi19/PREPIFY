import React from 'react';
import { Loader2, CheckCircle, XCircle, Download, Eye, X, FileText, Target, GitBranch } from 'lucide-react';
import './ProcessingModal.css';

const ProcessingModal = ({ 
  isOpen, 
  status, // 'processing', 'completed', 'error'
  type, // 'summary', 'quiz', 'mindmap', 'flowchart'
  result,
  error,
  onClose,
  onView,
  onSave
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    if (status === 'processing') return <Loader2 className="processing-icon" />;
    if (status === 'completed') return <CheckCircle className="success-icon" />;
    if (status === 'error') return <XCircle className="error-icon" />;
    return null;
  };

  const getTypeIcon = () => {
    const icons = {
      summary: FileText,
      quiz: Target,
      mindmap: GitBranch,
      flowchart: GitBranch
    };
    const Icon = icons[type] || FileText;
    return <Icon size={24} />;
  };

  const getTitle = () => {
    const titles = {
      summary: 'Summary',
      quiz: 'Quiz',
      mindmap: 'Mind Map',
      flowchart: 'Flowchart'
    };
    
    if (status === 'processing') return `Generating ${titles[type]}...`;
    if (status === 'completed') return `${titles[type]} Generated!`;
    if (status === 'error') return `${titles[type]} Generation Failed`;
    return titles[type];
  };

  const getMessage = () => {
    if (status === 'processing') {
      return 'Please wait while we process your document...';
    }
    if (status === 'completed') {
      return 'Your content has been successfully generated. Choose an action below.';
    }
    if (status === 'error') {
      return error || 'An error occurred during generation. Please try again.';
    }
    return '';
  };

  return (
    <div className="processing-modal-overlay" onClick={status !== 'processing' ? onClose : undefined}>
      <div className="processing-modal-content" onClick={(e) => e.stopPropagation()}>
        {status !== 'processing' && (
          <button className="processing-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        )}

        <div className="processing-icon-container">
          {getIcon()}
        </div>

        <div className="processing-header">
          <div className="processing-type-icon">
            {getTypeIcon()}
          </div>
          <h2>{getTitle()}</h2>
          <p>{getMessage()}</p>
        </div>

        {status === 'processing' && (
          <div className="processing-animation">
            <div className="processing-dots">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
          </div>
        )}

        {status === 'completed' && result && (
          <div className="processing-result">
            <div className="result-stats">
              {type === 'summary' && (
                <>
                  <div className="stat-item">
                    <span className="stat-label">Original Length</span>
                    <span className="stat-value">{result.stats?.original_length || 0} chars</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Summary Length</span>
                    <span className="stat-value">{result.stats?.summary_length || 0} chars</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Reduction</span>
                    <span className="stat-value">{result.stats?.reduction || 0}%</span>
                  </div>
                </>
              )}
              {type === 'quiz' && (
                <>
                  <div className="stat-item">
                    <span className="stat-label">Questions</span>
                    <span className="stat-value">{result.total_questions || 0}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Difficulty</span>
                    <span className="stat-value">{result.difficulty || 'Medium'}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Time Limit</span>
                    <span className="stat-value">{Math.floor((result.time_limit || 0) / 60)} mins</span>
                  </div>
                </>
              )}
              {(type === 'mindmap' || type === 'flowchart') && (
                <>
                  <div className="stat-item">
                    <span className="stat-label">Nodes</span>
                    <span className="stat-value">{result.nodes?.length || 0}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Connections</span>
                    <span className="stat-value">{result.edges?.length || 0}</span>
                  </div>
                </>
              )}
            </div>

            <div className="processing-actions">
              <button className="action-btn view-btn" onClick={onView}>
                <Eye size={18} />
                View Now
              </button>
              <button className="action-btn save-btn" onClick={onSave}>
                <Download size={18} />
                Save & Close
              </button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="processing-error">
            <button className="retry-btn" onClick={onClose}>
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcessingModal;