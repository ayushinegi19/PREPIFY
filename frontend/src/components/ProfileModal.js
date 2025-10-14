import React from 'react';
import { X, User, Mail, GraduationCap, Calendar, School, LogOut, Edit } from 'lucide-react';
import './ProfileModal.css';

const ProfileModal = ({ isOpen, onClose, user, onLogout, onEdit }) => {
  if (!isOpen || !user) return null;

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="profile-close-btn" onClick={onClose}>
          <X size={20} />
        </button>
        
        <div className="profile-header">
          <div className="profile-avatar">
            <User className="profile-avatar-icon" />
          </div>
          <div className="profile-basic-info">
            <h2>{user.username}</h2>
            <p className="profile-subtitle">Student Profile</p>
          </div>
          <button className="edit-profile-btn" onClick={onEdit}>
            <Edit size={16} />
            Edit
          </button>
        </div>

        <div className="profile-details">
          <div className="detail-section">
            <h3>Personal Information</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <div className="detail-icon">
                  <User size={18} />
                </div>
                <div className="detail-content">
                  <span className="detail-label">Full Name</span>
                  <span className="detail-value">{user.username}</span>
                </div>
              </div>
              
              <div className="detail-item">
                <div className="detail-icon">
                  <Mail size={18} />
                </div>
                <div className="detail-content">
                  <span className="detail-label">Email Address</span>
                  <span className="detail-value">{user.email}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h3>Academic Information</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <div className="detail-icon">
                  <GraduationCap size={18} />
                </div>
                <div className="detail-content">
                  <span className="detail-label">Degree</span>
                  <span className="detail-value">{user.degree || 'B.E. - Computer Engineering'}</span>
                </div>
              </div>
              
              <div className="detail-item">
                <div className="detail-icon">
                  <Calendar size={18} />
                </div>
                <div className="detail-content">
                  <span className="detail-label">Current Semester</span>
                  <span className="detail-value">{user.sem ? `${user.sem}${getOrdinalSuffix(user.sem)} Semester` : 'Not specified'}</span>
                </div>
              </div>
              
              <div className="detail-item">
                <div className="detail-icon">
                  <School size={18} />
                </div>
                <div className="detail-content">
                  <span className="detail-label">College</span>
                  <span className="detail-value">{user.college || 'Thadomal Shahani Engineering College - Mumbai'}</span>
                </div>
              </div>
              
              <div className="detail-item">
                <div className="detail-icon">
                  <Calendar size={18} />
                </div>
                <div className="detail-content">
                  <span className="detail-label">Academic Year</span>
                  <span className="detail-value">{user.year ? `${getYearLabel(user.year)} Year` : 'Not specified'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h3>Account Details</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <div className="detail-icon">
                  <Calendar size={18} />
                </div>
                <div className="detail-content">
                  <span className="detail-label">Member Since</span>
                  <span className="detail-value">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-footer">
          <button className="logout-btn" onClick={onLogout}>
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

const getOrdinalSuffix = (num) => {
  const n = parseInt(num);
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
};

const getYearLabel = (year) => {
  const yearMap = {
    '1': 'First',
    '2': 'Second',
    '3': 'Third',
    '4': 'Fourth'
  };
  return yearMap[year] || year;
};

export default ProfileModal;