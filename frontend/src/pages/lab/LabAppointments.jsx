import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function LabAppointments() {
  const navigate = useNavigate()
  const { labId } = useParams()
  const { user, token, loading: authLoading } = useAuth()
  
  const [appointments, setAppointments] = useState({ today: [], upcoming: [], past: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('today')
  
  const [completeModalData, setCompleteModalData] = useState(null)
  const [reportUrl, setReportUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/login', { replace: true })
      } else {
        const loggedInLabId = user.id || user.lab_id
        const role = user.userType || user.role
        
        if (role !== 'lab' || String(loggedInLabId) !== String(labId)) {
          navigate('/', { replace: true })
        }
      }
    }
  }, [user, authLoading, labId, navigate])

  const fetchLabAppointments = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`http://localhost:5000/api/labs/${labId}/appointments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const result = await response.json()

      if (!response.ok) throw new Error(result.error || 'Failed to fetch appointments.')

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
    if (user && role === 'lab' && labId) {
      fetchLabAppointments()
    }
  }, [user, labId])

  const handleCompleteAppointment = async (e) => {
    e.preventDefault()
    if (!completeModalData) return;
    
    setIsSubmitting(true)
    try {
      const response = await fetch(`http://localhost:5000/api/labs/appointments/${completeModalData.id}/complete`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ report_url: reportUrl })
      })
      
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to complete appointment.')

      await fetchLabAppointments()
      setCompleteModalData(null)
      setReportUrl('')
      
    } catch (err) {
      alert(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':')
    const date = new Date()
    date.setHours(h, m)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-slate-50">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-600 font-medium">Loading lab appointments...</p>
      </div>
    )
  }

  const currentList = appointments[activeTab] || []

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 relative">
      
      {/* MARK COMPLETE & REPORT UPLOAD MODAL */}
      {completeModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-fade-in-up">
            <h3 className="text-2xl font-bold text-slate-900 mb-1">Complete Appointment</h3>
            <p className="text-slate-500 text-xs mb-6">
              Mark test as completed for <span className="font-bold text-slate-900">{completeModalData.patient_name}</span>.
            </p>
            
            <form onSubmit={handleCompleteAppointment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Digital Report URL (Optional)</label>
                <input 
                  type="url" 
                  value={reportUrl}
                  onChange={(e) => setReportUrl(e.target.value)}
                  placeholder="https://drive.google.com/your-file-link"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">Paste a secure link to the patient's test results.</p>
              </div>

              <div className="flex flex-col gap-2.5 pt-4 border-t border-slate-100">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition shadow-md disabled:opacity-50 cursor-pointer text-xs"
                >
                  {isSubmitting ? 'Saving...' : '✓ Complete & Attach Report'}
                </button>
                <button 
                  type="button" 
                  onClick={() => { setCompleteModalData(null); setReportUrl(''); }} 
                  disabled={isSubmitting}
                  className="w-full bg-slate-100 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-200 transition cursor-pointer text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAGE CONTAINER */}
      <div className="max-w-6xl mx-auto">
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
              Roster & Schedule
            </span>
            <h1 className="text-3xl font-extrabold text-slate-900 mt-2">Daily Roster & Schedule</h1>
            <p className="text-slate-500 text-sm mt-1">Track patient test visits, process completions, and upload digital reports.</p>
          </div>

          <Link
            to="/labs"
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {error && (
          <div className="p-4 mb-6 bg-red-50 text-red-700 rounded-2xl border border-red-100 text-sm">
            {error}
          </div>
        )}

        {/* TABS */}
        <div className="flex border-b border-slate-200 mb-8 gap-8">
          {['today', 'upcoming', 'past'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 font-bold text-sm sm:text-base capitalize transition cursor-pointer flex items-center gap-2 relative ${
                activeTab === tab ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <span>{tab} Roster</span>
              <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full text-xs font-bold">{appointments[tab]?.length || 0}</span>
            </button>
          ))}
        </div>

        {/* LIST */}
        {currentList.length === 0 ? (
          <div className="bg-white p-12 sm:p-16 rounded-3xl border border-slate-200/80 shadow-sm text-center max-w-md mx-auto">
            <span className="text-5xl block mb-4">🩺</span>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No {activeTab} Appointments</h3>
            <p className="text-slate-500 text-sm">Your diagnostic schedule is clear for this timeframe.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {currentList.map((app) => {
              const isOverdue = activeTab === 'past' && app.status === 'CONFIRMED';

              return (
                <div key={app.id} className="glass-card hover-lift p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm">
                  
                  {isOverdue && (
                    <div className="bg-red-50 text-red-700 px-4 py-2 rounded-xl text-xs font-bold border border-red-100 mb-4 flex items-center gap-2">
                      <span>⚠️</span> Overdue: Scheduled visit date has passed.
                    </div>
                  )}

                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-0.5 rounded-full text-xs font-bold uppercase ${
                          app.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 
                          app.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {app.status}
                        </span>
                        <span className="text-xs font-bold text-slate-400 font-mono">#APP-{String(app.id).substring(0, 8)}</span>
                      </div>
                      
                      <h3 className="text-2xl font-extrabold text-slate-900">{app.test_name}</h3>
                      
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 max-w-lg">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Patient Info</p>
                        <p className="text-slate-900 font-bold text-sm">{app.patient_name}</p>
                        <p className="text-slate-500 text-xs mt-1 flex flex-wrap gap-4 font-medium">
                          <span>📞 {app.patient_phone}</span>
                          <span>✉️ {app.patient_email}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col md:items-end justify-between w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-slate-100 gap-4">
                      <div className="text-left md:text-right">
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Scheduled Slot</span>
                        <span className="font-bold text-slate-900 text-sm">
                          {new Date(app.appointment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span className="block text-blue-600 font-extrabold text-base">
                          {formatTime(app.start_time)}
                        </span>
                      </div>

                      <div className="w-full md:w-auto">
                        {app.status === 'CONFIRMED' && activeTab === 'today' && (
                          <button 
                            onClick={() => setCompleteModalData(app)}
                            className="w-full md:w-auto py-2.5 px-6 rounded-xl font-bold text-xs bg-green-600 hover:bg-green-700 text-white shadow-md transition cursor-pointer"
                          >
                            ✓ Mark Completed
                          </button>
                        )}

                        {app.status === 'CONFIRMED' && activeTab === 'upcoming' && (
                          <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-4 py-2 rounded-xl block text-center">
                            🔒 Unlocks on Appt Day
                          </span>
                        )}

                        {app.status === 'COMPLETED' && app.report_url && (
                          <a 
                            href={app.report_url}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full md:w-auto text-center bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs py-2.5 px-5 rounded-xl border border-blue-100 transition block"
                          >
                            📄 View Attached Report
                          </a>
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
