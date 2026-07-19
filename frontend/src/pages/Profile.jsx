import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

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

  // Form States
  const [editForm, setEditForm] = useState({ name: '', phone_number: '' })
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
          ? 'http://localhost:5000/api/patients/profile' 
          : 'http://localhost:5000/api/labs/profile';

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
      phone_number: profileData?.phone_number || '' 
    })
    setModalError('')
    setShowEditModal(true)
  }

  const openPwdModal = () => {
    setPwdForm({ current_password: '', new_password: '' })
    setModalError('')
    setShowPwdModal(true)
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setModalLoading(true)
    setModalError('')

    try {
      const response = await fetch('http://localhost:5000/api/patients/profile', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      })
      const data = await response.json()

      if (!response.ok) throw new Error(data.error || 'Failed to update profile')

      setProfileData(data.patient)
      setShowEditModal(false)
      alert("Profile updated successfully!")
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
      const response = await fetch('http://localhost:5000/api/patients/profile/password', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pwdForm)
      })
      const data = await response.json()

      if (!response.ok) throw new Error(data.error || 'Failed to update password')

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

          {user?.role === 'patient' && (
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
          )}
        </div>

        {/* ACCOUNT DETAILS CARD */}
        <div className="bg-white p-8 md:p-10 rounded-3xl border border-slate-200/80 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-6 pb-4 border-b border-slate-100">
            Account Information
          </h2>

          {profileData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Full Name</span>
                <span className="text-lg font-bold text-slate-900">{profileData.name}</span>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Email Address</span>
                <span className="text-lg font-bold text-slate-900">{profileData.email}</span>
              </div>

              {user?.role === 'patient' && (
                <>
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Phone Number</span>
                    <span className="text-lg font-bold text-slate-900">{profileData.phone_number || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Member Since</span>
                    <span className="text-lg font-bold text-slate-900">
                      {new Date(profileData.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </>
              )}

              {user?.role === 'lab' && (
                <>
                  <div className="col-span-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Address</span>
                    <span className="text-lg font-bold text-slate-900">{profileData.address_text || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Verification</span>
                    <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold ${profileData.is_verified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {profileData.is_verified ? '✓ Verified Partner' : 'Pending Verification'}
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
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-fade-in-up">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Edit Personal Info</h2>
            
            {modalError && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-xs">{modalError}</div>}
            
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
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Full Name</label>
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

              <div className="mt-8 flex gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="submit" 
                  disabled={modalLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition shadow-md disabled:opacity-50 cursor-pointer text-xs"
                >
                  {modalLoading ? 'Saving...' : 'Save Changes'}
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
