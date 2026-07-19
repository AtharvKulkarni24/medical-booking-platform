import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="w-full bg-slate-900 text-slate-300 pt-12 pb-8 border-t border-slate-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          
          {/* COL 1: BRAND SUMMARY */}
          <div className="space-y-3">
            <Link to="/" className="text-2xl font-extrabold tracking-tight block">
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
              <li><Link to="/" className="hover:text-white transition">Home</Link></li>
              <li><Link to="/search/labs" className="hover:text-white transition">Find Diagnostic Labs</Link></li>
              <li><Link to="/appointments" className="hover:text-white transition">My Appointments</Link></li>
            </ul>
          </div>

          {/* COL 3: DIAGNOSTIC PARTNERS */}
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-100 mb-3">Partner Portal</h3>
            <ul className="space-y-2 text-xs font-medium text-slate-400">
              <li><Link to="/login" className="hover:text-white transition">Partner Sign In</Link></li>
              <li><Link to="/register" className="hover:text-white transition">Register Diagnostic Center</Link></li>
            </ul>
          </div>

          {/* COL 4: LEGAL & POLICIES */}
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-100 mb-3">Legal Policies</h3>
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
    </footer>
  )
}