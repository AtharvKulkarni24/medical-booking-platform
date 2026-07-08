import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/labs_/slots')({
  component: ManageSlotsPage,
})

const DAYS_OF_WEEK = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
];

function ManageSlotsPage() {
  const navigate = useNavigate()
  
  const [slots, setSlots] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Form Modal States
  const [editModalData, setEditModalData] = useState(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [formData, setFormData] = useState({ day_of_week: 1, start_time: '', end_time: '', max_capacity: 1 })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Action/Alert Modal States
  const [deleteConfirmData, setDeleteConfirmData] = useState(null) 
  const [isDeleting, setIsDeleting] = useState(false)
  const [infoModal, setInfoModal] = useState(null) 

  // Fetch Slots on Mount
  useEffect(() => {
    const fetchSlots = async () => {
      const token = localStorage.getItem('accessToken')
      const userString = localStorage.getItem('user')
      const user = userString ? JSON.parse(userString) : null

      if (!token || user?.role !== 'lab') {
        navigate({ to: '/login', search: { redirect: '/labs/slots' } })
        return
      }

      try {
        const response = await fetch('http://localhost:5000/api/labs/slots', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const result = await response.json()

        if (!response.ok) throw new Error(result.error || 'Failed to fetch slots')

        setSlots(result.slots || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSlots()
  }, [navigate])

  // --- HELPERS ---
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':')
    const date = new Date()
    date.setHours(h, m)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  // --- DELETE LOGIC ---
  const triggerDelete = (slot) => {
    setDeleteConfirmData({ 
      id: slot.slot_id, 
      name: `${DAYS_OF_WEEK[slot.day_of_week]} at ${formatTime(slot.start_time)}` 
    })
  }

  const executeDelete = async () => {
    if (!deleteConfirmData) return
    
    setIsDeleting(true)
    const token = localStorage.getItem('accessToken')
    
    try {
      const response = await fetch(`http://localhost:5000/api/labs/slots/${deleteConfirmData.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const result = await response.json()

      if (!response.ok) throw new Error(result.error || 'Failed to delete slot')

      setSlots(prev => prev.filter(s => s.slot_id !== deleteConfirmData.id))
      setDeleteConfirmData(null)
      setInfoModal({ type: 'success', title: 'Deleted', message: 'Time slot deleted successfully.' })
    } catch (err) {
      setDeleteConfirmData(null)
      setInfoModal({ type: 'error', title: 'Deletion Failed', message: err.message })
    } finally {
      setIsDeleting(false)
    }
  }

  // --- SUBMIT LOGIC (Add & Edit) ---
  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setFormError('')
    const token = localStorage.getItem('accessToken')

    const isEdit = !!editModalData
    const endpoint = isEdit 
      ? `http://localhost:5000/api/labs/slots/${editModalData.slot_id}` 
      : `http://localhost:5000/api/labs/slots`
    
    try {
      const response = await fetch(endpoint, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          day_of_week: parseInt(formData.day_of_week),
          start_time: formData.start_time,
          end_time: formData.end_time,
          max_capacity: parseInt(formData.max_capacity)
        })
      })
      
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to save slot')

      // Defensive check to ensure we get an object (handles backend returning row array or object)
      const savedSlot = Array.isArray(result.slot) ? result.slot[0] : result.slot;

      if (isEdit) {
        setSlots(prev => prev.map(s => s.slot_id === editModalData.slot_id ? savedSlot : s))
      } else {
        setSlots(prev => [...prev, savedSlot])
      }

      setAddModalOpen(false)
      setEditModalData(null)
      setInfoModal({ type: 'success', title: 'Success', message: `Slot ${isEdit ? 'updated' : 'added'} successfully.` })
      
    } catch (err) {
      setFormError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const openAddModal = () => {
    setFormData({ day_of_week: 1, start_time: '', end_time: '', max_capacity: 1 })
    setFormError('')
    setAddModalOpen(true)
  }

  const openEditModal = (slot) => {
    setFormData({ 
      day_of_week: slot.day_of_week, 
      start_time: slot.start_time.substring(0, 5), // HTML time input needs HH:mm
      end_time: slot.end_time.substring(0, 5), 
      max_capacity: slot.max_capacity 
    })
    setFormError('')
    setEditModalData(slot)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-medium">Loading your time slots...</p>
      </div>
    )
  }

  // Group slots by day of week for clean rendering (0 = Sunday, 6 = Saturday)
  const groupedSlots = slots.reduce((acc, slot) => {
    if (!acc[slot.day_of_week]) acc[slot.day_of_week] = [];
    acc[slot.day_of_week].push(slot);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row relative">
      
      {/* ------------------------------------- */}
      {/* INFO / ALERT MODAL                    */}
      {/* ------------------------------------- */}
      {infoModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60 px-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-sm w-full shadow-2xl text-center animate-fade-in-up">
            <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-4 ${
              infoModal.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
            }`}>
              <span className="text-3xl">{infoModal.type === 'success' ? '✅' : '❌'}</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{infoModal.title}</h3>
            <p className="text-gray-600 mb-6">{infoModal.message}</p>
            <button onClick={() => setInfoModal(null)} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition">
              Got it
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------- */}
      {/* CONFIRM DELETE MODAL                  */}
      {/* ------------------------------------- */}
      {deleteConfirmData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 px-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-sm w-full shadow-2xl text-center animate-fade-in-up">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Slot?</h3>
            <p className="text-gray-600 mb-4 text-sm">
              Are you sure you want to delete the slot on <span className="font-bold">{deleteConfirmData.name}</span>?
            </p>
            <div className="bg-red-50 text-red-700 text-xs font-medium p-3 rounded-lg border border-red-100 mb-6 text-left">
              <strong>Note:</strong> Deletion is blocked if patients have already booked this slot for upcoming dates.
            </div>
            <div className="flex gap-3">
              <button onClick={executeDelete} disabled={isDeleting} className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition disabled:opacity-50">
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button onClick={() => setDeleteConfirmData(null)} disabled={isDeleting} className="flex-1 bg-gray-50 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-100 transition border border-gray-200">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------- */}
      {/* FORM MODAL (ADD / EDIT)               */}
      {/* ------------------------------------- */}
      {(addModalOpen || editModalData) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 px-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editModalData ? 'Edit Time Slot' : 'Add New Time Slot'}
            </h2>
            
            {formError && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">{formError}</div>}
            
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Day of the Week</label>
                  <select 
                    value={formData.day_of_week} 
                    onChange={(e) => setFormData({...formData, day_of_week: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {DAYS_OF_WEEK.map((day, index) => (
                      <option key={index} value={index}>{day}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                    <input 
                      type="time" 
                      value={formData.start_time} 
                      onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                    <input 
                      type="time" 
                      value={formData.end_time} 
                      onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Capacity</label>
                  <input 
                    type="number" 
                    min="1"
                    value={formData.max_capacity} 
                    onChange={(e) => setFormData({...formData, max_capacity: e.target.value})}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">Number of patients that can book this exact time slot per day.</p>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 text-white font-medium py-2.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
                  {isSubmitting ? 'Saving...' : 'Save Slot'}
                </button>
                <button 
                  type="button" 
                  onClick={() => { setAddModalOpen(false); setEditModalData(null); }}
                  disabled={isSubmitting}
                  className="flex-1 bg-gray-100 text-gray-700 font-medium py-2.5 rounded-lg hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 p-6 md:p-10 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          
          <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Weekly Slots</h1>
              <p className="text-gray-500">Define your lab's weekly schedule template for online bookings.</p>
            </div>
            <button 
              onClick={openAddModal}
              className="bg-blue-600 text-white font-medium px-5 py-2.5 rounded-xl hover:bg-blue-700 transition shadow-sm whitespace-nowrap"
            >
              + Add Time Slot
            </button>
          </div>

          {error && (
            <div className="p-4 mb-6 bg-red-50 text-red-700 rounded-xl border border-red-100">
              {error}
            </div>
          )}

          {slots.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-gray-100 shadow-sm text-center">
              <span className="text-4xl block mb-4">🕒</span>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No slots defined</h3>
              <p className="text-gray-500 mb-6">You haven't set up your weekly schedule yet.</p>
              <button onClick={openAddModal} className="bg-blue-600 text-white font-medium px-6 py-2 rounded-lg hover:bg-blue-700 transition">
                Create First Slot
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {DAYS_OF_WEEK.map((dayName, dayIndex) => {
                const daySlots = groupedSlots[dayIndex];
                if (!daySlots || daySlots.length === 0) return null;

                return (
                  <div key={dayIndex} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                      <h2 className="text-lg font-bold text-gray-900">{dayName}</h2>
                    </div>
                    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {daySlots.map(slot => (
                        <div key={slot.slot_id} className="border border-gray-100 rounded-xl p-4 hover:border-blue-200 hover:shadow-md transition bg-white flex flex-col">
                          
                          <div className="text-lg font-bold text-gray-900 mb-1 text-center bg-blue-50 py-2 rounded-lg text-blue-800">
                            {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                          </div>
                          
                          <div className="flex justify-between items-center my-4 px-2">
                            <span className="text-sm font-medium text-gray-500">Capacity:</span>
                            <span className="text-sm font-bold bg-gray-100 px-3 py-1 rounded-full text-gray-700">
                              {slot.max_capacity} patient{slot.max_capacity > 1 ? 's' : ''}
                            </span>
                          </div>

                          <div className="flex gap-2 mt-auto pt-4 border-t border-gray-50">
                            <button 
                              onClick={() => openEditModal(slot)}
                              className="flex-1 bg-gray-50 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-100 transition border border-gray-200"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => triggerDelete(slot)}
                              className="flex-1 bg-red-50 text-red-700 text-sm font-medium py-2 rounded-lg hover:bg-red-100 transition border border-red-100"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

        </div>
      </div>

      {/* RIGHT SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-72 bg-white border-l border-gray-200 p-6 flex flex-col min-h-full shadow-sm shrink-0">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 px-3">Lab Menu</h2>
        <nav className="flex flex-col gap-2">
          <Link to="/labs" className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition">
            <span className="text-lg">📊</span> Dashboard
          </Link>
          <Link to="/labs/tests" className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition">
            <span className="text-lg">🧪</span> Manage Tests
          </Link>
          <Link to="/labs/slots" className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium bg-blue-50 text-blue-700 transition">
            <span className="text-lg">🕒</span> Time Slots
          </Link>
          <Link to="/labs/reviews" className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition">
            <span className="text-lg">⭐</span> Patient Reviews
          </Link>
        </nav>
      </aside>

    </div>
  )
}