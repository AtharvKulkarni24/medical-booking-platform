import { Link, useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/MedBook_logo.png'

export default function Navbar() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await logout() 
    setIsDropdownOpen(false)
    navigate('/login')
  }

  const labId = user?.id || user?.lab_id;

  return (
    <header className="glass-nav sticky top-0 z-50 transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          {/* LEFT: BRAND LOGO & NAV */}
          <div className="flex items-center gap-8">
            <Link 
              to={user?.role === 'lab' ? '/labs' : '/'} 
              className="flex items-center gap-3 group"
            >
              <img src={logo} alt="MedBook Logo" className="h-12 w-auto group-hover:scale-105 transition duration-200" />
              <span className="text-2xl font-extrabold tracking-tight">
                <span className="text-blue-600">Med</span>
                <span className="text-slate-900">Book</span>
              </span>
            </Link>
            
            <div className="hidden md:flex items-center gap-2">
              {user?.role !== 'lab' && (
                <Link
                  to="/search/labs"
                  className="px-4 py-2 rounded-xl text-sm font-bold text-slate-700 hover:text-blue-600 hover:bg-blue-50/80 transition"
                >
                  Find Labs
                </Link>
              )}
            </div>
          </div>

          {/* RIGHT: AUTH & USER DROPDOWN */}
          <div className="flex items-center gap-4">
            {!user ? (
              <div className="flex items-center gap-3">
                <Link 
                  to="/login" 
                  className="text-slate-700 hover:text-blue-600 font-bold text-sm px-4 py-2 rounded-xl hover:bg-slate-100 transition"
                >
                  Log in
                </Link>
                <Link 
                  to="/register" 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-md transition duration-200"
                >
                  Sign Up
                </Link>
              </div>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-3 bg-white hover:bg-slate-50 border border-slate-200/90 px-4 py-2 rounded-2xl transition shadow-sm cursor-pointer"
                >
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-extrabold text-sm shadow-sm">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="text-left hidden sm:block">
                    <span className="text-xs font-bold text-slate-900 block leading-tight">
                      {user.name || 'Account'}
                    </span>
                    <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider block">
                      {user.role === 'lab' ? 'Lab Partner' : 'Patient'}
                    </span>
                  </div>
                  <svg className={`w-4 h-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* DROPDOWN MENU */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden z-50 animate-fade-in-up">
                    <div className="p-3 border-b border-slate-100 bg-slate-50/60 sm:hidden">
                      <span className="text-xs font-bold text-slate-900 block">{user.name}</span>
                      <span className="text-[10px] font-semibold text-blue-600 uppercase">{user.role}</span>
                    </div>

                    <div className="py-1">
                      <Link
                        to="/profile"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition"
                      >
                        <span>👤</span> My Profile
                      </Link>
                      
                      {user?.role === 'patient' && (
                        <>
                          <Link 
                            to="/appointments" 
                            onClick={() => setIsDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition"
                          >
                            <span>📅</span> My Appointments
                          </Link>
                          <Link 
                            to="/reviews" 
                            onClick={() => setIsDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition"
                          >
                            <span>⭐</span> My Reviews
                          </Link>
                        </>
                      )}

                      {user?.role === 'lab' && (
                        <>
                          <Link
                            to="/labs"
                            onClick={() => setIsDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition"
                          >
                            <span>📊</span> Lab Dashboard
                          </Link>
                          <Link
                            to={`/labs/${labId}/appointments`}
                            onClick={() => setIsDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition"
                          >
                            <span>📋</span> Daily Roster
                          </Link>
                          <Link
                            to="/labs/tests"
                            onClick={() => setIsDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition"
                          >
                            <span>🧪</span> Manage Tests
                          </Link>
                          <Link
                            to="/labs/slots"
                            onClick={() => setIsDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition"
                          >
                            <span>🕒</span> Time Slots
                          </Link>
                          <Link
                            to="/labs/reviews"
                            onClick={() => setIsDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition"
                          >
                            <span>⭐</span> Patient Reviews
                          </Link>
                          <Link
                            to="/labs/payouts"
                            onClick={() => setIsDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 transition"
                          >
                            <span>💳</span> Payouts & Bank
                          </Link>
                        </>
                      )}

                      <div className="border-t border-slate-100 my-1"></div>
                      
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2.5 w-full text-left px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 transition cursor-pointer"
                      >
                        <span>🚪</span> Log Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  )
}