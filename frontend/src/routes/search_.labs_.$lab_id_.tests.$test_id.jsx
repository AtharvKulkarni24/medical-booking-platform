import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/search_/labs_/$lab_id_/tests/$test_id')({
  component: BookingPage,
})

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

function BookingPage() {
  const navigate = useNavigate()
  const { lab_id, test_id } = Route.useParams()
  
  const [labDetails, setLabDetails] = useState(null)
  const [availableSlots, setAvailableSlots] = useState([])
  const [dates, setDates] = useState([])
  const [selectedDate, setSelectedDate] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [processingSlot, setProcessingSlot] = useState(null)
  
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState(null) 

  useEffect(() => {
    const next7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() + i)
      return d.toISOString().split('T')[0] 
    })
    setDates(next7Days)
    setSelectedDate(next7Days[0])
  }, [])

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

  const formatDateLabel = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':')
    const date = new Date()
    date.setHours(h, m)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  // Prevents booking slots that have already passed today
  const checkIsSlotPassed = (slotStartTime) => {
    const today = new Date().toISOString().split('T')[0];
    
    if (selectedDate !== today) return false;

    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();

    const [slotHours, slotMinutes] = slotStartTime.split(':').map(Number);

    if (currentHours > slotHours) return true;
    if (currentHours === slotHours && currentMinutes >= slotMinutes) return true;

    return false;
  }

  const handleSlotClick = async (slot) => {
    setProcessingSlot(slot.slot_id)
    setError('')

    const token = localStorage.getItem('accessToken')
    const userString = localStorage.getItem('user')
    const user = userString ? JSON.parse(userString) : null
    
    if (!token || user?.role !== 'patient') {
      setProcessingSlot(null)
      setShowLoginModal(true) 
      return
    }

    try {
      const isScriptLoaded = await loadRazorpayScript()
      if (!isScriptLoaded) throw new Error("Failed to load payment gateway. Check your internet connection.")
      
      const orderResponse = await fetch('http://localhost:5000/api/appointments/create-order', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          lab_id,
          test_id,
          slot_id: slot.slot_id,
          appointment_date: selectedDate
        })
      })
      
      const orderData = await orderResponse.json()
      if (!orderResponse.ok) throw new Error(orderData.error || "Failed to create order")

      const options = {
        key: "rzp_test_T8B7slOvzZmy9c", // Ensure your valid Razorpay key is used
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: "Medical Booking Platform",
        description: `Booking: ${labDetails.test_name} at ${labDetails.lab_name}`,
        order_id: orderData.order.id, 
        handler: async function (response) {
          try {
            const verifyRes = await fetch('http://localhost:5000/api/appointments/verify-and-book', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                lab_id,
                test_id,
                slot_id: slot.slot_id,
                appointment_date: selectedDate
              })
            })

            const verifyData = await verifyRes.json()
            if (!verifyRes.ok) throw new Error(verifyData.error || "Verification failed")

            setBookingSuccess({
              test_name: labDetails.test_name,
              lab_name: labDetails.lab_name,
              date: formatDateLabel(selectedDate),
              time: `${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}`,
              amount: labDetails.price
            })
            
          } catch (verifyErr) {
            alert(`Payment succeeded, but booking failed: ${verifyErr.message}. You will be refunded.`)
          } finally {
            setProcessingSlot(null)
          }
        },
        prefill: {
          name: user?.name || "Patient", 
          email: user?.email || "test@example.com",
          contact: "9999999999"
        },
        theme: {
          color: "#16a34a"
        }
      }

      const rzp = new window.Razorpay(options)
      
      rzp.on('payment.failed', function (response) {
        alert(`Payment failed: ${response.error.description}`)
        setProcessingSlot(null)
      })

      rzp.open()

    } catch (err) {
      alert(err.message)
      setProcessingSlot(null)
    }
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
    <div className="min-h-screen bg-gray-50 py-10 px-4 relative">
      
      {/* SUCCESSFUL BOOKING MODAL */}
      {bookingSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 px-4 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-fade-in-up text-center">
            <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6">
              <span className="text-4xl text-green-600">🎉</span>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
            <p className="text-gray-500 mb-6 text-sm">Your payment was successful and your slot is officially reserved.</p>

            <div className="bg-gray-50 rounded-xl p-5 text-left mb-8 border border-gray-100 shadow-inner">
              <div className="mb-4 pb-4 border-b border-gray-200">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Diagnostic Test</p>
                <p className="font-bold text-gray-900 text-lg leading-tight">{bookingSuccess.test_name}</p>
                <p className="text-sm text-gray-600 mt-1">{bookingSuccess.lab_name}</p>
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Date & Time</p>
                  <p className="font-bold text-gray-900">{bookingSuccess.date}</p>
                  <p className="font-bold text-blue-600">{bookingSuccess.time}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Amount Paid</p>
                  <p className="font-bold text-green-600 text-xl">₹{bookingSuccess.amount}</p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => navigate({ to: '/' })}
              className="w-full bg-green-600 text-white font-bold py-3.5 rounded-xl hover:bg-green-700 hover:shadow-lg transition-all"
            >
              Back to Home
            </button>
          </div>
        </div>
      )}

      {/* LOGIN REQUIRED MODAL */}
      {showLoginModal && !bookingSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4 transition-opacity">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-sm w-full shadow-2xl animate-fade-in-up">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-blue-100 mb-4">
                <span className="text-2xl">🔒</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Sign in Required</h3>
              <p className="text-gray-500 mb-6 text-sm">
                You need to be logged in to your patient account to securely book this test and process the payment.
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => navigate({ to: '/login', search: { redirect: window.location.pathname }})}
                  className="w-full bg-blue-600 text-white font-medium py-3 rounded-xl hover:bg-blue-700 transition"
                >
                  Log In / Sign Up
                </button>
                <button 
                  onClick={() => setShowLoginModal(false)}
                  className="w-full bg-gray-50 text-gray-700 font-medium py-3 rounded-xl hover:bg-gray-100 transition border border-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="max-w-5xl mx-auto">
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

          <div className="flex overflow-x-auto gap-3 pb-4 mb-8 border-b border-gray-100 hide-scrollbar">
            {dates.map(date => (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                disabled={processingSlot !== null} 
                className={`flex-shrink-0 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                  selectedDate === date 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300'
                } ${processingSlot !== null ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {formatDateLabel(date)}
              </button>
            ))}
          </div>

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
                const isProcessingThisSlot = processingSlot === slot.slot_id;
                const isAnotherSlotProcessing = processingSlot !== null && !isProcessingThisSlot;
                
                const hasPassed = checkIsSlotPassed(slot.start_time);

                return (
                  <button 
                    key={slot.slot_id} 
                    onClick={() => handleSlotClick(slot)}
                    disabled={processingSlot !== null || hasPassed} 
                    className={`p-4 rounded-xl border transition-all duration-200 flex flex-col items-center text-center group
                      ${isProcessingThisSlot 
                        ? 'bg-green-500 border-green-600 shadow-lg scale-105 animate-pulse' 
                        : hasPassed 
                          ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
                          : 'bg-white border-green-200 hover:border-green-500 hover:shadow-md hover:-translate-y-1 cursor-pointer'
                      }
                      ${isAnotherSlotProcessing ? 'opacity-40 grayscale pointer-events-none' : ''}
                    `}
                  >
                    <div className={`text-base font-bold mb-1 transition-colors ${
                      isProcessingThisSlot ? 'text-white' : hasPassed ? 'text-gray-500' : 'text-gray-900 group-hover:text-green-700'
                    }`}>
                      {formatTime(slot.start_time)}
                    </div>
                    
                    <div className={`text-xs mb-3 transition-colors ${
                      isProcessingThisSlot ? 'text-green-100' : hasPassed ? 'text-gray-400' : 'text-gray-500 group-hover:text-green-600'
                    }`}>
                      to {formatTime(slot.end_time)}
                    </div>
                    
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      isProcessingThisSlot
                        ? 'bg-green-700 text-white' 
                        : hasPassed
                          ? 'bg-gray-200 text-gray-500'
                          : remainingSpots <= 2 
                            ? 'bg-orange-100 text-orange-700' 
                            : 'bg-green-100 text-green-700'
                    }`}>
                      {isProcessingThisSlot 
                        ? 'Confirming...' 
                        : hasPassed 
                          ? 'Time Passed' 
                          : (remainingSpots > 0 ? `${remainingSpots} spots left` : 'Available')}
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