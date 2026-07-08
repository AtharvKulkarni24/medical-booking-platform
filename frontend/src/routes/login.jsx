import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

export const Route = createFileRoute('/login')({
  component: Login,
})

function Login() {
  const [role, setRole] = useState('patient'); 
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 1. Extract user and loading state
  const { login, user, loading } = useAuth()
  const navigate = useNavigate()

  // 2. THE REDIRECT RULE: Kick logged-in users out of the login page
  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'lab') {
        navigate({ to: '/labs', replace: true })
      } else {
        navigate({ to: '/', replace: true }) 
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
        navigate({ to: '/labs', replace: true })
      } else {
        navigate({ to: '/', replace: true })
      }
      
    } catch (err) {
      setError(err.message || "Failed to log in. Please check your credentials.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // 3. Wait for AuthContext to finish checking local storage before rendering form
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto mt-12 bg-white p-8 rounded-xl shadow-sm border border-gray-100">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
        <p className="text-gray-500 mt-2">Log in to your account</p>
      </div>

      <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
        <button
          type="button"
          onClick={() => setRole('patient')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            role === 'patient' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Patient
        </button>
        <button
          type="button"
          onClick={() => setRole('lab')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            role === 'lab' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Laboratory
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-100">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white font-medium py-2.5 rounded-md hover:bg-blue-700 transition disabled:opacity-70"
        >
          {isSubmitting ? 'Logging in...' : `Log In as ${role === 'patient' ? 'Patient' : 'Lab'}`}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-gray-600">
        Don't have an account?{' '}
        <Link to="/register" className="text-blue-600 font-medium hover:underline">
          Sign up
        </Link>
      </div>
    </div>
  )
}