import React, { useState } from 'react';
import apiClient from '../api/client';
import './Auth.css';

const Register = () => {
  const [userType, setUserType] = useState('patient');
  const [status, setStatus] = useState({ loading: false, error: null, success: false });
  
  // A unified state object. We will only send the fields we need to the backend.
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone_number: '', // Patient specific
    address_text: ''  // Lab specific
  });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const registerUser = async (payload, endpoint) => {
    try {
      const response = await apiClient.post(endpoint, payload);
      if (response.data.success) {
        setStatus({ loading: false, error: null, success: true });
      }
    } catch (err) {
      setStatus({ 
        loading: false, 
        error: err.response?.data?.error || 'Registration failed.',
        success: false 
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatus({ loading: true, error: null, success: false });

    if (userType === 'patient') {
      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone_number: formData.phone_number
      };
      registerUser(payload, '/patients/register');
      
    } else {
      // LAB FLOW: We MUST get their coordinates for PostGIS
      if (!navigator.geolocation) {
        setStatus({ loading: false, error: 'Geolocation is not supported by your browser.', success: false });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const payload = {
            name: formData.name,
            email: formData.email,
            password: formData.password,
            address_text: formData.address_text,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          registerUser(payload, '/labs/register');
        },
        (geoError) => {
          setStatus({ loading: false, error: 'Please allow location access so patients can find your lab.', success: false });
        }
      );
    }
  };

  if (status.success) {
    return (
      <div className="auth-container">
        <div className="auth-card success-card">
          <h2>Registration Successful!</h2>
          <p>Your account has been created. Please log in to continue.</p>
          {/* Add a link to Login page here later */}
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Create an Account</h2>
        
        <div className="auth-toggle">
          <button className={userType === 'patient' ? 'active' : ''} onClick={() => setUserType('patient')} type="button">Patient</button>
          <button className={userType === 'lab' ? 'active' : ''} onClick={() => setUserType('lab')} type="button">Diagnostic Center</button>
        </div>

        {status.error && <div className="auth-error">{status.error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>{userType === 'patient' ? 'Full Name' : 'Lab/Clinic Name'}</label>
            <input type="text" name="name" required value={formData.name} onChange={handleInputChange} />
          </div>
          
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" name="email" required value={formData.email} onChange={handleInputChange} />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input type="password" name="password" required value={formData.password} onChange={handleInputChange} />
          </div>

          {/* Conditional Fields based on User Type */}
          {userType === 'patient' ? (
            <div className="form-group">
              <label>Phone Number</label>
              <input type="tel" name="phone_number" required value={formData.phone_number} onChange={handleInputChange} />
            </div>
          ) : (
            <div className="form-group">
              <label>Full Address</label>
              <textarea name="address_text" required value={formData.address_text} onChange={handleInputChange} rows="3" />
              <small className="help-text">We will use your browser's GPS to precisely map your location when you click submit.</small>
            </div>
          )}

          <button type="submit" className="submit-btn" disabled={status.loading}>
            {status.loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;