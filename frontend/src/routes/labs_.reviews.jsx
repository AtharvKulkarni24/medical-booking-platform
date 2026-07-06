import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState, useEffect, useMemo } from 'react'

export const Route = createFileRoute('/labs_/reviews')({
  component: LabReviewsPage,
})

function LabReviewsPage() {
  const navigate = useNavigate()
  
  const [reviews, setReviews] = useState([])
  const [stats, setStats] = useState({ average_rating: 0, total_reviews: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Sorting state
  const [sortBy, setSortBy] = useState('newest') // 'newest', 'oldest', 'highest', 'lowest'

  // Fetch Reviews on Mount
  useEffect(() => {
    const fetchReviews = async () => {
      const token = localStorage.getItem('accessToken')
      const userString = localStorage.getItem('user')
      const user = userString ? JSON.parse(userString) : null

      if (!token || user?.role !== 'lab') {
        navigate({ to: '/login', search: { redirect: '/labs/reviews' } })
        return
      }

      try {
        // We use the public lab reviews route, passing the logged-in lab's ID
        const response = await fetch(`http://localhost:5000/api/reviews/lab/${user.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const result = await response.json()

        if (!response.ok) throw new Error(result.error || 'Failed to fetch reviews')

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

  // --- SORTING LOGIC ---
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
        return b.rating - a.rating || new Date(b.created_at) - new Date(a.created_at) // break tie with newest
      }
      if (sortBy === 'lowest') {
        return a.rating - b.rating || new Date(b.created_at) - new Date(a.created_at) // break tie with newest
      }
      return 0
    })
  }, [reviews, sortBy])

  // --- HELPERS ---
  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const renderStars = (rating) => {
    return Array.from({ length: 5 }).map((_, index) => (
      <span key={index} className={`text-xl ${index < rating ? 'text-yellow-400' : 'text-gray-300'}`}>
        ★
      </span>
    ))
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-medium">Loading patient reviews...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row relative">
      
      {/* MAIN CONTENT AREA */}
      <div className="flex-1 p-6 md:p-10 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          
          <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-gray-200 pb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Patient Reviews</h1>
              <p className="text-gray-500">See what patients are saying about their experience at your lab.</p>
            </div>

            {/* Overview Badge */}
            {stats.total_reviews > 0 && (
              <div className="bg-white px-5 py-3 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
                <div className="flex items-center gap-1 text-2xl">
                  <span className="text-yellow-400">★</span>
                  <span className="font-bold text-gray-900">{stats.average_rating}</span>
                </div>
                <div className="border-l border-gray-200 pl-4">
                  <span className="text-sm text-gray-500 font-medium">Based on {stats.total_reviews} review{stats.total_reviews !== 1 ? 's' : ''}</span>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="p-4 mb-6 bg-red-50 text-red-700 rounded-xl border border-red-100">
              {error}
            </div>
          )}

          {reviews.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-gray-100 shadow-sm text-center">
              <span className="text-4xl block mb-4">⭐</span>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No reviews yet</h3>
              <p className="text-gray-500 mb-6">Once patients complete their appointments and leave feedback, it will appear here.</p>
            </div>
          ) : (
            <>
              {/* SORTING CONTROLS */}
              <div className="flex justify-end mb-6">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-600">Sort by:</label>
                  <select 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 outline-none shadow-sm cursor-pointer"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="highest">Highest Rating</option>
                    <option value="lowest">Lowest Rating</option>
                  </select>
                </div>
              </div>

              {/* REVIEWS LIST */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sortedReviews.map(review => (
                  <div key={review.review_id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition flex flex-col">
                    
                    {/* Header: Name, Stars, Date */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg">
                          {review.patient_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 leading-tight">{review.patient_name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{formatDate(review.created_at)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mb-3 flex tracking-widest">
                      {renderStars(review.rating)}
                    </div>

                    {/* Comment */}
                    <div className="flex-grow">
                      {review.comment ? (
                        <p className="text-gray-700 text-sm leading-relaxed italic bg-gray-50 p-4 rounded-xl border border-gray-100">
                          "{review.comment}"
                        </p>
                      ) : (
                        <p className="text-gray-400 text-sm italic">
                          No written feedback provided.
                        </p>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            </>
          )}

        </div>
      </div>

      {/* RIGHT SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-72 bg-white border-l border-gray-200 p-6 flex flex-col min-h-full shadow-sm shrink-0">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 px-3">Lab Menu</h2>
        <nav className="flex flex-col gap-2">
          <Link to="/labs" className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition">
            <span className="text-lg">📊</span> Dashboard
          </Link>
          <Link to="/labs/tests" className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition">
            <span className="text-lg">🧪</span> Manage Tests
          </Link>
          <Link to="/labs/slots" className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition">
            <span className="text-lg">🕒</span> Time Slots
          </Link>
          <Link to="/labs/reviews" className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium bg-blue-50 text-blue-700 transition">
            <span className="text-lg">⭐</span> Patient Reviews
          </Link>
        </nav>
      </aside>

    </div>
  )
}