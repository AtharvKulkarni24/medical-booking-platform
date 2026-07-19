import { useState, useEffect, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'

export default function LabReviews() {
  const navigate = useNavigate()
  
  const [reviews, setReviews] = useState([])
  const [stats, setStats] = useState({ average_rating: 0, total_reviews: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [sortBy, setSortBy] = useState('newest')

  useEffect(() => {
    const fetchReviews = async () => {
      const token = localStorage.getItem('accessToken')
      const userString = localStorage.getItem('user')
      const user = userString ? JSON.parse(userString) : null

      if (!token || user?.role !== 'lab') {
        navigate('/login?redirect=/labs/reviews')
        return
      }

      try {
        const response = await fetch(`http://localhost:5000/api/reviews/lab/${user.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const result = await response.json()

        if (!response.ok) throw new Error(result.error || 'Failed to fetch reviews.')

        setReviews(result.reviews || [])
        setStats({
          average_rating: result.average_rating || 0,
          total_reviews: result.total_reviews || 0
        })
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchReviews()
  }, [navigate])

  const sortedReviews = useMemo(() => {
    const sorted = [...reviews]
    return sorted.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at) - new Date(a.created_at)
      }
      if (sortBy === 'oldest') {
        return new Date(a.created_at) - new Date(b.created_at)
      }
      if (sortBy === 'highest') {
        return b.rating - a.rating || new Date(b.created_at) - new Date(a.created_at)
      }
      if (sortBy === 'lowest') {
        return a.rating - b.rating || new Date(b.created_at) - new Date(a.created_at)
      }
      return 0
    })
  }, [reviews, sortBy])

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-slate-50">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-600 font-medium">Loading patient feedback...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row relative">
      <div className="flex-1 p-6 md:p-10 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-8">
          
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                Patient Feedback
              </span>
              <h1 className="text-3xl font-extrabold text-slate-900 mt-2">Lab Ratings & Reviews</h1>
              <p className="text-slate-500 text-sm mt-1">Review ratings submitted by verified patients after test visits.</p>
            </div>

            {stats.total_reviews > 0 && (
              <div className="bg-slate-50 px-5 py-3 rounded-2xl border border-slate-200 flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-2xl font-extrabold text-slate-900">
                  <span className="text-amber-400">★</span>
                  <span>{stats.average_rating}</span>
                </div>
                <div className="border-l border-slate-200 pl-4">
                  <span className="text-xs font-bold text-slate-500 block">Based on {stats.total_reviews} Review{stats.total_reviews !== 1 ? 's' : ''}</span>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100 text-sm">
              {error}
            </div>
          )}

          {reviews.length === 0 ? (
            <div className="bg-white p-12 sm:p-16 rounded-3xl border border-slate-200/80 shadow-sm text-center max-w-md mx-auto">
              <span className="text-5xl block mb-4">⭐</span>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No Reviews Received</h3>
              <p className="text-slate-500 text-sm">Patient ratings and feedback will appear here as appointments are completed.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-end">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sort by:</label>
                  <select 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-white border border-slate-300 text-slate-900 text-xs font-semibold rounded-xl p-2.5 outline-none shadow-sm cursor-pointer"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="highest">Highest Rating</option>
                    <option value="lowest">Lowest Rating</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sortedReviews.map(review => (
                  <div key={review.review_id} className="glass-card hover-lift p-6 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold flex items-center justify-center text-sm shadow-md">
                            {review.patient_name ? review.patient_name.charAt(0).toUpperCase() : 'P'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{review.patient_name}</p>
                            <p className="text-[11px] font-semibold text-slate-400">{formatDate(review.created_at)}</p>
                          </div>
                        </div>

                        <span className="text-amber-400 text-lg">
                          {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                        </span>
                      </div>

                      <div className="bg-slate-50/90 p-4 rounded-2xl border border-slate-100 mb-2">
                        <p className="text-slate-700 text-xs leading-relaxed italic">
                          "{review.comment || 'No written feedback provided.'}"
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* SIDEBAR */}
      <aside className="w-full md:w-72 bg-white border-l border-slate-200/90 p-6 flex flex-col justify-between shadow-sm shrink-0">
        <div>
          <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-6 px-3">Lab Control Center</h2>
          <nav className="flex flex-col gap-2">
            <Link to="/labs" className="flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition">
              <span>📊</span> Dashboard Overview
            </Link>
            <Link to="/labs/tests" className="flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition">
              <span>🧪</span> Manage Tests
            </Link>
            <Link to="/labs/slots" className="flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition">
              <span>🕒</span> Time Slots
            </Link>
            <Link to="/labs/reviews" className="flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-xs bg-blue-50 text-blue-700 transition">
              <span>⭐</span> Patient Reviews
            </Link>
          </nav>
        </div>
      </aside>

    </div>
  )
}
