import { createRootRoute, Outlet, Link } from '@tanstack/react-router'

// 1. Create a custom 404 component
function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center flex-grow py-24 px-4 text-center">
      <h1 className="text-7xl font-bold text-blue-600 mb-4">404</h1>
      <h2 className="text-3xl font-bold text-gray-900 mb-3">Page Not Found</h2>
      <p className="text-gray-500 mb-8 max-w-md mx-auto">
        Oops! We couldn't find the page you were looking for. It might have been moved or doesn't exist.
      </p>
      <Link 
        to="/" 
        className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition"
      >
        Go back Home
      </Link>
    </div>
  )
}

export const Route = createRootRoute({
  // 2. Register the component with the router
  notFoundComponent: NotFound, 
  
  component: () => (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans text-gray-900">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-8">
              <Link to="/" className="text-2xl font-bold text-blue-600">
                MedBook
              </Link>
              <div className="hidden md:flex gap-4">
                <Link to="/labs/search" className="text-gray-600 hover:text-blue-600 font-medium">Find a Lab</Link>
              </div>
            </div>
            <div className="flex gap-3">
              <Link to="/login" className="px-4 py-2 text-blue-600 font-medium hover:bg-blue-50 rounded-md transition">
                Log in
              </Link>
              <Link to="/register" className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition">
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow w-full flex flex-col">
        <Outlet />
      </main>
    </div>
  ),
})