// NotificationToast.js - FIXED: Processing disappears, completed has close button
import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle, XCircle, Eye, X } from 'lucide-react';
import './NotificationToast.css';

const NotificationToast = ({ notification, onClose, onView }) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    // Auto-dismiss completed/failed notifications after 8 seconds
    if (notification.status === 'completed' || notification.status === 'error') {
      const timer = setInterval(() => {
        setProgress(prev => {
          if (prev <= 0) {
            clearInterval(timer);
            onClose();
            return 0;
          }
          return prev - (100 / 80); // 8 seconds = 80 intervals of 100ms
        });
      }, 100);

      return () => clearInterval(timer);
    }
  }, [notification.status, onClose]);

  const getTitle = () => {
    const titles = {
      summary: 'Summary',
      quiz: 'Quiz',
      mindmap: 'Mind Map',
      flowchart: 'Flowchart'
    };
    
    const featureTitle = titles[notification.type] || 'Content';
    
    if (notification.status === 'processing') {
      return `Generating ${featureTitle}...`;
    } else if (notification.status === 'completed') {
      return `${featureTitle} Ready!`;
    } else if (notification.status === 'error') {
      return `${featureTitle} Failed`;
    }
    
    return featureTitle;
  };

  const getSubtitle = () => {
    if (notification.status === 'processing') {
      return 'AI is analyzing your document';
    } else if (notification.status === 'completed') {
      return 'Click to view your generated content';
    } else if (notification.status === 'error') {
      return 'Something went wrong, please try again';
    }
    return '';
  };

  const getIcon = () => {
    if (notification.status === 'processing') {
      return <Loader2 className="toast-spinner" size={24} />;
    } else if (notification.status === 'completed') {
      return <CheckCircle size={24} />;
    } else if (notification.status === 'error') {
      return <XCircle size={24} />;
    }
    return null;
  };

  const getColorClass = () => {
    if (notification.status === 'processing') return 'toast-blue';
    if (notification.status === 'completed') return 'toast-green';
    if (notification.status === 'error') return 'toast-red';
    return 'toast-blue';
  };

  const handleView = () => {
    if (notification.status === 'completed' && onView) {
      onView(notification);
    }
  };

  return (
    <div className="notification-toast">
      <div className="toast-container">
        {(notification.status === 'completed' || notification.status === 'error') && (
          <div className="toast-progress-bar">
            <div 
              className={`toast-progress-fill ${getColorClass()}`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}
        
        <div className="toast-content">
          <div className="toast-header">
            <div className={`toast-icon ${getColorClass()}`}>
              {getIcon()}
            </div>
            
            <div className="toast-message">
              <h4 className="toast-title">{getTitle()}</h4>
              <p className="toast-subtitle">{getSubtitle()}</p>
            </div>
            
            {/* FIXED: Show close button for ALL statuses */}
            <button 
              className="toast-close-btn" 
              onClick={onClose}
              title="Close notification"
            >
              <X size={18} />
            </button>
          </div>
          
          {notification.status === 'completed' && (
            <button className="toast-view-btn" onClick={handleView}>
              <Eye size={18} />
              View {notification.type === 'summary' ? 'Summary' : 
                    notification.type === 'quiz' ? 'Quiz' :
                    notification.type === 'mindmap' ? 'Mind Map' : 'Flowchart'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationToast;