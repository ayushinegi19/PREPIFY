"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import {
  Upload,
  Brain,
  FileText,
  GitBranch,
  ArrowLeft,
  Home,
  Target,
  Search,
  Settings,
  User,
  Download,
} from "lucide-react"
import "./App.css"
import AuthModal from "./components/Authmodal"
import ProfileModal from "./components/ProfileModal"
import UploadNotes from "./components/UploadNotes"
import MyNotes from "./components/MyNotes"
import DocumentSelector from "./components/DocumentSelector"
import QuizPage from "./components/QuizPage"
import SummaryPage from "./components/SummaryPage"
import MindMapPage from "./components/MindMapPage"
import ProfilePage from "./components/ProfilePage"
import DownloadsPage from "./components/DownloadsPage"
import NotificationToast from "./components/NotificationToast"

const App = () => {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [user, setUser] = useState(null)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [documentSelectorMode, setDocumentSelectorMode] = useState(null)
  const [navigationHistory, setNavigationHistory] = useState(["dashboard"])
  const [viewingContent, setViewingContent] = useState(null)
  const [toastNotifications, setToastNotifications] = useState(new Map())

  const sidebarItems = [
    { id: "dashboard", icon: Home, label: "Dashboard" },
    { id: "upload", icon: Upload, label: "Upload Notes" },
    { id: "notes", icon: FileText, label: "My Notes" },
    { id: "quizzes", icon: Target, label: "Quizzes" },
    { id: "profile", icon: User, label: "Profile" },
    { id: "downloads", icon: Download, label: "My Materials" },
  ]

  const quickActions = [
    { id: "upload", icon: Upload, title: "Upload Notes", desc: "Add new study material", className: "pink-gradient" },
    { id: "quiz", icon: Brain, title: "Generate Quiz", desc: "Create practice tests", className: "purple-gradient" },
    { id: "summary", icon: FileText, title: "Make Summary", desc: "AI-powered summaries", className: "coral-gradient" },
    {
      id: "mindmap",
      icon: GitBranch,
      title: "Create Mind Maps",
      desc: "Visual knowledge maps",
      className: "indigo-gradient",
    },
  ]

  useEffect(() => {
    const checkLoggedInUser = async () => {
      const token = localStorage.getItem("token")
      if (token) {
        try {
          axios.defaults.headers.common["Authorization"] = `Bearer ${token}`
          const response = await axios.post("/api/auth/verify-token")
          setUser(response.data.user)
        } catch (error) {
          localStorage.clear()
          delete axios.defaults.headers.common["Authorization"]
          setUser(null)
        }
      }
      setLoading(false)
    }
    checkLoggedInUser()
  }, [])

  const showToast = (type, status, contentId = null) => {
    setToastNotifications((prev) => {
      const newMap = new Map(prev)

      if (status === "completed" || status === "error") {
        const keysToDelete = []
        for (const [k, v] of newMap.entries()) {
          if (v.type === type) {
            keysToDelete.push(k)
          }
        }
        keysToDelete.forEach((k) => newMap.delete(k))
      }

      const key = `${type}_${status}_${Date.now()}`
      newMap.set(key, {
        id: key,
        type,
        status,
        contentId,
        timestamp: Date.now(),
      })

      return newMap
    })
  }

  const removeToast = (id) => {
    setToastNotifications((prev) => {
      const newMap = new Map(prev)
      newMap.delete(id)
      return newMap
    })
  }

  const handleToastView = (notification) => {
    removeToast(notification.id)

    if (notification.type === "summary") {
      setViewingContent({ type: "summary", id: notification.contentId })
      navigateTo("downloads", false)
    } else if (notification.type === "quiz") {
      setViewingContent({ type: "quiz", id: notification.contentId })
      navigateTo("quizzes", false)
    } else if (notification.type === "mindmap" || notification.type === "flowchart") {
      setViewingContent({ type: "mindmap", id: notification.contentId })
      navigateTo("downloads", false)
    }
  }

  const navigateTo = (tab, addToHistory = true) => {
    if (addToHistory && tab !== activeTab) {
      setNavigationHistory((prev) => [...prev, activeTab])
    }
    setActiveTab(tab)
    setViewingContent(null)
  }

  const goBack = () => {
    if (viewingContent) {
      setViewingContent(null)
      return
    }

    if (documentSelectorMode) {
      setDocumentSelectorMode(null)
      return
    }

    if (navigationHistory.length > 0) {
      const newHistory = [...navigationHistory]
      const previousTab = newHistory.pop()
      setNavigationHistory(newHistory)
      setActiveTab(previousTab)
    }
  }

  const handleProfileClick = () => {
    if (user) {
      setIsProfileModalOpen(true)
    } else {
      setIsAuthModalOpen(true)
    }
  }

  const handleAuthSuccess = (userData) => {
    setUser(userData)
    setIsAuthModalOpen(false)
    const token = localStorage.getItem("token")
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`
    }
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.clear()
    delete axios.defaults.headers.common["Authorization"]
    setIsProfileModalOpen(false)
    navigateTo("dashboard", false)
  }

  const handleQuickAction = (actionId) => {
    if (!user) {
      setIsAuthModalOpen(true)
      return
    }

    if (actionId === "upload") {
      navigateTo("upload")
      setDocumentSelectorMode(null)
    } else if (actionId === "quiz") {
      setDocumentSelectorMode("create_quiz")
      if (activeTab === "dashboard") {
        navigateTo("notes")
      }
    } else if (actionId === "summary") {
      setDocumentSelectorMode("summarize")
      if (activeTab === "dashboard") {
        navigateTo("notes")
      }
    } else if (actionId === "mindmap") {
      setDocumentSelectorMode("create_mindmap")
      if (activeTab === "dashboard") {
        navigateTo("notes")
      }
    }
  }

  const handleDocumentSelect = async (document, action) => {
    try {
      const token = localStorage.getItem("token")

      const actionType =
        action === "summarize"
          ? "summary"
          : action === "create_quiz"
            ? "quiz"
            : action === "create_mindmap"
              ? "mindmap"
              : "flowchart"

      showToast(actionType, "processing")

      const response = await fetch(`/api/uploads/action/${document._id}/${action}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        const errorData = await response.json()
        showToast(actionType, "error")
        throw new Error(errorData.error || "Failed to process document")
      }

      const data = await response.json()

      if (data.success) {
        let contentId = null
        if (action === "create_quiz") contentId = data.quiz_id
        else if (action === "summarize") contentId = data.summary_id
        else if (action === "create_mindmap" || action === "create_flowchart") contentId = data.mindmap_id

        showToast(actionType, "completed", contentId)
        setDocumentSelectorMode(null)
      }
    } catch (error) {
      console.error("Error processing document:", error)
      alert(error.message || "Failed to process document")
    }
  }

  const handleUploadActionComplete = (actionData) => {
    if (actionData.status === "processing") {
      showToast(actionData.type, "processing")
    } else if (actionData.status === "completed") {
      showToast(actionData.type, "completed", actionData.contentId)
    } else if (actionData.status === "error") {
      showToast(actionData.type, "error")
    }
  }

  const handleEditProfile = () => {
    setIsProfileModalOpen(false)
    navigateTo("profile")
  }

  const getTabTitle = (tab) => {
    const subtitle = user
      ? `Welcome back, ${user.username}! Ready to ace your exams?`
      : "Welcome! Ready to ace your exams?"
    const titles = {
      dashboard: { title: "Dashboard", subtitle: subtitle },
      upload: { title: "Upload Notes", subtitle: "Add new study materials for AI processing" },
      notes: { title: "My Notes", subtitle: "View and manage your uploaded documents" },
      quizzes: { title: "Quizzes & Tests", subtitle: "Practice with AI-generated quizzes" },
      analytics: { title: "Analytics", subtitle: "Track your performance and progress" },
      resources: { title: "Resources", subtitle: "Access curated study materials" },
      profile: { title: "Profile", subtitle: "Manage your account settings" },
      downloads: { title: "Downloads", subtitle: "View all your generated content" },
    }
    return titles[tab] || titles.dashboard
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <Brain className="loading-icon" />
          <p>Loading Prepify...</p>
        </div>
      </div>
    )
  }

  const renderMainContent = () => {
    if (documentSelectorMode) {
      return <DocumentSelector action={documentSelectorMode} onBack={goBack} onSelect={handleDocumentSelect} />
    }

    if (viewingContent) {
      if (viewingContent.type === "summary") {
        return <SummaryPage summaryId={viewingContent.id} onBack={goBack} />
      } else if (viewingContent.type === "mindmap") {
        return <MindMapPage mindmapId={viewingContent.id} onBack={goBack} />
      } else if (viewingContent.type === "quiz") {
        return (
          <QuizPage
            initialQuizId={viewingContent.id}
            onCreateQuiz={() => setDocumentSelectorMode("create_quiz")}
            onBack={goBack}
          />
        )
      }
    }

    if (activeTab === "dashboard") {
      return (
        <div className="dashboard-content">
          {!user && (
            <div className="auth-prompt">
              <div className="auth-prompt-content">
                <Brain className="auth-prompt-icon" />
                <h3>Welcome to Prepify!</h3>
                <p>Sign in to unlock all features.</p>
                <button className="auth-prompt-btn" onClick={() => setIsAuthModalOpen(true)}>
                  Get Started
                </button>
              </div>
            </div>
          )}
          <section className="quick-actions-section">
            <h3>Quick Actions</h3>
            <div className="quick-actions-grid">
              {quickActions.map((action) => (
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
        </div>
      )
    } else if (user) {
      switch (activeTab) {
        case "upload":
          return <UploadNotes onActionComplete={handleUploadActionComplete} />
        case "notes":
          return <MyNotes />
        case "quizzes":
          return (
            <QuizPage
              onCreateQuiz={() => setDocumentSelectorMode("create_quiz")}
              onViewQuiz={(quizId) => setViewingContent({ type: "quiz", id: quizId })}
            />
          )
        case "profile":
          return <ProfilePage user={user} setUser={setUser} />
        case "downloads":
          return (
            <DownloadsPage
              onViewSummary={(id) => setViewingContent({ type: "summary", id })}
              onViewMindmap={(id) => setViewingContent({ type: "mindmap", id })}
            />
          )
        case "analytics":
        case "resources":
          return (
            <div className="coming-soon">
              <h3>Coming Soon</h3>
              <p>This section is under development.</p>
            </div>
          )
        default:
          return null
      }
    } else {
      return (
        <div className="auth-required-section">
          <Brain className="auth-required-icon" />
          <h3>Authentication Required</h3>
          <p>Please sign in to access this feature.</p>
          <button className="auth-required-btn" onClick={() => setIsAuthModalOpen(true)}>
            Sign In
          </button>
        </div>
      )
    }
  }

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
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                navigateTo(item.id)
                setDocumentSelectorMode(null)
              }}
              className={`nav-item ${activeTab === item.id ? "active" : ""}`}
            >
              <item.icon className="nav-icon" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="nav-item" onClick={() => navigateTo("analytics")}>
            <Settings className="nav-icon" />
            <span>Settings</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="header">
          <div className="header-left">
            {(viewingContent ||
              documentSelectorMode ||
              (activeTab !== "dashboard" && navigationHistory.length > 0)) && (
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
              <input type="text" placeholder="Search..." className="search-input" />
            </div>
            <button className="profile-btn enhanced-profile-btn" onClick={handleProfileClick}>
              <div className="profile-avatar-small">
                <User className="profile-icon" />
              </div>
              <span className="profile-name">{user ? user.username : "Sign In"}</span>
            </button>
          </div>
        </header>

        <div className="tab-content">{renderMainContent()}</div>
      </main>

      {Array.from(toastNotifications.values()).map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onClose={() => removeToast(notification.id)}
          onView={handleToastView}
        />
      ))}

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onAuthSuccess={handleAuthSuccess} />

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
        onLogout={handleLogout}
        onEdit={handleEditProfile}
      />
    </div>
  )
}

export default App
