import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/search_/labs_/$lab_id/tests/$test_id')({
  component: BookingPage,
})

function BookingPage() {
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
        // Hit your searchController route, passing the selected date
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

  if (error) return <div className="text-red-500 text-center py-20">{error}</div>

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 w-full">
      
      {/* 1. Header Section: Lab & Test Details */}
      {labDetails && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8 flex flex-col md:flex-row justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{labDetails.test_name}</h1>
            <p className="text-gray-500 mt-2 max-w-2xl">{labDetails.description}</p>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="font-medium text-gray-900">Performed by: <span className="text-blue-600">{labDetails.lab_name}</span></p>
              <p className="text-sm text-gray-500">📍 {labDetails.address_text}</p>
            </div>
          </div>
          <div className="flex flex-col items-end md:justify-center md:pl-6 md:border-l border-gray-100">
            <p className="text-sm text-gray-500">Test Price</p>
            <p className="text-3xl font-bold text-gray-900">₹{labDetails.price}</p>
          </div>
        </div>
      )}

      <h2 className="text-xl font-bold text-gray-900 mb-6">Select a Time Slot</h2>

      {/* 2. Date Selector Tabs */}
      <div className="flex overflow-x-auto gap-2 pb-4 mb-6 border-b border-gray-200 hide-scrollbar">
        {dates.map(date => (
          <button
            key={date}
            onClick={() => setSelectedDate(date)}
            className={`flex-shrink-0 px-5 py-3 rounded-lg font-medium transition ${
              selectedDate === date 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {formatDateLabel(date)}
          </button>
        ))}
      </div>

      {/* 3. Time Slots Grid */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      ) : availableSlots.length === 0 ? (
        <div className="bg-yellow-50 p-6 rounded-lg text-yellow-800 text-center">
          No time slots are available for {formatDateLabel(selectedDate)}. Please select another day.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {availableSlots.map(slot => {
            // Your backend already filtered out fully booked slots if you kept the filtering logic!
            const remainingSpots = parseInt(slot.max_capacity) - parseInt(slot.current_bookings || 0);

            return (
              <button 
                key={slot.slot_id} 
                onClick={() => alert(`You selected ${formatTime(slot.start_time)}! We will connect this to a booking form next.`)}
                className="p-4 rounded-xl border bg-white border-green-200 hover:border-green-400 hover:shadow-md hover:-translate-y-0.5 cursor-pointer transition flex flex-col items-center text-center"
              >
                <div className="text-lg font-bold text-gray-900 mb-1">
                  {formatTime(slot.start_time)}
                </div>
                <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  {remainingSpots > 0 ? `${remainingSpots} spots left` : 'Available'}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}