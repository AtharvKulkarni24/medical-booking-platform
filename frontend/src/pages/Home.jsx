import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const popularTests = [
  { id: 1, name: 'Blood Test', description: 'Evaluates overall health and detects a wide range of blood disorders.', icon: '🩸', badge: 'Most Popular' },
  { id: 2, name: 'Sonography Test', description: 'High-resolution ultrasound imaging for internal organ screening.', icon: '🩺', badge: 'Fast Result' },
  { id: 3, name: 'Kidney Test', description: 'Evaluates how well your kidneys are filtering waste from your blood.', icon: '🫘', badge: 'Essential' },
  { id: 4, name: 'Liver Test', description: 'Measures proteins, liver enzymes, and bilirubin in the blood.', icon: '🧪', badge: 'Top Booked' },
  { id: 5, name: 'Sugar Test', description: 'Measures blood glucose levels to screen for and monitor diabetes.', icon: '📏', badge: 'Routine' },
  { id: 6, name: 'Vitamin Test', description: 'Checks for essential vitamin deficiencies affecting bone and nerve health.', icon: '☀️', badge: 'Wellness' },
  { id: 7, name: 'Urine Test', description: 'Routine analysis to detect urinary tract infections and kidney issues.', icon: '💧', badge: 'Essential' },
  { id: 8, name: 'Thyroid Profile', description: 'Checks T3, T4 and TSH levels to evaluate thyroid gland health.', icon: '🦋', badge: 'Specialized' },
]

const quickCategories = ['Blood Test', 'Sonography Test', 'Kidney Test', 'Sugar Test', 'Thyroid Profile'];

const steps = [
  { step: '01', title: 'Select Test & Location', desc: 'Choose from certified diagnostic tests and find nearby verified lab centers.' },
  { step: '02', title: 'Pick Convenient Slot', desc: 'Select a suitable date and time slot with instant real-time confirmation.' },
  { step: '03', title: 'Get Fast Digital Reports', desc: 'Visit lab for sample collection and receive your digital report directly.' },
]

export default function Home() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  
  const [isLocating, setIsLocating] = useState(false)
  const [activeTest, setActiveTest] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!authLoading && user && user.role === 'lab') {
      navigate('/labs', { replace: true })
    }
  }, [user, authLoading, navigate])

  const handleTestClick = (testName) => {
    setIsLocating(true)
    setActiveTest(testName)

    if (!navigator.geolocation) {
      setIsLocating(false)
      navigate(`/search/labs?lab_name=${encodeURIComponent(testName)}`)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setIsLocating(false)
        navigate(`/search?test=${encodeURIComponent(testName)}&lat=${latitude}&lng=${longitude}`)
      },
      (err) => {
        console.warn("Location permission denied or timed out:", err)
        setIsLocating(false)
        navigate(`/search/labs`)
      },
      { timeout: 4000 }
    )
  }

  const handleDirectSearchSubmit = (e) => {
    e.preventDefault()
    const query = searchQuery.trim()
    if (!query) {
      navigate('/search/labs')
      return
    }
    handleTestClick(query)
  }

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] bg-slate-50">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-600 font-medium">Loading home page...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 relative overflow-hidden">
      
      {/* Loading Overlay */}
      {isLocating && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm text-center animate-fade-in-up">
            <div className="w-14 h-14 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <h3 className="text-xl font-bold text-slate-900 mb-1">Searching Nearby Labs</h3>
            <p className="text-sm text-slate-500">Finding available diagnostic centers for <span className="font-semibold text-blue-600">{activeTest}</span>...</p>
          </div>
        </div>
      )}

      {/* HERO SECTION */}
      <section className="relative hero-gradient pt-12 pb-20 md:pt-20 md:pb-28 px-4 sm:px-6 lg:px-8 border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto text-center">
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider mb-6 animate-fade-in-up">
            <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-ping"></span>
            Seamless Medical Diagnostic Platform
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight mb-6 leading-tight">
            Book Certified Diagnostic Tests <br className="hidden sm:inline"/>
            <span className="gradient-text">Near You in Seconds</span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-slate-600 max-w-3xl mx-auto mb-10 font-normal">
            Compare prices, check real-time time slots, and book verified diagnostic centers with instant digital reports delivered to your account.
          </p>

          {/* Search Box */}
          <form onSubmit={handleDirectSearchSubmit} className="max-w-2xl mx-auto glass-card p-3 rounded-3xl shadow-xl border border-slate-200 flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 flex items-center gap-3 px-4 py-2 w-full">
              <span className="text-xl">🔍</span>
              <input 
                type="text"
                placeholder="Search test e.g. Blood Test, Sonography, Sugar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none text-slate-900 placeholder-slate-400 focus:outline-none font-medium text-base"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold px-7 py-3.5 rounded-2xl shadow-md transition duration-200 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap text-sm"
            >
              <span>Find Labs</span>
              <span className="text-lg">➔</span>
            </button>
          </form>

          {/* Quick Category Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-6 max-w-2xl mx-auto">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Popular:</span>
            {quickCategories.map((cat, idx) => (
              <button
                key={idx}
                onClick={() => handleTestClick(cat)}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-600 border border-slate-200/80 text-xs font-semibold transition cursor-pointer shadow-sm"
              >
                {cat}
              </button>
            ))}
          </div>

        </div>
      </section>

      {/* POPULAR DIAGNOSTIC TESTS GRID */}
      <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="text-center mb-14">
          <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            Featured Catalog
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-3 mb-4 tracking-tight">
            Popular Diagnostic Tests
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto text-base sm:text-lg">
            Choose from our most frequently booked medical diagnostic tests and find nearby verified laboratories.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {popularTests.map((test) => (
            <div
              key={test.id}
              onClick={() => handleTestClick(test.name)}
              className="glass-card hover-lift p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl transition duration-300 cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-4xl p-3.5 bg-blue-50/80 rounded-2xl group-hover:scale-110 transition duration-300">
                    {test.icon}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100/70 text-blue-700">
                    {test.badge}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition">
                  {test.name}
                </h3>
                <p className="text-slate-500 text-xs leading-relaxed mb-6">
                  {test.description}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-blue-600 font-bold text-xs">
                <span>Book Nearby</span>
                <span className="group-hover:translate-x-1 transition">→</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section className="bg-slate-900 text-white py-16 md:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 tracking-tight">
              How MedBook Works
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-base sm:text-lg">
              Book medical lab appointments in 3 simple, hassle-free steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((item, idx) => (
              <div key={idx} className="bg-slate-800/60 p-8 rounded-3xl border border-slate-700/60 relative overflow-hidden">
                <span className="text-5xl font-black text-slate-700/50 absolute top-4 right-6">{item.step}</span>
                <h3 className="text-xl font-bold mb-3 relative z-10 text-blue-400">{item.title}</h3>
                <p className="text-slate-300 text-xs leading-relaxed relative z-10">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-14">
            <Link
              to="/search/labs"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-8 py-4 rounded-2xl shadow-lg transition"
            >
              Browse All Diagnostic Centers →
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
