import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import Footer from '../components/Footer' 

// 1. Tell TanStack Router what search parameters to expect in the URL
export const Route = createFileRoute('/search')({
  validateSearch: (search) => {
    return {
      test: search.test || '',
      lat: search.lat ? parseFloat(search.lat) : undefined,
      lng: search.lng ? parseFloat(search.lng) : undefined,
    }
  },
  component: SearchResultsPage,
})

function SearchResultsPage() {
  // Grab the validated search parameters from the URL
  const { test, lat, lng } = Route.useSearch()
  
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchLabs = async () => {
      if (!test || !lat || !lng) {
        setError("Missing search parameters. Please go back and try again.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        const params = new URLSearchParams({ test, lat, lng });
        const response = await fetch(`http://localhost:5000/api/search/labs?${params.toString()}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch nearby labs.');
        }

        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLabs();
  }, [test, lat, lng]); // Re-run if URL params change

  return (
    <div className="flex flex-col min-h-screen w-full bg-gray-50">
      
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        
        <div className="mb-8 border-b border-gray-200 pb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Labs offering "{test}"
          </h1>
          {data && (
            <p className="text-gray-500">
              {data.message}
            </p>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500">Searching for nearby labs...</p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="p-4 bg-red-50 text-red-700 rounded-md border border-red-100">
            {error}
          </div>
        )}

        {/* Results State */}
        {!isLoading && data && data.labs && data.labs.length > 0 && (
          <div className="grid gap-6">
            {data.labs.map((lab) => (
              <div key={`${lab.lab_id}-${lab.test_id}`} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition">
                
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{lab.lab_name}</h3>
                  <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                    📍 {lab.address_text} <span className="text-gray-300">|</span> <span className="font-medium text-blue-600">{lab.distance_km} km away</span>
                  </p>
                  {lab.average_rating && (
                    <p className="text-sm text-yellow-600 mt-1 font-medium">
                      ⭐ {lab.average_rating} / 5.0
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end w-full md:w-auto mt-4 md:mt-0">
                  <p className="text-2xl font-bold text-gray-900">₹{lab.price}</p>
                  
                  {/* FIXED BUTTON LINK */}
                  <Link 
                    to={`/search/labs/${lab.lab_id}/tests/${lab.test_id}`}
                    className="mt-3 w-full md:w-auto px-6 py-2 bg-blue-600 text-center text-white font-medium rounded-md hover:bg-blue-700 transition shadow-sm block"
                  >
                    View Availability
                  </Link>
                  
                </div>

              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && data && data.labs && data.labs.length === 0 && (
          <div className="bg-white p-12 rounded-xl text-center border border-gray-200 shadow-sm">
            <div className="text-4xl mb-4">🏥</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No labs found nearby</h3>
            <p className="text-gray-500">Try searching for a different test or expanding your search area.</p>
          </div>
        )}

      </main>

    </div>
  )
}