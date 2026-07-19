import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'

export default function LabDashboard() {
  const navigate = useNavigate()
  
  const [stats, setStats] = useState({
    total_tests: 0,
    average_rating: "0.0",
    completed_appointments: 0,
    upcoming_bookings: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchDashboardStats = async () => {
      const token = localStorage.getItem('accessToken')
      const userString = localStorage.getItem('user')
      const user = userString ? JSON.parse(userString) : null

      if (!token || user?.role !== 'lab') {
        navigate('/login?redirect=/labs')
        return
      }

      try {
        const response = await fetch('http://localhost:5000/api/labs/dashboard-stats', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        const result = await response.json()

        if (!response.ok) throw new Error(result.error || 'Failed to fetch dashboard statistics.')

        setStats(result.data)
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardStats()
  }, [navigate])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-600 font-medium">Loading lab dashboard...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <div className="flex-1 p-6 md:p-10">
        <div className="max-w-5xl mx-auto space-y-8">
          
          {/* HEADER */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                Partner Portal
              </span>
              <h1 className="text-3xl font-extrabold text-slate-900 mt-2">Diagnostic Center Dashboard</h1>
              <p className="text-slate-500 text-sm mt-1">Real-time stats, appointment bookings, and test catalog overview.</p>
            </div>
            
            <Link
              to="/labs/tests"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-5 py-3 rounded-xl shadow-md transition"
            >
              + Add Diagnostic Test
            </Link>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100 text-sm">
              {error}
            </div>
          )}

          {/* STATS COUNTER GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="glass-card hover-lift p-6 rounded-3xl border border-slate-200/90 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <span className="text-3xl p-3 bg-blue-50 rounded-2xl">🧪</span>
                <span className="text-xs font-extrabold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">Catalog</span>
              </div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Available Tests</p>
              <p className="text-3xl font-extrabold text-slate-900">{stats.total_tests}</p>
            </div>

            <div className="glass-card hover-lift p-6 rounded-3xl border border-slate-200/90 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <span className="text-3xl p-3 bg-indigo-50 rounded-2xl">📅</span>
                <span className="text-xs font-extrabold text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-full">Active</span>
              </div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Upcoming Bookings</p>
              <p className="text-3xl font-extrabold text-slate-900">{stats.upcoming_bookings}</p>
            </div>

            <div className="glass-card hover-lift p-6 rounded-3xl border border-slate-200/90 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <span className="text-3xl p-3 bg-green-50 rounded-2xl">✅</span>
                <span className="text-xs font-extrabold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">Completed</span>
              </div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Completed Tests</p>
              <p className="text-3xl font-extrabold text-slate-900">{stats.completed_appointments}</p>
            </div>

            <div className="glass-card hover-lift p-6 rounded-3xl border border-slate-200/90 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <span className="text-3xl p-3 bg-amber-50 rounded-2xl">⭐</span>
                <span className="text-xs font-extrabold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">Rating</span>
              </div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Average Rating</p>
              <p className="text-3xl font-extrabold text-slate-900">{stats.average_rating}<span className="text-sm text-slate-400 font-bold"> / 5.0</span></p>
            </div>

          </div>

          {/* QUICK SHORTCUT CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link to="/labs/tests" className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition group">
              <div className="text-3xl mb-3">🧪</div>
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition mb-1">Manage Diagnostic Catalog</h3>
              <p className="text-slate-500 text-xs leading-relaxed">Add new blood, sonography, or screening tests with prices.</p>
            </Link>

            <Link to="/labs/slots" className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition group">
              <div className="text-3xl mb-3">🕒</div>
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition mb-1">Weekly Time Slots</h3>
              <p className="text-slate-500 text-xs leading-relaxed">Set daily time schedules and sample capacity limits.</p>
            </Link>

            <Link to="/labs/reviews" className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition group">
              <div className="text-3xl mb-3">⭐</div>
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition mb-1">Patient Reviews</h3>
              <p className="text-slate-500 text-xs leading-relaxed">View ratings and comments submitted by verified patients.</p>
            </Link>
          </div>
          
        </div>
      </div>

      {/* LAB SIDEBAR */}
      <aside className="w-full md:w-72 bg-white border-l border-slate-200/90 p-6 flex flex-col justify-between shadow-sm">
        <div>
          <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-6 px-3">Lab Control Center</h2>
          
          <nav className="flex flex-col gap-2">
            <Link 
              to="/labs" 
              className="flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-xs bg-blue-50 text-blue-700 transition"
            >
              <span>📊</span> Dashboard Overview
            </Link>
            
            <Link 
              to="/labs/tests" 
              className="flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
            >
              <span>🧪</span> Manage Tests
            </Link>

            <Link 
              to="/labs/slots" 
              className="flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
            >
              <span>🕒</span> Time Slots
            </Link>

            <Link 
              to="/labs/reviews" 
              className="flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
            >
              <span>⭐</span> Patient Reviews
            </Link>
          </nav>
        </div>

        <div className="pt-8 border-t border-slate-100 mt-8">
          <Link 
            to="/profile" 
            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-2xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition"
          >
            <span>⚙️</span> Lab Profile Settings
          </Link>
        </div>
      </aside>

    </div>
  )
}
