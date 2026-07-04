import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/search_/labs_/$lab_id_/tests/$test_id')({
  component: BookingPage,
})

function BookingPage() {
  // Grab both IDs from the URL
  const { lab_id, test_id } = Route.useParams()
  
  const [labDetails, setLabDetails] = useState(null)
  const [availableSlots, setAvailableSlots] = useState([])
  
  // Date Management State
  const [dates, setDates] = useState([])
  const [selectedDate, setSelectedDate] = useState('')
  
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Generate the next 7 days for the tabs when the component loads
  useEffect(() => {
    const next7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() + i)
      return d.toISOString().split('T')[0] // Format: YYYY-MM-DD
    })
    setDates(next7Days)
    setSelectedDate(next7Days[0])
  }, [])

  // Fetch data whenever the selectedDate changes
  useEffect(() => {
    if (!selectedDate) return;

    const fetchAvailability = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`http://localhost:5000/api/search/labs/${lab_id}/tests/${test_id}?date=${selectedDate}`)
        const result = await response.json()

        if (!response.ok) throw new Error(result.error || 'Failed to load details')

        setLabDetails(result.data.lab_and_test_info)
        setAvailableSlots(result.data.time_slots)
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAvailability()
  }, [lab_id, test_id, selectedDate])

  // Helper formatting functions
  const formatDateLabel = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const formatTime = (timeStr) => {
    const [h, m] = timeStr.split(':')
    const date = new Date()
    date.setHours(h, m)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-10 px-4">
        <div className="max-w-3xl mx-auto p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 text-center">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        
        {/* 1. Header Section: Lab & Test Details */}
        {labDetails && (
          <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm mb-8 flex flex-col md:flex-row justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{labDetails.test_name}</h1>
              </div>
              <p className="text-gray-500 mt-2 max-w-2xl">{labDetails.description || 'No description available.'}</p>
              
              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="font-medium text-gray-900 mb-1">
                  Performed by: <span className="text-blue-600 font-bold">{labDetails.lab_name}</span>
                </p>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <span>📍</span> {labDetails.address_text}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-start md:items-end md:justify-center md:pl-8 md:border-l border-gray-100">
              <p className="text-sm text-gray-500 font-medium uppercase tracking-wide mb-1">Test Price</p>
              <p className="text-4xl font-bold text-gray-900">₹{labDetails.price}</p>
            </div>
          </div>
        )}

        <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Select a Time Slot</h2>

          {/* 2. Date Selector Tabs */}
          <div className="flex overflow-x-auto gap-3 pb-4 mb-8 border-b border-gray-100 hide-scrollbar">
            {dates.map(date => (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={`flex-shrink-0 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                  selectedDate === date 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300'
                }`}
              >
                {formatDateLabel(date)}
              </button>
            ))}
          </div>

          {/* 3. Time Slots Grid */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
              <p className="text-gray-500 font-medium">Checking availability...</p>
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="bg-yellow-50 p-8 rounded-xl border border-yellow-100 text-center">
              <span className="text-3xl block mb-3">📅</span>
              <h3 className="text-lg font-bold text-yellow-800 mb-1">No Slots Available</h3>
              <p className="text-yellow-700">All slots are booked or unavailable for {formatDateLabel(selectedDate)}. Please select another day.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {availableSlots.map(slot => {
                const remainingSpots = parseInt(slot.max_capacity) - parseInt(slot.current_bookings || 0);

                return (
                  <button 
                    key={slot.slot_id} 
                    onClick={() => alert(`You selected ${formatTime(slot.start_time)}! Next up: building the booking confirmation.`)}
                    className="p-4 rounded-xl border bg-white border-green-200 hover:border-green-500 hover:shadow-md hover:-translate-y-1 cursor-pointer transition-all duration-200 flex flex-col items-center text-center group"
                  >
                    <div className="text-lg font-bold text-gray-900 mb-2 group-hover:text-green-700 transition-colors">
                      {formatTime(slot.start_time)}
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      remainingSpots <= 2 
                        ? 'bg-orange-100 text-orange-700' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {remainingSpots > 0 ? `${remainingSpots} spots left` : 'Available'}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}