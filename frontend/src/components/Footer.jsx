import { Link } from '@tanstack/react-router'

export default function Footer() {
  return (
    <footer className="w-full bg-gray-800 text-white pt-12 pb-8 mt-auto">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h2 className="text-xl font-bold mb-4">MedConnect</h2>
            <p className="text-white-400 text-sm">
              Your trusted platform for booking diagnostic tests with certified laboratories in your area. Fast, accurate, and reliable.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/" className="hover:text-white transition">Home</Link></li>
              <li><Link to="/login" className="hover:text-white transition">Patient Login</Link></li>
              <li><Link to="/login" className="hover:text-white transition">Lab Partner Login</Link></li>
              <li><a href="#" className="hover:text-white transition">Contact Us</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Legal</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#" className="hover:text-white transition">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white transition">Refund Policy</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} MedConnect. All rights reserved.
        </div>
      </div>
    </footer>
  )
}