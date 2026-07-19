import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'

export default function LabDetail() {
  const { labId } = useParams()
  
  const [lab, setLab] = useState(null)
  const [tests, setTests] = useState([])
  const [reviews, setReviews] = useState([])
  const [activeTab, setActiveTab] = useState('tests') // 'tests' | 'reviews'
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchLabDetails = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`http://localhost:5000/api/search/labs/${labId}`)
        const data = await response.json()

        if (!response.ok) throw new Error(data.error || 'Failed to load diagnostic center details.')

        setLab(data.lab)
        setTests(data.tests || [])

        // Fetch lab reviews
        try {
          const revRes = await fetch(`http://localhost:5000/api/reviews/lab/${labId}`)
          const revData = await revRes.json()
          if (revRes.ok) {
            setReviews(revData.reviews || [])
          }
        } catch (rErr) {
          console.warn("Reviews fetch error:", rErr)
        }

      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    if (labId) {
      fetchLabDetails()
    }
  }, [labId])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-slate-50">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-600 font-medium">Loading diagnostic center profile...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-red-50 text-red-700 rounded-3xl border border-red-100 text-center">
        <h3 className="text-xl font-bold mb-2">Center Not Found</h3>
        <p className="text-sm mb-6">{error}</p>
        <Link to="/search/labs" className="px-6 py-2.5 bg-red-600 text-white font-semibold text-xs rounded-xl hover:bg-red-700 transition">
          Back to Lab Directory
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        
        {/* LAB HEADER CARD */}
        {lab && (
          <div className="bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-slate-200/80 mb-8 relative overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">{lab.lab_name}</h1>
                  <span className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-blue-100">
                    ✓ Verified Lab
                  </span>
                </div>

                <p className="text-slate-600 text-sm sm:text-base flex items-center gap-2 mb-2">
                  <span>📍</span> {lab.address_text}
                </p>
              </div>
              
              {lab.average_rating && (
                <div className="bg-amber-50/80 px-6 py-4 rounded-2xl border border-amber-100 text-center min-w-[140px]">
                  <p className="text-xs text-amber-800 font-bold uppercase tracking-widest mb-1">Rating</p>
                  <p className="text-3xl font-black text-amber-600">⭐ {lab.average_rating}</p>
                  <p className="text-xs text-slate-500 mt-1 font-medium">{reviews.length} Patient Reviews</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB NAVIGATION */}
        <div className="flex border-b border-slate-200 mb-8 gap-8">
          <button
            onClick={() => setActiveTab('tests')}
            className={`pb-4 font-bold text-sm sm:text-base transition cursor-pointer flex items-center gap-2 relative ${
              activeTab === 'tests' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>🧪 Offered Diagnostic Tests</span>
            <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-xs">{tests.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-4 font-bold text-sm sm:text-base transition cursor-pointer flex items-center gap-2 relative ${
              activeTab === 'reviews' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>⭐ Patient Reviews</span>
            <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full text-xs">{reviews.length}</span>
          </button>
        </div>

        {/* TAB CONTENT: TESTS */}
        {activeTab === 'tests' && (
          <div>
            {tests.length === 0 ? (
              <div className="bg-white p-12 sm:p-16 rounded-3xl text-center border border-slate-200/80 shadow-sm max-w-md mx-auto">
                <span className="text-4xl mb-4 block">🧪</span>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No tests published</h3>
                <p className="text-slate-500 text-sm">This lab has not published any diagnostic tests yet.</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {tests.map((test) => (
                  <div key={test.test_id} className="glass-card hover-lift p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl transition duration-300 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-4 mb-3">
                        <h3 className="text-xl font-bold text-slate-900">{test.test_name}</h3>
                        <span className="text-2xl font-extrabold text-blue-600">₹{test.price}</span>
                      </div>
                      <p className="text-sm text-slate-500 leading-relaxed mb-6 line-clamp-3">
                        {test.description || 'Routine diagnostic screening test.'}
                      </p>
                    </div>
                    
                    <Link 
                      to={`/search/labs/${labId}/tests/${test.test_id}`}
                      className="w-full text-center px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition shadow-md flex items-center justify-center gap-2"
                    >
                      <span>Check Time Slots & Book</span>
                      <span>→</span>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB CONTENT: REVIEWS */}
        {activeTab === 'reviews' && (
          <div>
            {reviews.length === 0 ? (
              <div className="bg-white p-12 sm:p-16 rounded-3xl text-center border border-slate-200/80 shadow-sm max-w-md mx-auto">
                <span className="text-4xl mb-4 block">⭐</span>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No reviews yet</h3>
                <p className="text-slate-500 text-sm">Be the first patient to review this diagnostic center after completing your appointment!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((rev) => (
                  <div key={rev.review_id} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-slate-900">{rev.patient_name || 'Patient'}</span>
                      <span className="text-amber-500 font-bold text-sm">
                        {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)} ({rev.rating}/5)
                      </span>
                    </div>
                    <p className="text-slate-600 text-sm">{rev.comment || 'No written comment.'}</p>
                    <span className="text-xs text-slate-400 mt-2 block">{new Date(rev.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
