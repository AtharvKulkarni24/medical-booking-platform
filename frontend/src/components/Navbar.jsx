import { Link, useNavigate } from '@tanstack/react-router'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/MedBook_logo.png'

export default function Navbar() {
  const navigate = useNavigate()
  
  // Pull the global user state and logout function from AuthContext
  const { user, logout } = useAuth()

  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Listen for clicks outside the dropdown to close it automatically
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
    navigate({ to: '/login' }) 
  }

  // Fallback check to safely grab the ID whether it's stored as .id or .lab_id
  const labId = user?.id || user?.lab_id;

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex justify-between items-center h-16">
          
          {/* Left Side: Logo and Navigation */}
          <div className="flex items-center gap-8">
            {/* DYNAMIC LOGO LINK */}
            <Link 
              to={user?.role === 'lab' ? '/labs' : '/'} 
              className="flex items-center gap-2"
            >
              <img src={logo} alt="MedBook Logo" className="h-24 w-auto" />
              <span className="text-2xl font-bold "> <span className="text-cyan-500">Med</span><span className="text-blue-900">Book</span></span>
            </Link>
            
            <div className="hidden md:flex gap-4">
              {/* CONDITIONALLY RENDERED: Hidden if the user is a lab */}
              {user?.role !== 'lab' && (
                <Link
                  to="/search/labs"
                  className="relative inline-flex items-center justify-center px-6 py-2.5 rounded-lg font-semibold text-white overflow-hidden group bg-gradient-to-r from-cyan-500 to-blue-900 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/30"
                >
                  <span className="absolute inset-0 bg-linear-to-r from-blue-900 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></span>
                  <span className="relative z-10">Find a Lab</span>
                </Link>
              )}
            </div>
          </div>

          {/* Right Side: Auth / Profile */}
          <div className="flex items-center gap-4">
            
            {!user ? (
              /* --- LOGGED OUT STATE --- */
              <>
                <Link 
                  to="/login" 
                  className="text-blue-600 font-medium px-4 py-2 hover:bg-blue-50 rounded-md transition"
                >
                  Log in
                </Link>
                <Link 
                  to="/register" 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-md transition shadow-sm"
                >
                  Sign Up
                </Link>
              </>
            ) : (
              /* --- LOGGED IN STATE (Dropdown) --- */
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-4 py-2 rounded-lg transition"
                >
                  <div className="w-7 h-7 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {user.name || 'My Account'}
                  </span>
                  {/* Dropdown Arrow Icon */}
                  <svg className={`w-4 h-4 text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden z-50">
                    <div className="py-1">
                      
                      <Link
                        to="/profile"
                        onClick={() => setIsDropdownOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
                      >
                        My Profile
                      </Link>
                      
                      {/* --- PATIENT ONLY LINKS --- */}
                      {user?.role === 'patient' && (
                        <>
                        <Link 
                          to="/appointments" 
                          onClick={() => setIsDropdownOpen(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          My Appointments
                        </Link>

                        <Link 
                          to="/reviews" 
                          onClick={() => setIsDropdownOpen(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          My Reviews
                        </Link>
                        </>
                      )}

                      {/* --- LAB ONLY LINKS --- */}
                      {user?.role === 'lab' && (
                        <>
                          <Link
                            to="/labs"
                            onClick={() => setIsDropdownOpen(false)}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
                          >
                            My Dashboard
                          </Link>
                          {/* CORRECTED LINK HERE */}
                          <Link
                            to={`/labs/${labId}/appointments`}
                            onClick={() => setIsDropdownOpen(false)}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
                          >
                            My Appointments
                          </Link>
                          <Link
                            to="/labs/tests"
                            onClick={() => setIsDropdownOpen(false)}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
                          >
                            My Tests
                          </Link>
                          <Link
                            to="/labs/slots"
                            onClick={() => setIsDropdownOpen(false)}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
                          >
                            My Slots
                          </Link>
                          <Link
                            to="/labs/reviews"
                            onClick={() => setIsDropdownOpen(false)}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
                          >
                            My Reviews
                          </Link>
                        </>
                      )}

                      <div className="border-t border-gray-100 my-1"></div>
                      
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
          </div>
        </div>
      </div>
    </nav>
  )
}