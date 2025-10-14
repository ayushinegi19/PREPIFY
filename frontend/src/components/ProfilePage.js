import React, { useState } from 'react';
import { User, Mail, GraduationCap, Calendar, School, Save, Lock, Eye, EyeOff } from 'lucide-react';
import './ProfilePage.css';

const ProfilePage = ({ user, setUser }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: user.username || '',
    email: user.email || '',
    degree: user.degree || 'B.E. - Computer Engineering',
    sem: user.sem || '',
    year: user.year || '',
    college: user.college || 'Thadomal Shahani Engineering College - Mumbai'
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [changingPassword, setChangingPassword] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Auto-calculate year from semester
    if (name === 'sem') {
      const semNum = parseInt(value);
      const calculatedYear = Math.ceil(semNum / 2);
      setFormData(prev => ({ ...prev, year: calculatedYear.toString() }));
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        setIsEditing(false);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update profile' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match!' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters long!' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/profile/change-password', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          current_password: passwordData.currentPassword,
          new_password: passwordData.newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Password changed successfully!' });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setChangingPassword(false);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to change password' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <div className="profile-page-container">
      <div className="profile-page-content">
        <div className="profile-header-section">
          <div className="profile-avatar-large">
            <User className="profile-avatar-icon-large" />
          </div>
          <div className="profile-header-info">
            <h2>{user.username}</h2>
            <p>{user.email}</p>
          </div>
        </div>

        {message.text && (
          <div className={`message-banner ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="profile-sections">
          {/* Personal Information Section */}
          <div className="profile-section">
            <div className="section-header">
              <h3>Personal Information</h3>
              {!isEditing && (
                <button className="edit-btn" onClick={() => setIsEditing(true)}>
                  Edit Profile
                </button>
              )}
            </div>

            <div className="profile-form">
              <div className="form-row">
                <div className="form-field">
                  <label>
                    <User size={18} />
                    Username
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />
                </div>

                <div className="form-field">
                  <label>
                    <Mail size={18} />
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    disabled={true}
                    className="disabled-field"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Academic Information Section */}
          <div className="profile-section">
            <div className="section-header">
              <h3>Academic Information</h3>
            </div>

            <div className="profile-form">
              <div className="form-row">
                <div className="form-field">
                  <label>
                    <GraduationCap size={18} />
                    Degree
                  </label>
                  <select
                    name="degree"
                    value={formData.degree}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  >
                    <option value="B.E. - Computer Engineering">B.E. - Computer Engineering</option>
                    <option value="B.E. - Electronics Engineering">B.E. - Electronics Engineering</option>
                    <option value="B.E. - Mechanical Engineering">B.E. - Mechanical Engineering</option>
                    <option value="B.E. - Civil Engineering">B.E. - Civil Engineering</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>
                    <Calendar size={18} />
                    Semester
                  </label>
                  <select
                    name="sem"
                    value={formData.sem}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  >
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
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>
                    <Calendar size={18} />
                    Year
                  </label>
                  <input
                    type="text"
                    name="year"
                    value={formData.year}
                    readOnly
                    className="disabled-field"
                  />
                </div>

                <div className="form-field">
                  <label>
                    <School size={18} />
                    College
                  </label>
                  <select
                    name="college"
                    value={formData.college}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  >
                    <option value="Thadomal Shahani Engineering College - Mumbai">
                      Thadomal Shahani Engineering College - Mumbai
                    </option>
                  </select>
                </div>
              </div>

              {isEditing && (
                <div className="form-actions">
                  <button
                    className="cancel-btn"
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        username: user.username,
                        email: user.email,
                        degree: user.degree,
                        sem: user.sem,
                        year: user.year,
                        college: user.college
                      });
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="save-btn"
                    onClick={handleSaveProfile}
                    disabled={loading}
                  >
                    <Save size={18} />
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Change Password Section */}
          <div className="profile-section">
            <div className="section-header">
              <h3>Security</h3>
              {!changingPassword && (
                <button className="edit-btn" onClick={() => setChangingPassword(true)}>
                  Change Password
                </button>
              )}
            </div>

            {changingPassword && (
              <form className="profile-form" onSubmit={handleChangePassword}>
                <div className="form-field">
                  <label>
                    <Lock size={18} />
                    Current Password
                  </label>
                  <div className="password-input-wrapper">
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      required
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => togglePasswordVisibility('current')}
                    >
                      {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="form-field">
                  <label>
                    <Lock size={18} />
                    New Password
                  </label>
                  <div className="password-input-wrapper">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      required
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => togglePasswordVisibility('new')}
                    >
                      {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="form-field">
                  <label>
                    <Lock size={18} />
                    Confirm New Password
                  </label>
                  <div className="password-input-wrapper">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      required
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => togglePasswordVisibility('confirm')}
                    >
                      {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => {
                      setChangingPassword(false);
                      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="save-btn"
                    disabled={loading}
                  >
                    <Lock size={18} />
                    {loading ? 'Changing...' : 'Change Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;