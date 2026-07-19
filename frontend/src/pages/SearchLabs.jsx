import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'

export default function SearchLabs() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  
  const lab_name = searchParams.get('lab_name') || ''
  const lat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')) : undefined
  const lng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')) : undefined

  const [searchInput, setSearchInput] = useState(lab_name)
  const [labs, setLabs] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!lat || !lng) {
      handleGetLocation()
    }
  }, [])

  useEffect(() => {
    if (lat && lng) {
      fetchLabs()
    }
  }, [lab_name, lat, lng])

  const handleGetLocation = () => {
    setIsLocating(true)
    setError('')
    
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      setIsLocating(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newParams = new URLSearchParams(searchParams)
        newParams.set('lat', position.coords.latitude.toString())
        newParams.set('lng', position.coords.longitude.toString())
        setSearchParams(newParams)
        setIsLocating(false)
      },
      () => {
        setError('Please allow location access to discover diagnostic centers near you.')
        setIsLocating(false)
      }
    )
  }

  const fetchLabs = async () => {
    setIsLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ lat: lat.toString(), lng: lng.toString() })
      if (lab_name) params.append('lab_name', lab_name)

      const response = await fetch(`http://localhost:5000/api/search/labs/directory?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) throw new Error(data.error || 'Failed to fetch diagnostic centers.')
      setLabs(data.labs || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    const newParams = new URLSearchParams(searchParams)
    if (searchInput.trim()) {
      newParams.set('lab_name', searchInput.trim())
    } else {
      newParams.delete('lab_name')
    }
    setSearchParams(newParams)
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        
        {/* SEARCH HEADER */}
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200/80 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                Diagnostic Directory
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">Find Diagnostic Centers</h1>
              <p className="text-slate-500 text-sm mt-1">Showing verified laboratories sorted by distance from your location.</p>
            </div>

            <button
              onClick={handleGetLocation}
              disabled={isLocating}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>📍</span>
              <span>{isLocating ? 'Detecting Location...' : 'Update Location'}</span>
            </button>
          </div>
          
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <span className="absolute left-4 top-3.5 text-slate-400 text-base">🔍</span>
              <input
                type="text"
                placeholder="Search by lab name (e.g., Apollo, Suburban, Metropolis...)"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-900 placeholder-slate-400"
              />
            </div>
            <button
              type="submit"
              disabled={!lat || !lng}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-xl transition shadow-md disabled:opacity-50 cursor-pointer"
            >
              Search Labs
            </button>
          </form>
        </div>

        {/* LOCATING SPINNER */}
        {isLocating && (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 mb-6">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-700 font-medium text-lg">Detecting your location...</p>
          </div>
        )}
        
        {/* ERROR NOTICE */}
        {error && (
          <div className="bg-red-50 text-red-700 p-6 rounded-2xl border border-red-100 mb-8 text-center max-w-lg mx-auto">
            <p className="font-semibold text-sm mb-2">{error}</p>
            {(!lat || !lng) && (
              <button 
                onClick={handleGetLocation} 
                className="inline-block mt-2 px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition cursor-pointer"
              >
                Allow Location Access
              </button>
            )}
          </div>
        )}

        {/* LOADING DIRECTORY */}
        {isLoading && !isLocating && (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80">
             <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
             <p className="text-slate-500 font-medium">Searching directory...</p>
          </div>
        )}

        {/* DIRECTORY GRID */}
        {!isLoading && !isLocating && lat && lng && (
          <>
            {labs.length === 0 ? (
              <div className="text-center bg-white p-12 sm:p-16 rounded-3xl border border-slate-200/80 max-w-lg mx-auto">
                <span className="text-5xl mb-4 block">🏥</span>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">No Diagnostic Centers Found</h3>
                <p className="text-slate-500 text-sm mb-6">We couldn't find any diagnostic centers matching "{lab_name}" near your location.</p>
                <button
                  onClick={() => {
                    setSearchInput('')
                    const newParams = new URLSearchParams(searchParams)
                    newParams.delete('lab_name')
                    setSearchParams(newParams)
                  }}
                  className="px-5 py-2.5 bg-blue-600 text-white font-semibold text-xs rounded-xl hover:bg-blue-700 transition"
                >
                  Clear Search Filter
                </button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {labs.map((lab) => (
                  <Link 
                    key={lab.lab_id} 
                    to={`/search/labs/${lab.lab_id}`}
                    className="glass-card hover-lift p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl cursor-pointer transition-all duration-300 flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition">
                          {lab.lab_name}
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 whitespace-nowrap">
                          Verified
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 leading-relaxed mb-4 line-clamp-2">
                        📍 {lab.address_text}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="font-semibold text-blue-600 text-xs bg-blue-50 px-3 py-1 rounded-full">
                        📏 {lab.distance_km} km
                      </span>
                      {lab.average_rating ? (
                        <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                          ⭐ {lab.average_rating}
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-slate-400">New Lab</span>
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
