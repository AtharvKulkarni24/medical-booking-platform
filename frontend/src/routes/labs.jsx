import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/labs')({
  component: LabDashboard,
})

function LabDashboard() {
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

      // Redirect if not a logged-in Lab
      if (!token || user?.role !== 'lab') {
        navigate({ to: '/login', search: { redirect: '/labs' } })
        return
      }

      try {
        const response = await fetch('http://localhost:5000/api/labs/dashboard-stats', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        const result = await response.json()

        if (!response.ok) throw new Error(result.error || 'Failed to fetch dashboard statistics')

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
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-medium">Loading your dashboard...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      
      {/* MAIN CONTENT AREA (Left Side) */}
      <div className="flex-1 p-6 md:p-10">
        <div className="max-w-5xl mx-auto">
          
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Lab Dashboard</h1>
            <p className="text-gray-500">Welcome back! Here is an overview of your diagnostic center.</p>
          </div>

          {error && (
            <div className="p-4 mb-6 bg-red-50 text-red-700 rounded-xl border border-red-100">
              {error}
            </div>
          )}

          {/* METRICS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
            
            {/* Metric 1: Tests Available */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-5 hover:shadow-md transition">
              <div className="h-14 w-14 rounded-full bg-blue-50 flex items-center justify-center text-2xl">
                🧪
              </div>
              <div>
                <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-1">Available Tests</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total_tests}</p>
              </div>
            </div>

            {/* Metric 2: Upcoming Bookings */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-5 hover:shadow-md transition">
              <div className="h-14 w-14 rounded-full bg-indigo-50 flex items-center justify-center text-2xl">
                📅
              </div>
              <div>
                <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-1">Upcoming Bookings</p>
                <p className="text-3xl font-bold text-gray-900">{stats.upcoming_bookings}</p>
              </div>
            </div>

            {/* Metric 3: Completed Appointments */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-5 hover:shadow-md transition">
              <div className="h-14 w-14 rounded-full bg-green-50 flex items-center justify-center text-2xl">
                ✅
              </div>
              <div>
                <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-1">Completed Tests</p>
                <p className="text-3xl font-bold text-gray-900">{stats.completed_appointments}</p>
              </div>
            </div>

            {/* Metric 4: Average Rating */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-5 hover:shadow-md transition">
              <div className="h-14 w-14 rounded-full bg-yellow-50 flex items-center justify-center text-2xl">
                ⭐
              </div>
              <div>
                <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-1">Average Rating</p>
                <p className="text-3xl font-bold text-gray-900">{stats.average_rating}<span className="text-lg text-gray-400 font-medium"> / 5</span></p>
              </div>
            </div>

          </div>
          
        </div>
      </div>

      {/* RIGHT SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-72 bg-white border-l border-gray-200 p-6 flex flex-col min-h-full shadow-sm">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 px-3">Lab Menu</h2>
        
        <nav className="flex flex-col gap-2">
          <Link 
            to="/labs" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium bg-blue-50 text-blue-700 transition"
          >
            <span className="text-lg">📊</span> Dashboard
          </Link>
          
          <Link 
            to="/labs/tests" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition"
          >
            <span className="text-lg">🧪</span> Manage Tests
          </Link>

          <Link 
            to="/labs/slots" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition"
          >
            <span className="text-lg">🕒</span> Time Slots
          </Link>

          <Link 
            to="/labs/reviews" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition"
          >
            <span className="text-lg">⭐</span> Patient Reviews
          </Link>
        </nav>

        <div className="mt-auto pt-8">
          <Link 
            to="/profile" 
            className="block w-full text-center px-4 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition"
          >
            ⚙️ Lab Settings
          </Link>
        </div>
      </aside>

    </div>
  )
}