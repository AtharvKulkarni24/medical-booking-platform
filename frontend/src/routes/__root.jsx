import { createRootRoute, Outlet, Link } from '@tanstack/react-router'

// IMPORTANT: Adjust these paths if your files are in different folders!
import { AuthProvider } from '../context/AuthContext'
import Navbar from '../components/Navbar' 
import Footer from '../components/Footer' 

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
    // 3. Wrap the entire app in the AuthProvider so every page knows who is logged in
    <AuthProvider>
      <div className="min-h-screen flex flex-col bg-gray-50 font-sans text-gray-900">
        
        {/* 4. Use your new dynamic Navbar instead of the hardcoded one! */}
        <Navbar />

        {/* Main Content Area */}
        <main className="flex-grow w-full flex flex-col">
          <Outlet />
        </main>

        {/* 5. Add your new Footer to the bottom of the app */}
        <Footer />
        
      </div>
    </AuthProvider>
  ),
})