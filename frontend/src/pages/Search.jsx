import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'

export default function Search() {
  const [searchParams] = useSearchParams()
  const test = searchParams.get('test') || ''
  const lat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')) : undefined
  const lng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')) : undefined

  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchLabs = async () => {
      if (!test || !lat || !lng) {
        setError("Missing search parameters. Please search for a test from the home page.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        const params = new URLSearchParams({ test, lat: lat.toString(), lng: lng.toString() });
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
  }, [test, lat, lng]);

  return (
    <div className="flex flex-col min-h-screen w-full bg-slate-50">
      <main className="flex-grow max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-12">

        {/* HEADER HERO */}
        <div className="mb-8 p-6 md:p-8 bg-white rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
              Search Results
            </span>
            <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 mt-2 mb-1">
              Diagnostic Centers Offering "{test}"
            </h1>
            {data && (
              <p className="text-slate-500 text-sm md:text-base">
                {data.message || `Found ${data.labs?.length || 0} labs nearby`}
              </p>
            )}
          </div>

          <Link
            to="/"
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-4 py-2 rounded-xl transition flex items-center gap-2"
          >
            <span>← Change Test</span>
          </Link>
        </div>

        {/* LOADING STATE */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200/80">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <p className="text-slate-600 font-medium text-lg">Finding certified labs near your location...</p>
          </div>
        )}

        {/* ERROR STATE */}
        {error && !isLoading && (
          <div className="p-6 bg-red-50 text-red-700 rounded-2xl border border-red-100 text-center max-w-xl mx-auto">
            <p className="font-semibold text-base mb-2">Search Error</p>
            <p className="text-sm">{error}</p>
            <Link to="/" className="inline-block mt-4 text-xs font-bold text-red-800 underline">
              Return to Home Search
            </Link>
          </div>
        )}

        {/* LABS LIST */}
        {!isLoading && data && data.labs && data.labs.length > 0 && (
          <div className="space-y-6">
            {data.labs.map((lab) => (
              <div
                key={`${lab.lab_id}-${lab.test_id}`}
                className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl transition duration-300 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group hover-lift"
              >

                <div className="space-y-3 max-w-xl">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 group-hover:text-blue-600 transition">
                      {lab.lab_name}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
                      ✓ Verified
                    </span>
                  </div>

                  <p className="text-slate-500 text-sm flex items-center gap-2">
                    <span>📍</span>
                    <span>{lab.address_text}</span>
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
                    <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full flex items-center gap-1">
                      <span>📏</span> {lab.distance_km} km away
                    </span>

                    {lab.average_rating && (
                      <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full flex items-center gap-1">
                        <span>⭐</span> {lab.average_rating} / 5.0 Rating
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-start md:items-end w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <div className="text-left md:text-right mb-4">
                    <span className="text-xs text-slate-400 uppercase font-bold tracking-wider block">Test Fee</span>
                    <span className="text-3xl font-extrabold text-slate-900">₹{lab.price}</span>
                  </div>

                  <Link
                    to={`/search/labs/${lab.lab_id}/tests/${lab.test_id}`}
                    className="w-full md:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-center font-semibold rounded-xl shadow-md transition duration-200 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>View Time Slots</span>
                    <span>→</span>
                  </Link>
                </div>

              </div>
            ))}
          </div>
        )}

        {/* EMPTY STATE */}
        {!isLoading && data && data.labs && data.labs.length === 0 && (
          <div className="bg-white p-12 sm:p-16 rounded-3xl text-center border border-slate-200/80 shadow-sm max-w-lg mx-auto">
            <div className="text-5xl mb-4">🧪</div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">No Labs Found Nearby</h3>
            <p className="text-slate-500 text-sm mb-6">We couldn't find diagnostic centers offering "{test}" within your immediate area.</p>
            <Link
              to="/search/labs"
              className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold text-sm rounded-xl hover:bg-blue-700 transition shadow-sm"
            >
              Browse All Diagnostic Centers
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
