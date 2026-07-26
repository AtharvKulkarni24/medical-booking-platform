import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'

import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import Appointments from './pages/Appointments'
import Reviews from './pages/Reviews'
import Search from './pages/Search'
import SearchLabs from './pages/SearchLabs'
import LabDetail from './pages/LabDetail'
import TestDetail from './pages/TestDetail'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import Refund from './pages/Refund'
import NotFound from './pages/NotFound'

import LabDashboard from './pages/lab/LabDashboard'
import LabAppointments from './pages/lab/LabAppointments'
import LabReviews from './pages/lab/LabReviews'
import LabSlots from './pages/lab/LabSlots'
import LabTests from './pages/lab/LabTests'
import LabPayoutSettings from './pages/lab/LabPayoutSettings'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans text-gray-900">
      <Navbar />

      <main className="flex-grow w-full flex flex-col">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/reviews" element={<Reviews />} />
          
          <Route path="/search" element={<Search />} />
          <Route path="/search/labs" element={<SearchLabs />} />
          <Route path="/search/labs/:labId" element={<LabDetail />} />
          <Route path="/search/labs/:labId/tests/:testId" element={<TestDetail />} />

          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/refund" element={<Refund />} />

          <Route path="/labs" element={<LabDashboard />} />
          <Route path="/labs/:labId/appointments" element={<LabAppointments />} />
          <Route path="/labs/reviews" element={<LabReviews />} />
          <Route path="/labs/slots" element={<LabSlots />} />
          <Route path="/labs/tests" element={<LabTests />} />
          <Route path="/labs/payouts" element={<LabPayoutSettings />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <Footer />
    </div>
  )
}
