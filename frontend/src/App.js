// App.js - Complete Fixed Version with All Features Working
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BookOpen, Brain, Clock, FileText, Upload, Target, Calendar, Award, 
  TrendingUp, Bell, Search, Settings, User, Home, BarChart3, Library, Zap, CheckCircle,
  GitBranch, HelpCircle, Database, Download, ArrowLeft, X
} from 'lucide-react';
import './App.css';
import AuthModal from './components/Authmodal';
import ProfileModal from './components/ProfileModal';
import ProcessingModal from './components/ProcessingModal';
import UploadNotes from "./components/UploadNotes";
import MyNotes from "./components/MyNotes";
import DocumentSelector from "./components/DocumentSelector";
import QuizPage from "./components/QuizPage";
import SummaryPage from "./components/SummaryPage";
import MindMapPage from "./components/MindMapPage";
import ProfilePage from "./components/ProfilePage";
import DownloadsPage from "./components/DownloadsPage";

// Main App Component
const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [documentSelectorMode, setDocumentSelectorMode] = useState(null);
  const [navigationHistory, setNavigationHistory] = useState(['dashboard']);
  
  // Processing Modal States
  const [processingModal, setProcessingModal] = useState({
    isOpen: false,
    status: 'processing',
    type: null,
    result: null,
    error: null,
    contentId: null
  });
  
  // Content viewing states
  const [viewingContent, setViewingContent] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Updated sidebar items
  const sidebarItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard' },
    { id: 'upload', icon: Upload, label: 'Upload Notes' },
    { id: 'notes', icon: FileText, label: 'My Notes' },
    { id: 'quizzes', icon: Target, label: 'Quizzes & Tests' },
    { id: 'analytics', icon: BarChart3, label: 'Analytics' },
    { id: 'resources', icon: Library, label: 'Resources' },
    { id: 'profile', icon: User, label: 'Profile' },
    { id: 'downloads', icon: Download, label: 'Downloads' },
  ];

  // Quick actions
  const quickActions = [
    { id: 'upload', icon: Upload, title: 'Upload Notes', desc: 'Add new study material', className: 'pink-gradient' },
    { id: 'quiz', icon: Brain, title: 'Generate Quiz', desc: 'Create practice tests', className: 'purple-gradient' },
    { id: 'summary', icon: FileText, title: 'Make Summary', desc: 'AI-powered summaries', className: 'coral-gradient' },
    { id: 'mindmap', icon: GitBranch, title: 'Create Mind Maps', desc: 'Visual knowledge maps', className: 'indigo-gradient' },
  ];

  const recentActivity = [
    { type: 'quiz', subject: 'Mathematics', score: '85%', time: '2 hours ago' },
    { type: 'summary', subject: 'Physics', action: 'Generated', time: '4 hours ago' },
    { type: 'flashcard', subject: 'Chemistry', action: 'Created 15 cards', time: '1 day ago' },
    { type: 'planner', subject: 'Biology', action: 'Study session completed', time: '1 day ago' },
  ];

  const performanceData = [
    { subject: 'Math', score: 88, change: '+5%', trend: 'up' },
    { subject: 'Physics', score: 92, change: '+8%', trend: 'up' },
    { subject: 'Chemistry', score: 78, change: '-2%', trend: 'down' },
  ];

  const statsData = [
    { label: 'Total Study Hours', value: '47.5', change: '+12% this week', changeType: 'positive', icon: Clock, className: 'pink-gradient' },
    { label: 'Quizzes Completed', value: '23', change: '+5 this week', changeType: 'positive', icon: Target, className: 'purple-gradient' },
    { label: 'Average Score', value: '86%', change: '+3% improvement', changeType: 'positive', icon: Award, className: 'coral-gradient' },
    { label: 'Study Streak', value: '12', change: 'days in a row', changeType: 'streak', icon: Zap, className: 'indigo-gradient' }
  ];
  
  // Authentication logic
  useEffect(() => {
    const checkLoggedInUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const response = await axios.post('/api/auth/verify-token');
          setUser(response.data.user);
        } catch (error) {
          console.error("Token verification failed, clearing session.", error);
          localStorage.clear();
          delete axios.defaults.headers.common['Authorization'];
          setUser(null);
        }
      }
      setLoading(false);
    };
    checkLoggedInUser();
  }, []);

  // Add notification function
  const addNotification = (type, message) => {
    const newNotification = {
      id: Date.now(),
      type,
      message,
      time: new Date().toLocaleTimeString(),
      read: false
    };
    setNotifications(prev => [newNotification, ...prev]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
    }, 10000);
  };

  // Navigation with history
  const navigateTo = (tab, addToHistory = true) => {
    if (addToHistory && tab !== activeTab) {
      setNavigationHistory(prev => [...prev, activeTab]);
    }
    setActiveTab(tab);
    setViewingContent(null);
    // Don't clear document selector mode here - let it persist
  };

  // Go back function
  const goBack = () => {
    if (viewingContent) {
      setViewingContent(null);
      return;
    }
    
    if (documentSelectorMode) {
      setDocumentSelectorMode(null);
      return;
    }

    if (navigationHistory.length > 0) {
      const newHistory = [...navigationHistory];
      const previousTab = newHistory.pop();
      setNavigationHistory(newHistory);
      setActiveTab(previousTab);
    }
  };

  // Handler functions
  const handleProfileClick = () => {
    if (user) {
      setIsProfileModalOpen(true);
    } else {
      setIsAuthModalOpen(true);
    }
  };

  const handleAuthSuccess = (userData) => {
    setUser(userData);
    setIsAuthModalOpen(false);
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    addNotification('success', 'Successfully logged in!');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.clear();
    delete axios.defaults.headers.common['Authorization'];
    setIsProfileModalOpen(false);
    navigateTo('dashboard', false);
    addNotification('info', 'You have been logged out.');
  };

  const handleQuickAction = (actionId) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    if (actionId === 'upload') {
      navigateTo('upload');
      setDocumentSelectorMode(null);
    } else if (actionId === 'quiz') {
      setDocumentSelectorMode('create_quiz');
      // Stay on dashboard or navigate to notes
      if (activeTab === 'dashboard') {
        navigateTo('notes');
      }
    } else if (actionId === 'summary') {
      setDocumentSelectorMode('summarize');
      if (activeTab === 'dashboard') {
        navigateTo('notes');
      }
    } else if (actionId === 'mindmap') {
      setDocumentSelectorMode('create_mindmap');
      if (activeTab === 'dashboard') {
        navigateTo('notes');
      }
    }
  };

  const handleDocumentSelect = async (document, action) => {
  try {
    const token = localStorage.getItem('token');
    
    addNotification('info', `Processing document...`);
    
    const response = await fetch(`/api/uploads/action/${document._id}/${action}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})  // ✅ ADD THIS LINE
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to process document');
    }

    const data = await response.json();

    if (data.success) {
      const actionName = action.replace('create_', '').replace('_', ' ');
      addNotification('success', `${actionName} created successfully!`);
      setDocumentSelectorMode(null);
      
      // Navigate to the created content
      if (action === 'create_quiz' && data.quiz_id) {
        setViewingContent({ type: 'quiz', id: data.quiz_id });
        navigateTo('quizzes');
      } else if (action === 'summarize' && data.summary_id) {
        setViewingContent({ type: 'summary', id: data.summary_id });
        navigateTo('downloads');
      } else if ((action === 'create_mindmap' || action === 'create_flowchart') && data.mindmap_id) {
        setViewingContent({ type: 'mindmap', id: data.mindmap_id });
        navigateTo('downloads');
      }
    }
  } catch (error) {
    console.error('Error processing document:', error);
    const errorMsg = error.message || 'Failed to process document';
    addNotification('error', errorMsg);
    alert(errorMsg);
  }
};

  // Processing Modal Handlers
  const handleProcessingView = () => {
    const { type, contentId } = processingModal;
    
    // Close processing modal
    setProcessingModal({
      isOpen: false,
      status: 'processing',
      type: null,
      result: null,
      error: null,
      contentId: null
    });
    
    // Navigate to view
    if (type === 'quiz' && contentId) {
      setViewingContent({ type: 'quiz', id: contentId });
      navigateTo('quizzes');
    } else if (type === 'summary' && contentId) {
      setViewingContent({ type: 'summary', id: contentId });
      navigateTo('downloads');
    } else if ((type === 'mindmap' || type === 'flowchart') && contentId) {
      setViewingContent({ type: 'mindmap', id: contentId });
      navigateTo('downloads');
    }
  };

  const handleProcessingSave = () => {
    // Close processing modal
    setProcessingModal({
      isOpen: false,
      status: 'processing',
      type: null,
      result: null,
      error: null,
      contentId: null
    });
    
    // Navigate to downloads page
    navigateTo('downloads');
    addNotification('info', 'Content saved successfully! View it in Downloads.');
  };

  const handleProcessingClose = () => {
    setProcessingModal({
      isOpen: false,
      status: 'processing',
      type: null,
      result: null,
      error: null,
      contentId: null
    });
  };

  const handleEditProfile = () => {
    setIsProfileModalOpen(false);
    navigateTo('profile');
  };

  const handleUploadSuccess = () => {
    addNotification('success', 'Document uploaded successfully!');
  };

  const getTabTitle = (tab) => {
    const subtitle = user ? `Welcome back, ${user.username}! Ready to ace your exams?` : 'Welcome! Ready to ace your exams?';
    const titles = {
      dashboard: { title: 'Dashboard', subtitle: subtitle },
      upload: { title: 'Upload Notes', subtitle: 'Add new study materials for AI processing' },
      notes: { title: 'My Notes', subtitle: 'View and manage your uploaded documents' },
      quizzes: { title: 'Quizzes & Tests', subtitle: 'Practice with AI-generated quizzes' },
      analytics: { title: 'Analytics', subtitle: 'Track your performance and progress' },
      resources: { title: 'Resources', subtitle: 'Access curated study materials' },
      profile: { title: 'Profile', subtitle: 'Manage your account settings' },
      downloads: { title: 'Downloads', subtitle: 'View all your generated content' }
    };
    return titles[tab] || titles.dashboard;
  };

  const renderActivityIcon = (type) => {
    const icons = { quiz: Target, summary: FileText, flashcard: BookOpen, planner: CheckCircle };
    const Icon = icons[type] || BookOpen;
    return <Icon className="activity-icon" />;
  };

  const markNotificationRead = (id) => {
    setNotifications(prev => 
      prev.map(notif => notif.id === id ? { ...notif, read: true } : notif)
    );
  };

  if (loading) {
    return <div className="loading-container"><div className="loading-spinner"><Brain className="loading-icon" /><p>Loading Prepify...</p></div></div>;
  }

  // Render content based on viewingContent state
  const renderMainContent = () => {
    // If in document selection mode - show this FIRST, regardless of tab
    if (documentSelectorMode) {
      return (
        <DocumentSelector 
          action={documentSelectorMode}
          onBack={goBack}
          onSelect={handleDocumentSelect}
        />
      );
    }
    
    // If viewing specific content
    if (viewingContent) {
      if (viewingContent.type === 'summary') {
        return <SummaryPage summaryId={viewingContent.id} onBack={goBack} />;
      } else if (viewingContent.type === 'mindmap') {
        return <MindMapPage mindmapId={viewingContent.id} onBack={goBack} />;
      } else if (viewingContent.type === 'quiz') {
        return <QuizPage 
          initialQuizId={viewingContent.id} 
          onCreateQuiz={() => setDocumentSelectorMode('create_quiz')}
          onBack={goBack}
        />;
      }
    }

    // Regular tab content
    if (activeTab === 'dashboard') {
      return (
        <div className="dashboard-content">
          {!user && (
            <div className="auth-prompt">
              <div className="auth-prompt-content">
                <Brain className="auth-prompt-icon" />
                <h3>Welcome to Prepify!</h3>
                <p>Sign in to unlock all features.</p>
                <button className="auth-prompt-btn" onClick={() => setIsAuthModalOpen(true)}>Get Started</button>
              </div>
            </div>
          )}
          <div className="stats-grid">
            {statsData.map((stat, i) => (
              <div key={i} className="stat-card">
                <div className="stat-content">
                  <div className="stat-info">
                    <p className="stat-label">{stat.label}</p>
                    <p className="stat-value">{stat.value}</p>
                    <p className={`stat-change ${stat.changeType}`}>{stat.change}</p>
                  </div>
                  <div className={`stat-icon ${stat.className}`}>
                    <stat.icon className="icon" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <section className="quick-actions-section">
            <h3>Quick Actions</h3>
            <div className="quick-actions-grid">
              {quickActions.map(action => (
                <button 
                  key={action.id} 
                  className={`quick-action-card ${action.className}`} 
                  onClick={() => handleQuickAction(action.id)}
                >
                  <action.icon className="action-icon" />
                  <h4>{action.title}</h4>
                  <p>{action.desc}</p>
                  {!user && <span className="auth-required">Sign in required</span>}
                </button>
              ))}
            </div>
          </section>
          <div className="content-grid">
            <section className="performance-card">
              <h3>Performance</h3>
              <div className="performance-list">
                {performanceData.map((s, i) => (
                  <div key={i} className="performance-item">
                    <div className="performance-info">
                      <p className="subject-name">{s.subject}</p>
                      <p className={`performance-change ${s.trend === 'up' ? 'positive' : 'negative'}`}>{s.change}</p>
                    </div>
                    <div className="performance-score">
                      <span className="score">{s.score}%</span>
                      <TrendingUp className={`trend-icon ${s.trend}`} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <div className="right-sidebar">
              <div className="question-bank-card">
                <div className="question-bank-header">
                  <Database className="question-bank-icon" />
                  <div>
                    <h3>Question Bank</h3>
                    <p>Access practice questions</p>
                  </div>
                </div>
                <button className="question-bank-btn" onClick={() => navigateTo('quizzes')}>Browse Questions</button>
              </div>
            </div>
          </div>
          <section className="recent-activity">
            <h3>Recent Activity</h3>
            <div className="activity-list">
              {user ? recentActivity.map((act, i) => (
                <div key={i} className="activity-item">
                  <div className={`activity-icon-container ${act.type}`}>{renderActivityIcon(act.type)}</div>
                  <div className="activity-content">
                    <p className="activity-subject">{act.subject}</p>
                    <p className="activity-action">{act.action || `Scored ${act.score}`}</p>
                  </div>
                  <p className="activity-time">{act.time}</p>
                </div>
              )) : (
                <div className="no-activity">
                  <p>Sign in to see your recent activity</p>
                  <button className="sign-in-btn" onClick={() => setIsAuthModalOpen(true)}>Sign In</button>
                </div>
              )}
            </div>
          </section>
        </div>
      );
    } else if (user) {
      switch (activeTab) {
        case 'upload':
          return <UploadNotes 
            onSuccess={handleUploadSuccess} 
            onProcessingModalOpen={setProcessingModal}
          />;
        case 'notes':
          return <MyNotes />;
        case 'quizzes':
          return <QuizPage 
            onCreateQuiz={() => setDocumentSelectorMode('create_quiz')} 
            onViewQuiz={(quizId) => setViewingContent({ type: 'quiz', id: quizId })}
          />;
        case 'profile':
          return <ProfilePage user={user} setUser={setUser} />;
        case 'downloads':
          return <DownloadsPage 
            onViewSummary={(id) => setViewingContent({ type: 'summary', id })}
            onViewMindmap={(id) => setViewingContent({ type: 'mindmap', id })}
          />;
        case 'analytics':
        case 'resources':
          return <div className="coming-soon"><h3>Coming Soon</h3><p>This section is under development.</p></div>;
        default:
          return null;
      }
    } else {
      return (
        <div className="auth-required-section">
          <Brain className="auth-required-icon" />
          <h3>Authentication Required</h3>
          <p>Please sign in to access this feature.</p>
          <button className="auth-required-btn" onClick={() => setIsAuthModalOpen(true)}>Sign In</button>
        </div>
      );
    }
  };

  // Main render
  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-container">
            <div className="logo-icon">
              <Brain className="logo-brain" />
            </div>
            <div className="logo-text">
              <h1>PREPIFY</h1>
              <p>PREP SMARTER. NOT HARDER.</p>
            </div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {sidebarItems.map(item => (
            <button 
              key={item.id} 
              onClick={() => {
                navigateTo(item.id);
                setDocumentSelectorMode(null); // Clear selector when changing tabs
              }} 
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            >
              <item.icon className="nav-icon" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="nav-item" onClick={() => navigateTo('analytics')}>
            <Settings className="nav-icon" />
            <span>Settings</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="header">
          <div className="header-left">
            {(viewingContent || documentSelectorMode || (activeTab !== 'dashboard' && navigationHistory.length > 0)) && (
              <button className="back-nav-btn" onClick={goBack}>
                <ArrowLeft size={18} />
                Back
              </button>
            )}
            <div>
              <h2>{getTabTitle(activeTab).title}</h2>
              <p>{getTabTitle(activeTab).subtitle}</p>
            </div>
          </div>
          <div className="header-right">
            <div className="search-container">
              <Search className="search-icon" />
              <input type="text" placeholder="Search..." className="search-input"/>
            </div>
            <button 
              className="notification-btn enhanced-notification-btn"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="notification-icon" />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="notification-badge">{notifications.filter(n => !n.read).length}</span>
              )}
            </button>
            <button className="profile-btn enhanced-profile-btn" onClick={handleProfileClick}>
              <div className="profile-avatar-small">
                <User className="profile-icon" />
              </div>
              <span className="profile-name">{user ? user.username : 'Sign In'}</span>
            </button>
          </div>
        </header>
        
        {/* Notifications Panel */}
        {showNotifications && (
          <div className="notifications-panel">
            <div className="notifications-header">
              <h3>Notifications</h3>
              <button onClick={() => setShowNotifications(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="notifications-list">
              {notifications.length === 0 ? (
                <div className="notification-item info">
                  <div className="notification-content">
                    <p>No notifications yet</p>
                    <span className="notification-time">Start using Prepify to get updates</span>
                  </div>
                </div>
              ) : (
                notifications.map(notif => (
                  <div 
                    key={notif.id} 
                    className={`notification-item ${notif.type} ${notif.read ? 'read' : ''}`}
                    onClick={() => markNotificationRead(notif.id)}
                  >
                    <div className="notification-content">
                      <p>{notif.message}</p>
                      <span className="notification-time">{notif.time}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        
        <div className="tab-content">
          {renderMainContent()}
        </div>
      </main>

      {/* Modals */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        onAuthSuccess={handleAuthSuccess} 
      />
      
      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
        user={user} 
        onLogout={handleLogout} 
        onEdit={handleEditProfile} 
      />
      
      <ProcessingModal
        isOpen={processingModal.isOpen}
        status={processingModal.status}
        type={processingModal.type}
        result={processingModal.result}
        error={processingModal.error}
        onClose={handleProcessingClose}
        onView={handleProcessingView}
        onSave={handleProcessingSave}
      />
    </div>
  );
};

export default App;