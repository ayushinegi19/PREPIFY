import React, { useState } from 'react';
import axios from 'axios';
import { Brain, X } from 'lucide-react';
import './AuthModal.css';

const AuthModal = ({ isOpen, onClose, onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [degree, setDegree] = useState('B.E. - Computer Engineering');
  const [sem, setSem] = useState('');
  const [year, setYear] = useState('');
  const [college, setCollege] = useState('Thadomal Shahani Engineering College - Mumbai');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSemChange = (e) => {
    const selectedSem = e.target.value;
    setSem(selectedSem);
    
    // Auto-fill year based on semester
    if (selectedSem) {
      const semNum = parseInt(selectedSem);
      const calculatedYear = Math.ceil(semNum / 2);
      setYear(calculatedYear.toString());
    } else {
      setYear('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const url = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin 
      ? { email, password } 
      : { username, email, password, degree, sem, year, college };

    try {
      const response = await axios.post(url, payload);
      if (isLogin) {
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        onAuthSuccess(user);
      } else {
        setIsLogin(true);
        setError('Registration successful! Please log in.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError('');
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}><X size={24} /></button>
        <div className="modal-header">
          <Brain className="modal-icon" />
          <h2>{isLogin ? 'Welcome Back!' : 'Join Prepify'}</h2>
          <p>{isLogin ? 'Sign in to continue your journey.' : 'Create an account to get started.'}</p>
        </div>
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
              </div>
              <div className="form-group">
                <label htmlFor="degree">Degree</label>
                <select id="degree" value={degree} onChange={(e) => setDegree(e.target.value)} required>
                  <option value="B.E. - Computer Engineering">B.E. - Computer Engineering</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="sem">Semester</label>
                <select id="sem" value={sem} onChange={handleSemChange} required>
                  <option value="">Select Semester</option>
                  <option value="1">1st Semester</option>
                  <option value="2">2nd Semester</option>
                  <option value="3">3rd Semester</option>
                  <option value="4">4th Semester</option>
                  <option value="5">5th Semester</option>
                  <option value="6">6th Semester</option>
                  <option value="7">7th Semester</option>
                  <option value="8">8th Semester</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="year">Year</label>
                <input type="text" id="year" value={year} readOnly />
              </div>
              <div className="form-group">
                <label htmlFor="college">College</label>
                <select id="college" value={college} onChange={(e) => setCollege(e.target.value)} required>
                  <option value="Thadomal Shahani Engineering College - Mumbai">Thadomal Shahani Engineering College - Mumbai</option>
                </select>
              </div>
            </>
          )}
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="error-message">{error}</p>}
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Processing...' : (isLogin ? 'Login' : 'Create Account')}
          </button>
        </form>
        <div className="switch-mode">
          <p>{isLogin ? "Don't have an account?" : 'Already have an account?'} <button onClick={switchMode}>{isLogin ? 'Sign Up' : 'Login'}</button></p>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;