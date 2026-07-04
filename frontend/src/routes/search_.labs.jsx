import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/search_/labs')({
  validateSearch: (search) => ({
    lab_name: search.lab_name || '',
    lat: search.lat ? parseFloat(search.lat) : undefined,
    lng: search.lng ? parseFloat(search.lng) : undefined,
  }),
  component: LabDirectoryPage,
})

function LabDirectoryPage() {
  const navigate = useNavigate()
  const { lab_name, lat, lng } = Route.useSearch()
  
  const [searchInput, setSearchInput] = useState(lab_name)
  const [labs, setLabs] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [error, setError] = useState('')

  // Automatically fetch location if missing on page load
  useEffect(() => {
    if (!lat || !lng) {
      handleGetLocation()
    }
  }, [])

  // Fetch labs when URL parameters change and location exists
  useEffect(() => {
    if (lat && lng) {
      fetchLabs()
    }
  }, [lab_name, lat, lng])

  const handleGetLocation = () => {
    setIsLocating(true)
    setError('')
    
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      setIsLocating(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Update URL with new coordinates
        navigate({
          search: (prev) => ({
            ...prev,
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        })
        setIsLocating(false)
      },
      () => {
        setError('Please allow location access to find labs near you.')
        setIsLocating(false)
      }
    )
  }

  const fetchLabs = async () => {
    setIsLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ lat, lng })
      if (lab_name) params.append('lab_name', lab_name)

      const response = await fetch(`http://localhost:5000/api/search/labs/directory?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) throw new Error(data.error || 'Failed to fetch labs')
      setLabs(data.labs)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    // Update URL, which triggers the useEffect to fetch new data
    navigate({
      search: (prev) => ({
        ...prev,
        lab_name: searchInput
      })
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        
        {/* Header & Search Bar */}
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Find a Diagnostic Center</h1>
          <p className="text-gray-500 mb-6">Showing verified labs within 50km of your location.</p>
          
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Search by lab name (e.g., Apollo Diagnostics)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex-grow px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button
              type="submit"
              disabled={!lat || !lng}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-xl transition disabled:opacity-50"
            >
              Search
            </button>
          </form>
        </div>

        {/* Status Messages */}
        {isLocating && (
          <div className="text-center py-12">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Getting your current location...</p>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 mb-6 text-center">
            {error}
            {(!lat || !lng) && (
              <button onClick={handleGetLocation} className="block mx-auto mt-3 underline font-medium">
                Try Again
              </button>
            )}
          </div>
        )}

        {/* Loading Labs */}
        {isLoading && !isLocating && (
          <div className="text-center py-12">
             <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
             <p className="text-gray-500">Searching directory...</p>
          </div>
        )}

        {/* Lab Results Grid */}
        {!isLoading && !isLocating && lat && lng && (
          <>
            {labs.length === 0 ? (
              <div className="text-center bg-white p-12 rounded-2xl border border-gray-100">
                <span className="text-4xl mb-4 block">🏥</span>
                <h3 className="text-xl font-bold text-gray-900">No labs found</h3>
                <p className="text-gray-500 mt-2">We couldn't find any labs matching "{lab_name}" near you.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {labs.map((lab) => (
                  <Link 
                    key={lab.lab_id} 
                    to={`/search/labs/${lab.lab_id}`}
                    className="block bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-1 cursor-pointer transition-all duration-200"
                  >
                    <h3 className="text-lg font-bold text-gray-900">{lab.lab_name}</h3>
                    <p className="text-sm text-gray-500 mt-2 flex items-start gap-1 h-10 overflow-hidden">
                      <span>📍</span> {lab.address_text}
                    </p>
                    <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                      <span className="font-medium text-blue-600 text-sm">{lab.distance_km} km away</span>
                      {lab.average_rating && (
                        <span className="text-sm font-medium text-yellow-600">⭐ {lab.average_rating}</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}