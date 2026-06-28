import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom'; // Uncomment when you set up React Router
import apiClient from '../api/client';
import './Auth.css';

const Login = () => {
  const [userType, setUserType] = useState('patient'); // 'patient' or 'lab'
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [status, setStatus] = useState({ loading: false, error: null });
  // const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, error: null });

    try {
      // Dynamically choose the route based on the toggle
      const endpoint = userType === 'patient' ? '/patients/login' : '/labs/login';
      const response = await apiClient.post(endpoint, formData);

      if (response.data.success) {
        // 1. Store the JWT safely in the browser
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('userType', userType);
        
        // 2. Redirect them to their respective dashboards
        console.log("Login successful! Token saved.");
        // navigate(userType === 'patient' ? '/' : '/lab-dashboard'); 
      }
    } catch (err) {
      setStatus({ 
        loading: false, 
        error: err.response?.data?.error || 'Failed to connect to the server.' 
      });
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Welcome Back</h2>
        
        {/* The Patient / Lab Toggle */}
        <div className="auth-toggle">
          <button 
            className={userType === 'patient' ? 'active' : ''} 
            onClick={() => setUserType('patient')}
            type="button"
          >
            I am a Patient
          </button>
          <button 
            className={userType === 'lab' ? 'active' : ''} 
            onClick={() => setUserType('lab')}
            type="button"
          >
            I am a Diagnostic Center
          </button>
        </div>

        {status.error && <div className="auth-error">{status.error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" name="email" required
              value={formData.email} onChange={handleInputChange} 
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" name="password" required
              value={formData.password} onChange={handleInputChange} 
            />
          </div>

          <button type="submit" className="submit-btn" disabled={status.loading}>
            {status.loading ? 'Authenticating...' : 'Secure Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;