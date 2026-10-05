import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiUrl } from '../api/client'

export default function Profile() {
  const { user, token, loading: authLoading, logout } = useAuth()
  const navigate = useNavigate()

  const [profileData, setProfileData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal States
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPwdModal, setShowPwdModal] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState('')
  const [isLocating, setIsLocating] = useState(false)

  // Form States
  const [editForm, setEditForm] = useState({ 
    name: '', 
    phone_number: '',
    address_text: '',
    latitude: '',
    longitude: ''
  })
  const [pwdForm, setPwdForm] = useState({ current_password: '', new_password: '' })

  useEffect(() => {
    if (authLoading) return;
    if (!user || !token) {
      navigate('/login')
      return;
    }

    const fetchProfile = async () => {
      try {
        const endpoint = user.role === 'patient' 
          ? apiUrl('patients/profile')
          : apiUrl('labs/profile');

        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || data.message || 'Failed to load profile');
        }

        if (user.role === 'patient') {
          setProfileData(data.patient);
        } else {
          setProfileData(data.profile);
        }
        
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [user, token, authLoading, navigate])

  const openEditModal = () => {
    setEditForm({ 
      name: profileData?.name || '', 
      phone_number: profileData?.phone_number || '',
      address_text: profileData?.address_text || '',
      latitude: profileData?.latitude || '',
      longitude: profileData?.longitude || ''
    })
    setModalError('')
    setShowEditModal(true)
  }

  const openPwdModal = () => {
    setPwdForm({ current_password: '', new_password: '' })
    setModalError('')
    setShowPwdModal(true)
  }

  const handleDetectLocation = () => {
    setIsLocating(true)
    setModalError('')

    if (!navigator.geolocation) {
      setModalError('Geolocation is not supported by your browser.')
      setIsLocating(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setEditForm(prev => ({
          ...prev,
          latitude: pos.coords.latitude.toString(),
          longitude: pos.coords.longitude.toString()
        }))
        setIsLocating(false)
      },
      () => {
        setModalError('Unable to retrieve location coordinates automatically.')
        setIsLocating(false)
      }
    )
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setModalLoading(true)
    setModalError('')

    try {
      const isLab = user.role === 'lab'
      const endpoint = isLab
        ? apiUrl('labs/profile')
        : apiUrl('patients/profile')

      const method = isLab ? 'PUT' : 'PATCH'

      const response = await fetch(endpoint, {
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      })
      const data = await response.json()

      if (!response.ok) throw new Error(data.error || data.message || 'Failed to update profile')

      if (isLab) {
        setProfileData(data.profile)
        // Also update local storage cached user object if stored
        const storedUser = localStorage.getItem('user')
        if (storedUser) {
          const parsed = JSON.parse(storedUser)
          localStorage.setItem('user', JSON.stringify({ ...parsed, name: data.profile.name, is_verified: false }))
        }
        setShowEditModal(false)
        alert("Diagnostic center profile updated successfully! Your account status is now Pending Verification.")
      } else {
        setProfileData(data.patient)
        setShowEditModal(false)
        alert("Profile updated successfully!")
      }
    } catch (err) {
      setModalError(err.message)
    } finally {
      setModalLoading(false)
    }
  }

  const handlePwdSubmit = async (e) => {
    e.preventDefault()
    setModalLoading(true)
    setModalError('')

    try {
      const isLab = user.role === 'lab'
      const endpoint = isLab
        ? apiUrl('labs/profile/password')
        : apiUrl('patients/profile/password')

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pwdForm)
      })
      const data = await response.json()

      if (!response.ok) throw new Error(data.error || data.message || 'Failed to update password')

      alert(data.message)
      setShowPwdModal(false)
      
      if (logout) {
        logout()
      } else {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('user')
      }
      navigate('/login')

    } catch (err) {
      setModalError(err.message)
    } finally {
      setModalLoading(false)
    }
  }

  if (loading || authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-slate-50">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-600 font-medium">Loading user profile...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-red-50 text-red-700 rounded-3xl border border-red-100 text-center">
        <h3 className="text-xl font-bold mb-2">Error Loading Profile</h3>
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  const initial = profileData?.name ? profileData.name.charAt(0).toUpperCase() : 'U';

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* PROFILE HEADER CARD */}
        <div className="bg-white p-8 md:p-10 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-3xl flex items-center justify-center shadow-lg">
              {initial}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-extrabold text-slate-900">{profileData?.name}</h1>
                <span className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  {user?.role === 'patient' ? 'Patient Account' : 'Diagnostic Partner'}
                </span>
              </div>
              <p className="text-slate-500 text-sm mt-1">{profileData?.email}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <button 
              onClick={openEditModal}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md transition cursor-pointer"
            >
              Edit Profile
            </button>
            <button 
              onClick={openPwdModal}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition cursor-pointer"
            >
              Change Password
            </button>
          </div>
        </div>

        {/* ACCOUNT DETAILS CARD */}
        <div className="bg-white p-8 md:p-10 rounded-3xl border border-slate-200/80 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-6 pb-4 border-b border-slate-100">
            Account Information
          </h2>

          {profileData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  {user?.role === 'patient' ? 'Full Name' : 'Diagnostic Center Name'}
                </span>
                <span className="text-lg font-bold text-slate-900">{profileData.name}</span>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Email Address</span>
                <span className="text-lg font-bold text-slate-900">{profileData.email}</span>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Phone Number</span>
                <span className="text-lg font-bold text-slate-900">{profileData.phone_number || 'Not provided'}</span>
              </div>

              {user?.role === 'patient' && (
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Member Since</span>
                  <span className="text-lg font-bold text-slate-900">
                    {new Date(profileData.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              )}

              {user?.role === 'lab' && (
                <>
                  <div className="col-span-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Center Address</span>
                    <span className="text-lg font-bold text-slate-900">{profileData.address_text || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Verification Status</span>
                    <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold ${profileData.is_verified ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>
                      {profileData.is_verified ? '✓ Verified Partner' : '⏳ Pending Verification'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Average Rating</span>
                    <span className="text-lg font-bold text-amber-600">⭐ {profileData.average_rating} / 5.0</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

      </div>

      {/* EDIT PROFILE MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-fade-in-up">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">
              {user?.role === 'lab' ? 'Edit Diagnostic Center Profile' : 'Edit Personal Info'}
            </h2>
            
            {user?.role === 'lab' && (
              <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-xl mb-4 mt-2">
                ⚠️ Note: Updating your diagnostic center profile will mark your center status as <strong>Pending Verification</strong> until reviewed.
              </p>
            )}

            {modalError && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-xs font-medium">{modalError}</div>}
            
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Email (Read-Only)</label>
                <input 
                  type="email" 
                  disabled 
                  value={profileData?.email || ''} 
                  className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 text-sm font-medium cursor-not-allowed"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                  {user?.role === 'lab' ? 'Diagnostic Center Name' : 'Full Name'}
                </label>
                <input 
                  type="text" 
                  value={editForm.name} 
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Phone Number</label>
                <input 
                  type="text" 
                  value={editForm.phone_number} 
                  onChange={(e) => setEditForm({...editForm, phone_number: e.target.value})}
                  required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-slate-900"
                />
              </div>

              {user?.role === 'lab' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Center Full Address</label>
                    <textarea 
                      rows="2"
                      value={editForm.address_text} 
                      onChange={(e) => setEditForm({...editForm, address_text: e.target.value})}
                      required
                      placeholder="Street, City, Zipcode..."
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Latitude</label>
                      <input 
                        type="number" 
                        step="any"
                        value={editForm.latitude} 
                        onChange={(e) => setEditForm({...editForm, latitude: e.target.value})}
                        placeholder="e.g. 19.0760"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-medium text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Longitude</label>
                      <input 
                        type="number" 
                        step="any"
                        value={editForm.longitude} 
                        onChange={(e) => setEditForm({...editForm, longitude: e.target.value})}
                        placeholder="e.g. 72.8777"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-medium text-slate-900"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={isLocating}
                    className="w-full py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs border border-blue-200 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>📍</span>
                    <span>{isLocating ? 'Detecting Location...' : 'Auto-Detect Current GPS Coordinates'}</span>
                  </button>
                </>
              )}

              <div className="mt-8 flex gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="submit" 
                  disabled={modalLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition shadow-md disabled:opacity-50 cursor-pointer text-xs"
                >
                  {modalLoading ? 'Saving...' : 'Save Profile Changes'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowEditModal(false)}
                  disabled={modalLoading}
                  className="flex-1 bg-slate-100 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-200 transition cursor-pointer text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHANGE PASSWORD MODAL */}
      {showPwdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-fade-in-up">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Change Password</h2>
            <p className="text-slate-500 text-xs mb-6">You will be required to sign in again after updating your password.</p>
            
            {modalError && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-xs">{modalError}</div>}
            
            <form onSubmit={handlePwdSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Current Password</label>
                <input 
                  type="password" 
                  value={pwdForm.current_password} 
                  onChange={(e) => setPwdForm({...pwdForm, current_password: e.target.value})}
                  required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">New Password</label>
                <input 
                  type="password" 
                  value={pwdForm.new_password} 
                  onChange={(e) => setPwdForm({...pwdForm, new_password: e.target.value})}
                  required
                  placeholder="Min 8 chars, 1 uppercase, 1 symbol"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>

              <div className="mt-8 flex gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="submit" 
                  disabled={modalLoading}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition shadow-md disabled:opacity-50 cursor-pointer text-xs"
                >
                  {modalLoading ? 'Updating...' : 'Update Password'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowPwdModal(false)}
                  disabled={modalLoading}
                  className="flex-1 bg-slate-100 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-200 transition cursor-pointer text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
