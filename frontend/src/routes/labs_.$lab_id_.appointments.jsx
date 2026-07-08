import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext' // Verify this path matches your project structure

export const Route = createFileRoute('/labs_/$lab_id_/appointments')({
  component: LabAppointmentsPage,
})

function LabAppointmentsPage() {
  const navigate = useNavigate()
  
  // Extract dynamic lab_id from the URL
  const { lab_id } = Route.useParams()
  const { user, token, loading: authLoading } = useAuth()
  
  const [appointments, setAppointments] = useState({ today: [], upcoming: [], past: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('today') // Default to today's schedule
  
  // Modal State
  const [completeModalData, setCompleteModalData] = useState(null)
  const [reportUrl, setReportUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Security Redirect: Ensure only the correct lab can view this page
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate({ to: '/login', replace: true })
      } else {
        const loggedInLabId = user.id || user.lab_id
        const role = user.userType || user.role
        
        if (role !== 'lab' || String(loggedInLabId) !== String(lab_id)) {
          navigate({ to: '/', replace: true })
        }
      }
    }
  }, [user, authLoading, lab_id, navigate])

  // Fetch Appointments
  const fetchLabAppointments = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`http://localhost:5000/api/labs/${lab_id}/appointments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const result = await response.json()

      if (!response.ok) throw new Error(result.error || 'Failed to fetch appointments')

      setAppointments({
        today: result.today || [],
        upcoming: result.upcoming || [],
        past: result.past || [] 
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const role = user?.userType || user?.role
    if (user && role === 'lab') {
      fetchLabAppointments()
    }
  }, [user, lab_id])

  // Mark as Completed Handler
  const handleCompleteAppointment = async (e) => {
    e.preventDefault()
    if (!completeModalData) return;
    
    setIsSubmitting(true)
    try {
      // NOTE: Make sure this URL matches your labRoutes mapping
      const response = await fetch(`http://localhost:5000/api/labs/appointments/${completeModalData.id}/complete`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ report_url: reportUrl })
      })
      
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to complete appointment')

      // Refresh data and close modal on success
      await fetchLabAppointments()
      setCompleteModalData(null)
      setReportUrl('')
      
    } catch (err) {
      alert(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Helper to format time (e.g., '14:30:00' -> '2:30 PM')
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':')
    const date = new Date()
    date.setHours(h, m)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-medium">Loading lab schedule...</p>
      </div>
    )
  }

  const currentList = appointments[activeTab] || []

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 relative">
      
      {/* Complete Appointment Modal */}
      {completeModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 px-4 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl animate-fade-in-up">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Complete Appointment</h3>
            <p className="text-gray-600 mb-6 text-sm">
              Marking this test as completed for <span className="font-bold">{completeModalData.patient_name}</span>.
            </p>
            
            <form onSubmit={handleCompleteAppointment} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Report URL (Optional)</label>
                <input 
                  type="url" 
                  value={reportUrl}
                  onChange={(e) => setReportUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
                <p className="text-xs text-gray-500 mt-2">Paste a secure link to the patient's test results.</p>
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Mark as Completed'}
                </button>
                <button 
                  type="button" 
                  onClick={() => { setCompleteModalData(null); setReportUrl(''); }} 
                  disabled={isSubmitting}
                  className="w-full bg-gray-50 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-100 transition border border-gray-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Appointment Schedule</h1>
          <p className="text-gray-500">Manage today's tests, view upcoming slots, and track past records.</p>
        </div>

        {error && (
          <div className="p-4 mb-6 bg-red-50 text-red-700 rounded-xl border border-red-100">
            {error}
          </div>
        )}

        {/* 3-Tab Navigation */}
        <div className="flex flex-wrap gap-4 border-b border-gray-200 mb-6">
          {['today', 'upcoming', 'past'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 px-2 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${
                activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab} ({appointments[tab]?.length || 0})
            </button>
          ))}
        </div>

        {currentList.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-gray-100 shadow-sm text-center">
            <span className="text-4xl block mb-4">🩺</span>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No {activeTab} appointments</h3>
            <p className="text-gray-500">Your schedule is clear for this section.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {currentList.map((app) => {
              // LOGIC: Flag if it's in the past tab but still CONFIRMED (Missed/No-Show)
              const isOverdue = activeTab === 'past' && app.status === 'CONFIRMED';

              return (
                <div key={app.id} className={`bg-white rounded-2xl border ${isOverdue ? 'border-red-300 shadow-red-50' : 'border-gray-200'} shadow-sm overflow-hidden hover:shadow-md transition`}>
                  
                  {isOverdue && (
                    <div className="bg-red-50 text-red-700 px-6 py-3 text-sm font-bold border-b border-red-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">⚠️</span> 
                        NO-SHOW / OVERDUE: This appointment missed its scheduled date.
                      </div>
                    </div>
                  )}

                  <div className="p-6 flex flex-col md:flex-row gap-6 justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          app.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 
                          app.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {app.status}
                        </span>
                        <span className="text-sm font-medium text-gray-500 font-mono">ID: {app.id.substring(0, 8)}...</span>
                      </div>
                      
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{app.test_name}</h3>
                      
                      <div className="bg-gray-50 p-4 rounded-xl mt-4 border border-gray-100">
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Patient Details</p>
                        <p className="text-gray-900 font-medium">{app.patient_name}</p>
                        <p className="text-gray-600 text-sm mt-1 flex flex-col sm:flex-row sm:gap-4">
                          <span>📞 {app.patient_phone}</span>
                          <span>✉️ {app.patient_email}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col md:items-end justify-between md:pl-6 md:border-l border-gray-100 min-w-[200px]">
                      <div className="mb-4 md:mb-0 md:text-right">
                        <p className="text-sm text-gray-500 uppercase font-bold tracking-wider mb-1">Schedule</p>
                        <p className="font-bold text-gray-900">
                          {new Date(app.appointment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        <p className={`${isOverdue ? 'text-red-600' : 'text-blue-600'} font-bold text-lg`}>
                          {formatTime(app.start_time)}
                        </p>
                      </div>

                      <div className="mt-4 w-full flex flex-col gap-2">
                        {/* 1. TODAY: Show the active button */}
                        {app.status === 'CONFIRMED' && activeTab === 'today' && (
                          <button 
                            onClick={() => setCompleteModalData(app)}
                            className="w-full py-2.5 px-4 rounded-xl font-medium transition-all bg-green-600 text-white hover:bg-green-700 shadow-sm"
                          >
                            Mark Completed
                          </button>
                        )}

                        {/* 2. UPCOMING: Show a locked message */}
                        {app.status === 'CONFIRMED' && activeTab === 'upcoming' && (
                          <div className="w-full py-2.5 px-4 rounded-xl font-medium text-center bg-gray-50 text-gray-500 border border-gray-200 text-sm">
                            🔒 Unlocks on appt day
                          </div>
                        )}

                        {/* 3. PAST (Overdue): Show an expired message */}
                        {app.status === 'CONFIRMED' && activeTab === 'past' && (
                          <div className="w-full py-2.5 px-4 rounded-xl font-bold text-center bg-red-50 text-red-600 border border-red-200 text-sm">
                            ❌ Expired
                          </div>
                        )}

                        {/* 4. COMPLETED: Show the report link (if exists) or a generic completed badge */}
                        {app.status === 'COMPLETED' && (
                          app.report_url ? (
                            <a 
                              href={app.report_url}
                              target="_blank"
                              rel="noreferrer"
                              className="block w-full text-center bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-medium py-2.5 px-4 rounded-xl transition-all text-sm"
                            >
                              📄 View Uploaded Report
                            </a>
                          ) : (
                            <div className="w-full py-2.5 px-4 rounded-xl font-medium text-center bg-gray-50 text-gray-500 border border-gray-200 text-sm">
                              Completed (No Report)
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}