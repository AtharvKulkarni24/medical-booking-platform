import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function TestDetail() {
  const navigate = useNavigate()
  const { labId, testId } = useParams()

  const [labDetails, setLabDetails] = useState(null)
  const [availableSlots, setAvailableSlots] = useState([])
  const [dates, setDates] = useState([])
  const [selectedDate, setSelectedDate] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [processingSlot, setProcessingSlot] = useState(null)

  const [showLoginModal, setShowLoginModal] = useState(false)
  const [confirmSlotModal, setConfirmSlotModal] = useState(null)
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
    if (!selectedDate || !labId || !testId) return;

    const fetchAvailability = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`http://localhost:5000/api/search/labs/${labId}/tests/${testId}?date=${selectedDate}`)
        const result = await response.json()

        if (!response.ok) throw new Error(result.error || 'Failed to load test details.')

        setLabDetails(result.data.lab_and_test_info)
        setAvailableSlots(result.data.time_slots || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAvailability()
  }, [labId, testId, selectedDate])

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

  const handleSlotClick = (slot) => {
    setError('')
    const token = localStorage.getItem('accessToken')
    const userString = localStorage.getItem('user')
    const user = userString ? JSON.parse(userString) : null

    if (!token || user?.role !== 'patient') {
      setShowLoginModal(true)
      return
    }

    setConfirmSlotModal(slot)
  }

  const executeRazorpayCheckout = async (slot) => {
    setConfirmSlotModal(null)
    setProcessingSlot(slot.slot_id)
    setError('')

    const token = localStorage.getItem('accessToken')
    const userString = localStorage.getItem('user')
    const user = userString ? JSON.parse(userString) : null

    try {
      const isScriptLoaded = await loadRazorpayScript()
      if (!isScriptLoaded) throw new Error("Failed to load Razorpay SDK.")

      const orderResponse = await fetch('http://localhost:5000/api/appointments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          lab_id: labId,
          test_id: testId,
          slot_id: slot.slot_id,
          appointment_date: selectedDate
        })
      })

      const orderData = await orderResponse.json()
      if (!orderResponse.ok) throw new Error(orderData.error || "Failed to initialize booking order.")

      // Direct fallback if testing environment simulated order
      if (orderData.order.id.startsWith("order_simulated_")) {
        const verifyRes = await fetch('http://localhost:5000/api/appointments/verify-and-book', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            razorpay_order_id: orderData.order.id,
            razorpay_payment_id: `pay_sim_${Date.now()}`,
            razorpay_signature: "simulated_signature",
            lab_id: labId,
            test_id: testId,
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
        setProcessingSlot(null)
        return
      }

      // Live Razorpay Checkout Window
      const options = {
        key: orderData.order.key_id || "rzp_test_TFKzAVaT3QPhY7",
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: "MedBook Diagnostics",
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
                lab_id: labId,
                test_id: testId,
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
            alert(`Payment succeeded, but booking failed: ${verifyErr.message}.`)
          } finally {
            setProcessingSlot(null)
          }
        },
        prefill: {
          name: user?.name || "Patient",
          email: user?.email || "",
          contact: user?.phone_number || "9999999999"
        },
        theme: {
          color: "#2563eb"
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

  if (error && !labDetails) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-red-50 text-red-700 rounded-3xl border border-red-100 text-center">
        <h3 className="text-xl font-bold mb-2">Error Loading Test Details</h3>
        <p className="text-sm mb-6">{error}</p>
        <Link to="/search/labs" className="px-6 py-2.5 bg-red-600 text-white font-semibold text-xs rounded-xl hover:bg-red-700 transition">
          Back to Directory
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 relative">

      {/* LOGIN REQUIRED MODAL */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center animate-fade-in-up">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
              🔐
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Login Required</h3>
            <p className="text-slate-500 text-sm mb-6">
              Please sign in as a Patient to book your diagnostic time slot and complete payment.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => navigate(`/login?redirect=/search/labs/${labId}/tests/${testId}`)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition shadow-md cursor-pointer text-xs"
              >
                Log In Now
              </button>
              <button
                onClick={() => setShowLoginModal(false)}
                className="w-full bg-slate-100 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-200 transition cursor-pointer text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM BOOKING & PAYOUT SPLIT MODAL */}
      {confirmSlotModal && labDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl animate-fade-in-up border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                  Razorpay Route Split
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-1">Payment & Payout Breakdown</h3>
              </div>
              <button
                onClick={() => setConfirmSlotModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            {/* APPOINTMENT SUMMARY */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 mb-5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Diagnostic Test:</span>
                <span className="font-bold text-slate-900">{labDetails.test_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Diagnostic Center:</span>
                <span className="font-bold text-slate-900">{labDetails.lab_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Scheduled Time:</span>
                <span className="font-bold text-blue-600">
                  {formatDateLabel(selectedDate)}, {formatTime(confirmSlotModal.start_time)} - {formatTime(confirmSlotModal.end_time)}
                </span>
              </div>
            </div>

            {/* PAYOUT SPLIT BREAKDOWN CARD */}
            <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white p-5 rounded-2xl shadow-lg mb-5 space-y-3">
              <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider block">
                Transparent Fee Distribution
              </span>

              <div className="space-y-2 text-sm pt-1 divide-y divide-slate-800">
                <div className="flex justify-between pt-1">
                  <span className="text-slate-300">Total Price:</span>
                  <span className="font-bold text-white">₹{parseFloat(labDetails.price).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-emerald-300 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Direct Lab Payout (90%):
                  </span>
                  <span className="font-bold text-emerald-400">₹{(parseFloat(labDetails.price) * 0.9).toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-slate-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                    Platform Tech Fee (10%):
                  </span>
                  <span className="font-semibold text-slate-300">₹{(parseFloat(labDetails.price) * 0.1).toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center gap-2 text-[11px] text-slate-400">
                <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Automated Razorpay Route transfer & 100% refund reversal on cancellation.</span>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setConfirmSlotModal(null)}
                className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3.5 rounded-xl transition text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => executeRazorpayCheckout(confirmSlotModal)}
                className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-emerald-600/20 text-xs cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Proceed & Pay ₹{labDetails.price}</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOOKING SUCCESS RECEIPT MODAL */}
      {bookingSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center animate-fade-in-up">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 animate-bounce">
              🎉
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-1">Appointment Confirmed!</h3>
            <p className="text-slate-500 text-xs mb-6">Your slot has been reserved. Summary details below:</p>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/80 text-left space-y-3 mb-6 text-sm">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Test</span>
                <span className="font-bold text-slate-900">{bookingSuccess.test_name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Diagnostic Center</span>
                <span className="font-bold text-slate-900">{bookingSuccess.lab_name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Scheduled Date</span>
                <span className="font-bold text-blue-600">{bookingSuccess.date}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Time Slot</span>
                <span className="font-bold text-blue-600">{bookingSuccess.time}</span>
              </div>
              <div className="flex justify-between pt-1 text-base">
                <span className="font-bold text-slate-900">Total Paid</span>
                <span className="font-extrabold text-green-600">₹{bookingSuccess.amount}</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/appointments')}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl transition shadow-md cursor-pointer text-xs"
            >
              View My Appointments
            </button>
          </div>
        </div>
      )}

      {/* MAIN LAYOUT */}
      <div className="max-w-6xl mx-auto">

        {/* LAB & TEST HEADER */}
        {labDetails && (
          <div className="bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-slate-200/80 mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                  {labDetails.lab_name}
                </span>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-3 mb-2">{labDetails.test_name}</h1>
                <p className="text-slate-500 text-sm max-w-2xl">{labDetails.description || 'Routine medical diagnostic analysis.'}</p>
                <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                  <span>📍</span> {labDetails.address_text}
                </p>
              </div>

              <div className="bg-blue-50/80 px-6 py-4 rounded-2xl border border-blue-100 text-center min-w-[140px]">
                <span className="text-xs font-bold text-blue-700 uppercase tracking-widest block mb-1">Test Price</span>
                <span className="text-3xl font-extrabold text-slate-900">₹{labDetails.price}</span>
              </div>
            </div>
          </div>
        )}

        {/* DATE SELECTOR PILLS */}
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200/80 mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4">1. Select Appointment Date</h2>

          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {dates.map((dateStr) => {
              const isSelected = selectedDate === dateStr;
              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`px-5 py-3.5 rounded-2xl font-semibold text-xs sm:text-sm whitespace-nowrap transition cursor-pointer flex flex-col items-center gap-1 min-w-[100px] border ${isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                >
                  <span className="opacity-90">{formatDateLabel(dateStr)}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* TIME SLOTS SELECTION */}
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200/80 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-900">2. Select Time Slot</h2>
            <span className="text-xs font-bold text-slate-400">Real-Time Capacity</span>
          </div>

          {isLoading ? (
            <div className="py-12 text-center">
              <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-slate-500 text-sm">Checking real-time slot availability...</p>
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-4xl block mb-3">🕒</span>
              <h3 className="text-lg font-bold text-slate-900 mb-1">No Time Slots Available</h3>
              <p className="text-slate-500 text-sm">Please select a different date for this diagnostic test.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableSlots.map((slot) => {
                const isPassed = checkIsSlotPassed(slot.start_time);
                const availableSeats = slot.available_seats !== undefined
                  ? slot.available_seats
                  : (parseInt(slot.max_capacity || 0, 10) - parseInt(slot.current_bookings || 0, 10));
                const isFull = availableSeats <= 0 || isPassed;
                const isProcessing = processingSlot === slot.slot_id;

                return (
                  <div
                    key={slot.slot_id}
                    className={`p-5 rounded-2xl border transition duration-200 flex flex-col justify-between ${isFull
                        ? 'bg-slate-100 border-slate-200 opacity-60'
                        : 'bg-white border-slate-200 hover:border-blue-500 hover:shadow-lg'
                      }`}
                  >
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-base font-bold text-slate-900">
                          {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${isFull
                            ? 'bg-slate-200 text-slate-600'
                            : 'bg-green-100 text-green-700'
                          }`}>
                          {isPassed ? 'Passed' : availableSeats > 0 ? `${availableSeats} Available` : 'Full'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSlotClick(slot)}
                      disabled={isFull || isProcessing}
                      className={`mt-4 w-full py-2.5 rounded-xl font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-2 ${isFull
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                        }`}
                    >
                      {isProcessing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Processing...</span>
                        </>
                      ) : isFull ? (
                        'Slot Unavailable'
                      ) : (
                        'Book & Pay Online →'
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
