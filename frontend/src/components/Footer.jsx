import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Footer() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [pendingTarget, setPendingTarget] = useState(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLinkClick = (e, path, label, targetSectionRole) => {
    if (!user) return;

    const isCurrentPatient = user.role === 'patient' || user.role !== 'lab';
    const isCurrentLab = user.role === 'lab';

    // Patient trying to access Partner links
    if (isCurrentPatient && targetSectionRole === 'partner') {
      e.preventDefault()
      setPendingTarget({ path, label, targetRole: 'partner' })
      return
    }

    // Partner trying to access Patient links
    if (isCurrentLab && targetSectionRole === 'patient') {
      e.preventDefault()
      setPendingTarget({ path, label, targetRole: 'patient' })
      return
    }
  }

  const handleConfirmLogoutAndNavigate = async () => {
    if (!pendingTarget) return
    setIsLoggingOut(true)
    try {
      await logout()
      const targetPath = pendingTarget.path
      setPendingTarget(null)
      navigate(targetPath)
    } catch (err) {
      console.error("Logout navigation error:", err)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleCancel = () => {
    setPendingTarget(null)
  }

  return (
    <footer className="w-full bg-slate-900 text-slate-300 pt-12 pb-8 border-t border-slate-800 mt-auto relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          
          {/* COL 1: BRAND SUMMARY */}
          <div className="space-y-3">
            <Link 
              to={user?.role === 'lab' ? '/labs' : '/'} 
              className="text-2xl font-extrabold tracking-tight block"
            >
              <span className="text-blue-500">Med</span>
              <span className="text-white">Book</span>
            </Link>
            <p className="text-slate-400 text-xs leading-relaxed">
              Medical diagnostic booking platform. Search, compare, and book certified laboratories with instant digital reports.
            </p>
          </div>

          {/* COL 2: PATIENT QUICK LINKS */}
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-100 mb-3">Patients</h3>
            <ul className="space-y-2 text-xs font-medium text-slate-400">
              <li>
                <Link 
                  to="/" 
                  onClick={(e) => handleLinkClick(e, '/', 'Home', 'patient')} 
                  className="hover:text-white transition"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link 
                  to="/search/labs" 
                  onClick={(e) => handleLinkClick(e, '/search/labs', 'Find Diagnostic Labs', 'patient')} 
                  className="hover:text-white transition"
                >
                  Find Diagnostic Labs
                </Link>
              </li>
              <li>
                <Link 
                  to="/appointments" 
                  onClick={(e) => handleLinkClick(e, '/appointments', 'My Appointments', 'patient')} 
                  className="hover:text-white transition"
                >
                  My Appointments
                </Link>
              </li>
              <li>
                <Link 
                  to="/reviews" 
                  onClick={(e) => handleLinkClick(e, '/reviews', 'My Reviews', 'patient')} 
                  className="hover:text-white transition"
                >
                  My Reviews
                </Link>
              </li>
              <li>
                <Link 
                  to="/profile" 
                  onClick={(e) => handleLinkClick(e, '/profile', 'My Profile', 'patient')} 
                  className="hover:text-white transition"
                >
                  My Profile
                </Link>
              </li>
            </ul>
          </div>

          {/* COL 3: DIAGNOSTIC PARTNERS */}
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-100 mb-3">Partner Portal</h3>
            <ul className="space-y-2 text-xs font-medium text-slate-400">
              <li>
                <Link 
                  to="/login" 
                  onClick={(e) => handleLinkClick(e, '/login', 'Partner Sign In', 'partner')} 
                  className="hover:text-white transition"
                >
                  Partner Sign In
                </Link>
              </li>
              <li>
                <Link 
                  to="/register" 
                  onClick={(e) => handleLinkClick(e, '/register', 'Register Diagnostic Center', 'partner')} 
                  className="hover:text-white transition"
                >
                  Register Diagnostic Center
                </Link>
              </li>
              <li>
                <Link 
                  to="/labs" 
                  onClick={(e) => handleLinkClick(e, '/labs', 'Lab Dashboard', 'partner')} 
                  className="hover:text-white transition"
                >
                  Lab Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* COL 4: LEGAL & POLICIES */}
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-100 mb-3">Legal & Support</h3>
            <ul className="space-y-2 text-xs font-medium text-slate-400">
              <li><Link to="/privacy" className="hover:text-white transition">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-white transition">Terms of Service</Link></li>
              <li><Link to="/refund" className="hover:text-white transition">Cancellation & Refund Policy</Link></li>
            </ul>
          </div>

        </div>

        <div className="border-t border-slate-800/80 pt-6 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-3">
          <p>&copy; {new Date().getFullYear()} MedBook Platform. All rights reserved.</p>
          <p>Reliable healthcare diagnostics.</p>
        </div>
      </div>

      {/* CONFIRMATION LOGOUT MODAL */}
      {pendingTarget && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 text-slate-800">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center text-2xl font-bold mb-4">
              ⚠️
            </div>
            
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              {pendingTarget.targetRole === 'partner' ? 'Switch to Partner Portal?' : 'Switch to Patient View?'}
            </h3>

            <p className="text-slate-600 text-sm leading-relaxed mb-6">
              You are currently logged in as a <span className="font-bold text-slate-900">{user?.role === 'lab' ? 'Lab Partner' : 'Patient'}</span> ({user?.name || user?.email || 'Account'}).
              <br /><br />
              To access <span className="font-semibold text-blue-600">"{pendingTarget.label}"</span>, you need to log out of your current account.
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isLoggingOut}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmLogoutAndNavigate}
                disabled={isLoggingOut}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                {isLoggingOut ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Logging out...</span>
                  </>
                ) : (
                  <span>Logout & Continue →</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  )
}