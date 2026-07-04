import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
})

function ProfilePage() {
  const { user, token, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [profileData, setProfileData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // If auth is still loading, wait. If no user, redirect to login.
    if (authLoading) return;
    if (!user || !token) {
      navigate({ to: '/login' })
      return;
    }

    const fetchProfile = async () => {
      try {
        // 1. Decide which endpoint to hit based on the user's role
        const endpoint = user.role === 'patient' 
          ? 'http://localhost:5000/api/patients/profile' 
          : 'http://localhost:5000/api/labs/profile';

        // 2. Fetch data using the JWT token
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

        // 3. Set the data (Note: your patient controller returns 'patient', lab returns 'profile')
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
    <div className="max-w-3xl mx-auto mt-10 p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="border-b border-gray-200 pb-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500 mt-1">
          Manage your {user.role === 'patient' ? 'personal' : 'laboratory'} information.
        </p>
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
  )
}