import React, { useState, useEffect } from 'react';
import { Target, Clock, CheckCircle, XCircle, Plus, Play, Eye, ArrowLeft } from 'lucide-react';
import './QuizPage.css';

const QuizPage = ({ onCreateQuiz, onViewQuiz, initialQuizId, onBack }) => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizResult, setQuizResult] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  // Handle initial quiz view
  useEffect(() => {
    if (initialQuizId && quizzes.length > 0) {
      const quiz = quizzes.find(q => q._id === initialQuizId);
      if (quiz) {
        handleStartQuiz(initialQuizId);
      }
    }
  }, [initialQuizId, quizzes]);

  useEffect(() => {
    if (quizStarted && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleSubmitQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [quizStarted, timeRemaining]);

  const fetchQuizzes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/uploads/quizzes', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Quizzes fetched:', data.quizzes);
        setQuizzes(data.quizzes || []);
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = async (quizId) => {
    try {
      const token = localStorage.getItem('token');
      console.log('Starting quiz:', quizId);
      
      const response = await fetch(`/api/uploads/quiz/${quizId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Quiz data received:', data.quiz);
        setSelectedQuiz(data.quiz);
        setQuizStarted(true);
        setCurrentQuestion(0);
        setUserAnswers(new Array(data.quiz.questions.length).fill(null));
        setTimeRemaining(data.quiz.time_limit);
        setQuizCompleted(false);
        setQuizResult(null);
      }
    } catch (error) {
      console.error('Error starting quiz:', error);
      alert('Failed to start quiz. Please try again.');
    }
  };

  const handleAnswerSelect = (answerIndex) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestion] = answerIndex;
    setUserAnswers(newAnswers);
  };

  const handleNextQuestion = () => {
    if (currentQuestion < selectedQuiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Submitting quiz answers:', userAnswers);
      
      const response = await fetch(`/api/uploads/quiz/${selectedQuiz._id}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ answers: userAnswers })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Quiz results:', data);
        setQuizResult(data);
        setQuizCompleted(true);
        setQuizStarted(false);
        fetchQuizzes(); // Refresh quiz list
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
      alert('Failed to submit quiz. Please try again.');
    }
  };

  const handleBackToList = () => {
    setSelectedQuiz(null);
    setQuizStarted(false);
    setQuizCompleted(false);
    setQuizResult(null);
    if (onBack) {
      onBack();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (quiz) => {
    if (!quiz.attempts || quiz.attempts.length === 0) {
      return <span className="status-badge not-started">Not Started</span>;
    }
    return <span className="status-badge completed">Completed</span>;
  };

  if (loading) {
    return (
      <div className="quiz-page-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading quizzes...</p>
        </div>
      </div>
    );
  }

  // Quiz Taking View
  if (quizStarted && selectedQuiz && !quizCompleted) {
    const question = selectedQuiz.questions[currentQuestion];
    
    return (
      <div className="quiz-page-container">
        <div className="quiz-taking-view">
          <div className="quiz-header">
            <div className="quiz-info">
              <h3>{selectedQuiz.document_name}</h3>
              <p>Question {currentQuestion + 1} of {selectedQuiz.questions.length}</p>
            </div>
            <div className="quiz-timer">
              <Clock size={20} />
              <span className={timeRemaining < 60 ? 'time-warning' : ''}>
                {formatTime(timeRemaining)}
              </span>
            </div>
          </div>

          <div className="question-card">
            <h4 className="question-text">{question.question}</h4>
            
            <div className="options-list">
              {question.options.map((option, index) => (
                <button
                  key={index}
                  className={`option-button ${userAnswers[currentQuestion] === index ? 'selected' : ''}`}
                  onClick={() => handleAnswerSelect(index)}
                >
                  <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                  <span className="option-text">{option}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="quiz-navigation">
            <button
              className="nav-button secondary"
              onClick={handlePreviousQuestion}
              disabled={currentQuestion === 0}
            >
              Previous
            </button>

            <div className="question-indicators">
              {selectedQuiz.questions.map((_, index) => (
                <button
                  key={index}
                  className={`question-indicator ${index === currentQuestion ? 'active' : ''} ${userAnswers[index] !== null ? 'answered' : ''}`}
                  onClick={() => setCurrentQuestion(index)}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            {currentQuestion === selectedQuiz.questions.length - 1 ? (
              <button className="nav-button primary" onClick={handleSubmitQuiz}>
                Submit Quiz
              </button>
            ) : (
              <button className="nav-button primary" onClick={handleNextQuestion}>
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Quiz Results View
  if (quizCompleted && quizResult) {
    return (
      <div className="quiz-page-container">
        <div className="quiz-results-view">
          <div className="results-header">
            <div className={`score-circle ${quizResult.score >= 70 ? 'pass' : 'fail'}`}>
              <span className="score-number">{quizResult.score}%</span>
            </div>
            <h3>Quiz Completed!</h3>
            <p>You answered {quizResult.correct_count} out of {quizResult.total_questions} questions correctly.</p>
          </div>

          <div className="results-summary">
            <div className="summary-card">
              <CheckCircle className="summary-icon success" />
              <div>
                <h4>{quizResult.correct_count}</h4>
                <p>Correct</p>
              </div>
            </div>
            <div className="summary-card">
              <XCircle className="summary-icon error" />
              <div>
                <h4>{quizResult.total_questions - quizResult.correct_count}</h4>
                <p>Incorrect</p>
              </div>
            </div>
            <div className="summary-card">
              <Target className="summary-icon" />
              <div>
                <h4>{quizResult.score}%</h4>
                <p>Score</p>
              </div>
            </div>
          </div>

          <div className="results-details">
            <h4>Question Review</h4>
            {selectedQuiz.questions.map((question, index) => {
              const result = quizResult.results[index];
              const isCorrect = result.is_correct;
              
              return (
                <div key={index} className={`review-question ${isCorrect ? 'correct' : 'incorrect'}`}>
                  <div className="review-header">
                    <span className="question-number">Q{index + 1}</span>
                    {isCorrect ? (
                      <CheckCircle className="result-icon success" size={20} />
                    ) : (
                      <XCircle className="result-icon error" size={20} />
                    )}
                  </div>
                  <p className="review-question-text">{question.question}</p>
                  <div className="review-answers">
                    <p>
                      <strong>Your answer:</strong> {result.user_answer !== null ? question.options[result.user_answer] : 'Not answered'}
                    </p>
                    {!isCorrect && (
                      <p className="correct-answer">
                        <strong>Correct answer:</strong> {question.options[result.correct_answer]}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button className="back-button" onClick={handleBackToList}>
            Back to Quiz List
          </button>
        </div>
      </div>
    );
  }

  // Quiz List View
  return (
    <div className="quiz-page-container">
      <div className="quiz-page-header">
        <div>
          <h3>My Quizzes</h3>
          <p>Practice with AI-generated quizzes from your notes</p>
        </div>
        <button className="create-quiz-btn" onClick={onCreateQuiz}>
          <Plus size={20} />
          Create New Quiz
        </button>
      </div>

      {quizzes.length === 0 ? (
        <div className="no-quizzes">
          <Target size={64} className="no-quiz-icon" />
          <h4>No quizzes yet</h4>
          <p>Upload some notes and create your first quiz!</p>
          <button className="create-quiz-btn" onClick={onCreateQuiz}>
            <Plus size={20} />
            Create Your First Quiz
          </button>
        </div>
      ) : (
        <div className="quizzes-grid">
          {quizzes.map((quiz) => (
            <div key={quiz._id} className="quiz-card">
              <div className="quiz-card-header">
                <div className="quiz-icon-container">
                  <Target size={24} />
                </div>
                {getStatusBadge(quiz)}
              </div>

              <div className="quiz-card-content">
                <h4 className="quiz-title">{quiz.document_name}</h4>
                <div className="quiz-meta">
                  <div className="meta-item">
                    <Target size={16} />
                    <span>{quiz.total_questions} Questions</span>
                  </div>
                  <div className="meta-item">
                    <Clock size={16} />
                    <span>{Math.floor(quiz.time_limit / 60)} minutes</span>
                  </div>
                </div>
                
                {quiz.best_score !== null && (
                  <div className="quiz-score">
                    <span className="score-label">Best Score:</span>
                    <span className="score-value">{quiz.best_score}%</span>
                  </div>
                )}
              </div>

              <div className="quiz-card-footer">
                <button 
                  className="quiz-action-btn primary"
                  onClick={() => handleStartQuiz(quiz._id)}
                >
                  <Play size={16} />
                  {quiz.attempts && quiz.attempts.length > 0 ? 'Retake Quiz' : 'Start Quiz'}
                </button>
                {quiz.attempts && quiz.attempts.length > 0 && (
                  <button className="quiz-action-btn secondary">
                    <Eye size={16} />
                    View History ({quiz.attempts.length})
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuizPage;