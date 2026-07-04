import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/search_/labs')({
  component: LabProfilePage,
})

function LabProfilePage() {
  // Grab the lab_id directly from the URL path (No search queries needed!)
  const { lab_id } = Route.useParams()
  
  const [lab, setLab] = useState(null)
  const [tests, setTests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchLabDetails = async () => {
      try {
        setIsLoading(true)
        // Hit the backend using only the lab_id
        const response = await fetch(`http://localhost:5000/api/search/labs/${lab_id}`)
        const data = await response.json()

        if (!response.ok) throw new Error(data.error || 'Failed to load lab details')

        setLab(data.lab)
        setTests(data.tests)
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLabDetails()
  }, [lab_id])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-medium">Loading lab profile...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-10 px-4">
        <div className="max-w-3xl mx-auto p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 text-center">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        
        {/* 1. Lab Header Profile */}
        {lab && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row justify-between items-start gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{lab.lab_name}</h1>
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wide">
                  Verified Lab
                </span>
              </div>
              <p className="text-gray-600 text-lg flex items-center gap-2">
                <span>📍</span> {lab.address_text}
              </p>
            </div>
            
            {lab.average_rating && (
              <div className="bg-yellow-50 px-4 py-3 rounded-xl border border-yellow-100 text-center min-w-[120px]">
                <p className="text-sm text-yellow-800 font-medium uppercase tracking-wide mb-1">Rating</p>
                <p className="text-2xl font-bold text-yellow-600">⭐ {lab.average_rating}</p>
              </div>
            )}
          </div>
        )}

        {/* 2. Tests List Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Available Tests ({tests.length})</h2>
        </div>

        {/* 3. Tests Grid */}
        {tests.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl text-center border border-gray-100 shadow-sm">
            <span className="text-4xl mb-4 block">🧪</span>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No tests available</h3>
            <p className="text-gray-500">This lab hasn't published any diagnostic tests yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {tests.map((test) => (
              <div key={test.test_id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start gap-4 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{test.test_name}</h3>
                    <span className="text-xl font-bold text-blue-600">₹{test.price}</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-6 line-clamp-2">
                    {test.description || 'No description available for this test.'}
                  </p>
                </div>
                
                {/* Book Test Button - Links directly to the booking availability page! */}
                <Link 
                  to={`/search/labs/${lab_id}/tests/${test.test_id}`}
                  className="w-full text-center px-4 py-2.5 bg-blue-50 text-blue-700 font-medium rounded-lg border border-blue-200 hover:bg-blue-600 hover:text-white transition"
                >
                  Check Availability & Book
                </Link>
              </div>
            ))}
          </div>
        )}
        
      </div>
    </div>
  )
}