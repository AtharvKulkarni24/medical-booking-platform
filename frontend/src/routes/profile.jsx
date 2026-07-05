import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
})

function ProfilePage() {
  const { user, token, loading: authLoading, logout } = useAuth() // Assuming logout is available in AuthContext
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
      navigate({ to: '/login' })
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

  // --- HANDLERS FOR MODALS ---

  const openEditModal = () => {
    setEditForm({ 
      name: profileData.name || '', 
      phone_number: profileData.phone_number || '' 
    })
    setModalError('')
    setShowEditModal(true)
  }

  const openPwdModal = () => {
    setPwdForm({ current_password: '', new_password: '' })
    setModalError('')
    setShowPwdModal(true)
  }

  // --- SUBMIT HANDLERS ---

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

      // Update local state so UI updates instantly
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

      alert(data.message) // Shows the success message asking them to re-login
      setShowPwdModal(false)
      
      // Force logout and redirect
      if (logout) {
        logout()
      } else {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('user')
      }
      navigate({ to: '/login' })

    } catch (err) {
      setModalError(err.message)
    } finally {
      setModalLoading(false)
    }
  }

  if (loading || authLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto mt-10 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        Error: {error}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
        
        <div className="border-b border-gray-200 pb-4 mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
            <p className="text-gray-500 mt-1">
              Manage your {user.role === 'patient' ? 'personal' : 'laboratory'} information.
            </p>
          </div>
          
          {/* Action Buttons - Only visible to patients for now based on backend routes */}
          {user.role === 'patient' && (
            <div className="flex gap-2">
              <button 
                onClick={openEditModal}
                className="px-4 py-2 bg-blue-50 text-blue-700 font-medium rounded-lg hover:bg-blue-100 transition"
              >
                Edit Profile
              </button>
              <button 
                onClick={openPwdModal}
                className="px-4 py-2 bg-gray-50 text-gray-700 font-medium rounded-lg border border-gray-200 hover:bg-gray-100 transition"
              >
                Change Password
              </button>
            </div>
          )}
        </div>

        {profileData && (
          <div className="space-y-6">
            {/* --- SHARED FIELDS --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500">Name</label>
                <div className="mt-1 text-lg text-gray-900 font-medium">{profileData.name}</div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500">Email</label>
                <div className="mt-1 text-lg text-gray-900">{profileData.email}</div>
              </div>
            </div>

            {/* --- PATIENT ONLY FIELDS --- */}
            {user.role === 'patient' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Phone Number</label>
                  <div className="mt-1 text-lg text-gray-900">{profileData.phone_number || 'Not provided'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Account Created</label>
                  <div className="mt-1 text-lg text-gray-900">
                    {new Date(profileData.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            )}

            {/* --- LAB ONLY FIELDS --- */}
            {user.role === 'lab' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Address</label>
                  <div className="mt-1 text-lg text-gray-900">{profileData.address_text || 'Not provided'}</div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Verification Status</label>
                    <div className="mt-1">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${profileData.is_verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {profileData.is_verified ? 'Verified' : 'Pending Verification'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Rating</label>
                    <div className="mt-1 text-lg text-gray-900">{profileData.average_rating} / 5.0</div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ------------------------------------- */}
      {/* EDIT PROFILE MODAL                    */}
      {/* ------------------------------------- */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Edit Profile</h2>
            
            {modalError && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{modalError}</div>}
            
            <form onSubmit={handleEditSubmit}>
              <div className="space-y-4">
                {/* Disabled Email Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email (Cannot be changed)</label>
                  <input 
                    type="email" 
                    disabled 
                    value={profileData?.email} 
                    className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input 
                    type="text" 
                    value={editForm.name} 
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input 
                    type="text" 
                    value={editForm.phone_number} 
                    onChange={(e) => setEditForm({...editForm, phone_number: e.target.value})}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button 
                  type="submit" 
                  disabled={modalLoading}
                  className="flex-1 bg-blue-600 text-white font-medium py-2.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {modalLoading ? 'Saving...' : 'Save Changes'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowEditModal(false)}
                  disabled={modalLoading}
                  className="flex-1 bg-gray-100 text-gray-700 font-medium py-2.5 rounded-lg hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------- */}
      {/* CHANGE PASSWORD MODAL                 */}
      {/* ------------------------------------- */}
      {showPwdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Change Password</h2>
            <p className="text-gray-500 text-sm mb-6">You will be logged out after changing your password.</p>
            
            {modalError && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{modalError}</div>}
            
            <form onSubmit={handlePwdSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                  <input 
                    type="password" 
                    value={pwdForm.current_password} 
                    onChange={(e) => setPwdForm({...pwdForm, current_password: e.target.value})}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input 
                    type="password" 
                    value={pwdForm.new_password} 
                    onChange={(e) => setPwdForm({...pwdForm, new_password: e.target.value})}
                    required
                    placeholder="Min 8 chars, 1 uppercase, 1 symbol"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button 
                  type="submit" 
                  disabled={modalLoading}
                  className="flex-1 bg-red-600 text-white font-medium py-2.5 rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                >
                  {modalLoading ? 'Updating...' : 'Update Password'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowPwdModal(false)}
                  disabled={modalLoading}
                  className="flex-1 bg-gray-100 text-gray-700 font-medium py-2.5 rounded-lg hover:bg-gray-200 transition"
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