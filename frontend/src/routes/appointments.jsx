import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/appointments')({
  component: MyAppointmentsPage,
})

function MyAppointmentsPage() {
  const navigate = useNavigate()
  
  const [appointments, setAppointments] = useState({ upcoming: [], past: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('upcoming')
  
  // State for the Cancellation Warning Modal
  const [cancelModalData, setCancelModalData] = useState(null)
  const [isCancelling, setIsCancelling] = useState(false)

  // 1. Fetch Appointments on Mount
  useEffect(() => {
    const fetchAppointments = async () => {
      const token = localStorage.getItem('accessToken')
      const userString = localStorage.getItem('user')
      const user = userString ? JSON.parse(userString) : null

      if (!token || user?.role !== 'patient') {
        navigate({ to: '/login', search: { redirect: '/appointments' } })
        return
      }

      try {
        const response = await fetch('http://localhost:5000/api/appointments/my-appointments', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        const result = await response.json()

        if (!response.ok) throw new Error(result.error || 'Failed to fetch appointments')

        setAppointments({
          upcoming: result.upcoming || [],
          past: result.past || []
        })
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAppointments()
  }, [navigate])

  // 2. Check if an appointment is in the past (Date + Time check)
  const canBeCancelled = (dateStr, timeStr) => {
    const now = new Date()
    // Create a Date object combining the appointment date and start time
    // format: YYYY-MM-DDTHH:MM:SS
    const appointmentDateTime = new Date(`${dateStr}T${timeStr}`)
    
    // You can only cancel if the appointment is in the future
    return appointmentDateTime > now
  }

  // 3. Confirm and Execute Cancellation
  const confirmCancel = async () => {
    if (!cancelModalData) return;
    
    setIsCancelling(true)
    const token = localStorage.getItem('accessToken')
    const appointmentId = cancelModalData.appointment_id

    try {
      const response = await fetch(`http://localhost:5000/api/appointments/${appointmentId}/cancel`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const result = await response.json()

      if (!response.ok) throw new Error(result.error || 'Failed to cancel appointment')

      // Move the cancelled appointment from "upcoming" to "past" locally
      setAppointments(prev => {
        const cancelledApp = prev.upcoming.find(a => a.appointment_id === appointmentId)
        if (!cancelledApp) return prev;
        
        cancelledApp.status = 'CANCELLED'
        return {
          upcoming: prev.upcoming.filter(a => a.appointment_id !== appointmentId),
          past: [cancelledApp, ...prev.past]
        }
      })

      setCancelModalData(null) // Close modal
      alert("Appointment cancelled successfully.")
      
    } catch (err) {
      alert(err.message)
    } finally {
      setIsCancelling(false)
    }
  }

  // Helper formatting functions
  const formatDateLabel = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  }

  const formatTime = (timeStr) => {
    const [h, m] = timeStr.split(':')
    const date = new Date()
    date.setHours(h, m)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase">Confirmed</span>
      case 'COMPLETED':
        return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase">Completed</span>
      case 'CANCELLED':
        return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold uppercase">Cancelled</span>
      default:
        return <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-bold uppercase">{status}</span>
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-medium">Loading your appointments...</p>
      </div>
    )
  }

  const currentList = activeTab === 'upcoming' ? appointments.upcoming : appointments.past

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 relative">
      
      {/* ------------------------------------- */}
      {/* CANCELLATION WARNING MODAL            */}
      {/* ------------------------------------- */}
      {cancelModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 px-4 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-sm w-full shadow-2xl animate-fade-in-up text-center">
            
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-2">Cancel Appointment?</h3>
            <p className="text-gray-600 mb-4 text-sm">
              Are you sure you want to cancel your <span className="font-bold">{cancelModalData.test_name}</span> scheduled for <span className="font-bold">{formatDateLabel(cancelModalData.appointment_date)}</span>?
            </p>
            
            <div className="bg-red-50 text-red-700 text-sm font-medium p-3 rounded-lg border border-red-100 mb-6">
              Important: No refund will be provided for cancelled appointments.
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={confirmCancel}
                disabled={isCancelling}
                className="w-full bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition disabled:opacity-50"
              >
                {isCancelling ? 'Cancelling...' : 'Yes, Cancel it'}
              </button>
              <button 
                onClick={() => setCancelModalData(null)}
                disabled={isCancelling}
                className="w-full bg-gray-50 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-100 transition border border-gray-200"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ------------------------------------- */}

      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Appointments</h1>
          <p className="text-gray-500">Manage your upcoming diagnostic tests and view past reports.</p>
        </div>

        {error && (
          <div className="p-4 mb-6 bg-red-50 text-red-700 rounded-xl border border-red-100">
            {error}
          </div>
        )}

        <div className="flex gap-4 border-b border-gray-200 mb-6">
          <button 
            onClick={() => setActiveTab('upcoming')}
            className={`pb-4 px-2 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === 'upcoming' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Upcoming ({appointments.upcoming.length})
          </button>
          <button 
            onClick={() => setActiveTab('past')}
            className={`pb-4 px-2 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === 'past' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Past & Cancelled ({appointments.past.length})
          </button>
        </div>

        {currentList.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-gray-100 shadow-sm text-center">
            <span className="text-4xl block mb-4">🩺</span>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No {activeTab} appointments</h3>
            <p className="text-gray-500 mb-6">You don't have any {activeTab} diagnostic tests scheduled.</p>
            {activeTab === 'upcoming' && (
              <Link to="/search" className="inline-block bg-blue-600 text-white font-medium px-6 py-3 rounded-xl hover:bg-blue-700 transition">
                Book a Test Now
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {currentList.map((app) => (
              <div key={app.appointment_id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col md:flex-row gap-6 justify-between hover:shadow-md transition">
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    {getStatusBadge(app.status)}
                    <span className="text-sm font-medium text-gray-500 font-mono">ID: {app.appointment_id}</span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{app.test_name}</h3>
                  <p className="text-gray-600 font-medium">{app.lab_name}</p>
                  <p className="text-sm text-gray-500 mt-1 flex items-start gap-1">
                    <span>📍</span> {app.address_text}
                  </p>
                </div>

                <div className="flex flex-col md:items-end justify-between md:pl-6 md:border-l border-gray-100 min-w-[200px]">
                  <div className="mb-4 md:mb-0 md:text-right">
                    <p className="text-sm text-gray-500 uppercase font-bold tracking-wider mb-1">Appointment Time</p>
                    <p className="font-bold text-gray-900">{formatDateLabel(app.appointment_date)}</p>
                    <p className="text-blue-600 font-bold">{formatTime(app.start_time)}</p>
                  </div>

                  <div className="mt-4 w-full">
                    {/* ONLY SHOW CANCEL BUTTON IF IT HAS NOT STARTED YET */}
                    {app.status === 'CONFIRMED' && activeTab === 'upcoming' && canBeCancelled(app.appointment_date, app.start_time) && (
                      <button 
                        onClick={() => setCancelModalData(app)}
                        className="w-full py-2.5 px-4 rounded-xl font-medium transition-all bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 hover:border-red-200"
                      >
                        Cancel Appointment
                      </button>
                    )}

                    {app.status === 'COMPLETED' && app.report_url && (
                      <a 
                        href={app.report_url}
                        target="_blank"
                        rel="noreferrer"
                        className="block w-full text-center bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 font-medium py-2.5 px-4 rounded-xl transition-all"
                      >
                        📄 View Report
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}