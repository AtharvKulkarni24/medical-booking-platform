import { useState, useEffect } from "react";
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [role, setRole] = useState('patient'); 
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { login, user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'lab') {
        navigate('/labs', { replace: true })
      } else {
        navigate('/', { replace: true }) 
      }
    }
  }, [user, loading, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await login({ email, password }, role)

      if (role === 'lab') {
        navigate('/labs', { replace: true })
      } else {
        navigate('/', { replace: true })
      }
      
    } catch (err) {
      setError(err.message || "Failed to log in. Please check your credentials.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-slate-50">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-600 font-medium">Verifying session...</p>
      </div>
    )
  }

  return (
    <div className="min-h-[75vh] flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-xl animate-fade-in-up">
        
        <div className="text-center mb-8">
          <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            Secure Portal
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 mt-3">Welcome Back</h2>
          <p className="text-slate-500 text-xs mt-1">Sign in to access your bookings and diagnostic records.</p>
        </div>

        {/* ROLE SELECTOR */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6 border border-slate-200/60">
          <button
            type="button"
            onClick={() => setRole('patient')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer ${
              role === 'patient' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            👤 Patient Sign In
          </button>
          <button
            type="button"
            onClick={() => setRole('lab')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer ${
              role === 'lab' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            🧪 Lab Partner
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 text-xs rounded-2xl border border-red-100 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-slate-900 placeholder-slate-400"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-slate-900 placeholder-slate-400"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-md transition disabled:opacity-70 cursor-pointer text-xs"
          >
            {isSubmitting ? 'Authenticating...' : `Log In as ${role === 'patient' ? 'Patient' : 'Lab Partner'}`}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-slate-500 pt-6 border-t border-slate-100">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-600 font-bold hover:underline">
            Register now
          </Link>
        </div>
      </div>
    </div>
  )
}
