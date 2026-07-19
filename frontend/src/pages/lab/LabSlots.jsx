import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'

const DAYS_OF_WEEK = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
];

export default function LabSlots() {
  const navigate = useNavigate()
  
  const [slots, setSlots] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [editModalData, setEditModalData] = useState(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [formData, setFormData] = useState({ day_of_week: 1, start_time: '', end_time: '', max_capacity: 1 })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const [deleteConfirmData, setDeleteConfirmData] = useState(null) 
  const [isDeleting, setIsDeleting] = useState(false)
  const [infoModal, setInfoModal] = useState(null) 

  useEffect(() => {
    const fetchSlots = async () => {
      const token = localStorage.getItem('accessToken')
      const userString = localStorage.getItem('user')
      const user = userString ? JSON.parse(userString) : null

      if (!token || user?.role !== 'lab') {
        navigate('/login?redirect=/labs/slots')
        return
      }

      try {
        const response = await fetch('http://localhost:5000/api/labs/slots', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const result = await response.json()

        if (!response.ok) throw new Error(result.error || 'Failed to fetch slots.')

        setSlots(result.slots || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSlots()
  }, [navigate])

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':')
    const date = new Date()
    date.setHours(h, m)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

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

      if (!response.ok) throw new Error(result.error || 'Failed to delete slot.')

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
      if (!response.ok) throw new Error(result.error || 'Failed to save slot.')

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
      start_time: slot.start_time.substring(0, 5),
      end_time: slot.end_time.substring(0, 5), 
      max_capacity: slot.max_capacity 
    })
    setFormError('')
    setEditModalData(slot)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-slate-50">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-600 font-medium">Loading time slots...</p>
      </div>
    )
  }

  const groupedSlots = slots.reduce((acc, slot) => {
    if (!acc[slot.day_of_week]) acc[slot.day_of_week] = [];
    acc[slot.day_of_week].push(slot);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row relative">
      
      {/* NOTIFICATION MODAL */}
      {infoModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center animate-fade-in-up">
            <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-4 ${
              infoModal.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
            }`}>
              <span className="text-3xl">{infoModal.type === 'success' ? '✅' : '❌'}</span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">{infoModal.title}</h3>
            <p className="text-slate-500 text-sm mb-6">{infoModal.message}</p>
            <button onClick={() => setInfoModal(null)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition cursor-pointer text-xs">
              Got it
            </button>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deleteConfirmData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center animate-fade-in-up">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 text-red-600 mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Delete Time Slot?</h3>
            <p className="text-slate-500 text-sm mb-4">
              Delete slot on <span className="font-bold text-slate-900">{deleteConfirmData.name}</span>?
            </p>
            <div className="bg-red-50 text-red-700 text-xs font-semibold p-3.5 rounded-xl border border-red-100 mb-6 text-left">
              <strong>Notice:</strong> Deletion is blocked if patients have already booked this slot.
            </div>
            <div className="flex gap-3">
              <button onClick={executeDelete} disabled={isDeleting} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition disabled:opacity-50 cursor-pointer text-xs">
                {isDeleting ? 'Deleting...' : 'Delete Slot'}
              </button>
              <button onClick={() => setDeleteConfirmData(null)} disabled={isDeleting} className="flex-1 bg-slate-100 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-200 transition cursor-pointer text-xs">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {(addModalOpen || editModalData) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-fade-in-up">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              {editModalData ? 'Edit Time Slot' : 'Add New Time Slot'}
            </h2>
            
            {formError && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-xs border border-red-100">{formError}</div>}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Day of the Week</label>
                <select 
                  value={formData.day_of_week} 
                  onChange={(e) => setFormData({...formData, day_of_week: e.target.value})}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-slate-900 bg-white"
                >
                  {DAYS_OF_WEEK.map((day, index) => (
                    <option key={index} value={index}>{day}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Start Time</label>
                  <input 
                    type="time" 
                    value={formData.start_time} 
                    onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                    required
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">End Time</label>
                  <input 
                    type="time" 
                    value={formData.end_time} 
                    onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                    required
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Max Patient Capacity</label>
                <input 
                  type="number" 
                  min="1"
                  value={formData.max_capacity} 
                  onChange={(e) => setFormData({...formData, max_capacity: e.target.value})}
                  required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-slate-900"
                />
                <p className="text-[11px] text-slate-400 mt-1">Maximum patients allowed in this exact time window.</p>
              </div>

              <div className="mt-8 flex gap-3 pt-4 border-t border-slate-100">
                <button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition disabled:opacity-50 cursor-pointer text-xs shadow-md">
                  {isSubmitting ? 'Saving...' : 'Save Slot'}
                </button>
                <button 
                  type="button" 
                  onClick={() => { setAddModalOpen(false); setEditModalData(null); }}
                  disabled={isSubmitting}
                  className="flex-1 bg-slate-100 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-200 transition cursor-pointer text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MAIN SCHEDULE AREA */}
      <div className="flex-1 p-6 md:p-10 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-8">
          
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                Weekly Template
              </span>
              <h1 className="text-3xl font-extrabold text-slate-900 mt-2">Manage Weekly Slots</h1>
              <p className="text-slate-500 text-sm mt-1">Configure your diagnostic lab's weekly recurring time slots.</p>
            </div>
            <button 
              onClick={openAddModal}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-5 py-3 rounded-xl shadow-md transition cursor-pointer"
            >
              + Add Time Slot
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100 text-sm">
              {error}
            </div>
          )}

          {slots.length === 0 ? (
            <div className="bg-white p-12 sm:p-16 rounded-3xl border border-slate-200/80 shadow-sm text-center max-w-md mx-auto">
              <span className="text-5xl block mb-4">🕒</span>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No Slots Defined</h3>
              <p className="text-slate-500 text-sm mb-6">Create your weekly recurring test schedule.</p>
              <button onClick={openAddModal} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-6 py-3 rounded-xl shadow-md transition cursor-pointer">
                Create First Slot
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {DAYS_OF_WEEK.map((dayName, dayIndex) => {
                const daySlots = groupedSlots[dayIndex];
                if (!daySlots || daySlots.length === 0) return null;

                return (
                  <div key={dayIndex} className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-sm">
                    <div className="bg-slate-50 px-8 py-4 border-b border-slate-200/80 flex items-center justify-between">
                      <h2 className="text-lg font-extrabold text-slate-900">{dayName}</h2>
                      <span className="text-xs font-bold text-slate-400">{daySlots.length} Slots</span>
                    </div>

                    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {daySlots.map(slot => (
                        <div key={slot.slot_id} className="glass-card p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                          <div>
                            <div className="text-base font-extrabold text-blue-700 bg-blue-50 py-2.5 px-3 rounded-xl text-center mb-3">
                              {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                            </div>
                            
                            <div className="flex justify-between items-center text-xs mb-4">
                              <span className="font-semibold text-slate-400">Max Capacity:</span>
                              <span className="font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
                                {slot.max_capacity} Patient{slot.max_capacity > 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-2 pt-3 border-t border-slate-100">
                            <button 
                              onClick={() => openEditModal(slot)}
                              className="flex-1 bg-slate-100 text-slate-700 text-xs font-semibold py-2 rounded-xl hover:bg-slate-200 transition cursor-pointer"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => triggerDelete(slot)}
                              className="flex-1 bg-red-50 text-red-600 text-xs font-semibold py-2 rounded-xl hover:bg-red-100 transition border border-red-100 cursor-pointer"
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

      {/* SIDEBAR */}
      <aside className="w-full md:w-72 bg-white border-l border-slate-200/90 p-6 flex flex-col justify-between shadow-sm shrink-0">
        <div>
          <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-6 px-3">Lab Control Center</h2>
          
          <nav className="flex flex-col gap-2">
            <Link to="/labs" className="flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition">
              <span>📊</span> Dashboard Overview
            </Link>
            <Link to="/labs/tests" className="flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition">
              <span>🧪</span> Manage Tests
            </Link>
            <Link to="/labs/slots" className="flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-xs bg-blue-50 text-blue-700 transition">
              <span>🕒</span> Time Slots
            </Link>
            <Link to="/labs/reviews" className="flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition">
              <span>⭐</span> Patient Reviews
            </Link>
          </nav>
        </div>
      </aside>
    </div>
  )
}
