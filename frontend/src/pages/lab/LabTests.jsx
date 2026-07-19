import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'

const popularTests = [
  { id: 1, name: 'Blood Test', description: 'Evaluates overall health and detects a wide range of disorders.', icon: '🩸' },
  { id: 2, name: 'Sonography Test', description: 'High-resolution ultrasound imaging for internal organ screening.', icon: '🩺' },
  { id: 3, name: 'Kidney Test', description: 'Evaluates how well your kidneys are filtering waste from your blood.', icon: '🫘' },
  { id: 4, name: 'Liver Test', description: 'Measures proteins, liver enzymes, and bilirubin in the blood.', icon: '🧪' },
  { id: 5, name: 'Sugar Test', description: 'Measures blood glucose levels to screen for and monitor diabetes.', icon: '📏' },
  { id: 6, name: 'Vitamin Test', description: 'Checks for essential vitamin deficiencies affecting bone and nerve health.', icon: '☀️' },
  { id: 7, name: 'Urine Test', description: 'Routine analysis to detect urinary tract infections and kidney issues.', icon: '💧' },
  { id: 8, name: 'Thyroid Profile', description: 'Checks T3, T4 and TSH levels to evaluate thyroid gland health.', icon: '🦋' }
];

export default function LabTests() {
  const navigate = useNavigate()
  
  const [tests, setTests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [editModalData, setEditModalData] = useState(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addForm, setAddForm] = useState({ test_name: '', price: '', description: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const [deleteConfirmData, setDeleteConfirmData] = useState(null) 
  const [isDeleting, setIsDeleting] = useState(false)
  const [infoModal, setInfoModal] = useState(null) 

  useEffect(() => {
    const fetchTests = async () => {
      const token = localStorage.getItem('accessToken')
      const userString = localStorage.getItem('user')
      const user = userString ? JSON.parse(userString) : null

      if (!token || user?.role !== 'lab') {
        navigate('/login?redirect=/labs/tests')
        return
      }

      try {
        const response = await fetch('http://localhost:5000/api/labs/tests', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const result = await response.json()

        if (!response.ok) throw new Error(result.error || result.message || 'Failed to fetch tests.')

        setTests(result.tests || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTests()
  }, [navigate])

  const triggerDelete = (testId, testName) => {
    setDeleteConfirmData({ id: testId, name: testName })
  }

  const executeDelete = async () => {
    if (!deleteConfirmData) return
    
    setIsDeleting(true)
    const token = localStorage.getItem('accessToken')
    
    try {
      const response = await fetch(`http://localhost:5000/api/labs/tests/${deleteConfirmData.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const result = await response.json()

      if (!response.ok) throw new Error(result.error || result.message || 'Failed to delete test.')

      setTests(prev => prev.filter(t => t.test_id !== deleteConfirmData.id))
      setDeleteConfirmData(null)
      setInfoModal({
        type: 'success',
        title: 'Deleted Successfully',
        message: 'The test has been permanently removed from your catalog.'
      })
    } catch (err) {
      setDeleteConfirmData(null)
      setInfoModal({
        type: 'error',
        title: 'Deletion Failed',
        message: err.message
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setFormError('')
    const token = localStorage.getItem('accessToken')

    try {
      const response = await fetch(`http://localhost:5000/api/labs/tests/${editModalData.test_id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          test_name: editModalData.test_name,
          description: editModalData.description,
          price: editModalData.price
        })
      })
      
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || result.message || 'Failed to update test.')

      const updatedTest = Array.isArray(result.test) ? result.test[0] : result.test;

      setTests(prev => prev.map(t => t.test_id === editModalData.test_id ? updatedTest : t))
      setEditModalData(null)
      setInfoModal({
        type: 'success',
        title: 'Update Successful',
        message: "Test updated successfully. It has been marked as 'Pending Verification' and will be reviewed shortly."
      })
      
    } catch (err) {
      setFormError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setFormError('')
    const token = localStorage.getItem('accessToken')

    try {
      const response = await fetch(`http://localhost:5000/api/labs/tests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(addForm)
      })
      
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || result.message || 'Failed to add test.')

      const newTest = Array.isArray(result.test) ? result.test[0] : result.test;

      setTests(prev => [...prev, newTest])
      setAddModalOpen(false)
      setAddForm({ test_name: '', price: '', description: '' })
      setInfoModal({
        type: 'success',
        title: 'Test Added',
        message: "Your new test has been added to the catalog and is pending verification."
      })
      
    } catch (err) {
      setFormError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-slate-50">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-600 font-medium">Loading catalog tests...</p>
      </div>
    )
  }

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
            <button 
              onClick={() => setInfoModal(null)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition cursor-pointer text-xs"
            >
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
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Delete Test?</h3>
            <p className="text-slate-500 text-sm mb-4">
              Are you sure you want to delete <span className="font-bold text-slate-900">{deleteConfirmData.name}</span>?
            </p>
            <div className="bg-red-50 text-red-700 text-xs font-semibold p-3.5 rounded-xl border border-red-100 mb-6 text-left">
              <strong>Notice:</strong> Deletion is blocked if patients have active upcoming bookings for this test.
            </div>
            <div className="flex gap-3">
              <button 
                onClick={executeDelete}
                disabled={isDeleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition disabled:opacity-50 cursor-pointer text-xs"
              >
                {isDeleting ? 'Deleting...' : 'Delete Test'}
              </button>
              <button 
                onClick={() => setDeleteConfirmData(null)}
                disabled={isDeleting}
                className="flex-1 bg-slate-100 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-200 transition cursor-pointer text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD TEST MODAL */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-fade-in-up">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Add Diagnostic Test</h2>
            
            {formError && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-xs border border-red-100">{formError}</div>}
            
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Select Test Name</label>
                <select 
                  value={addForm.test_name} 
                  onChange={(e) => {
                    const selectedTest = popularTests.find(t => t.name === e.target.value);
                    setAddForm({
                      ...addForm, 
                      test_name: e.target.value,
                      description: selectedTest ? selectedTest.description : addForm.description
                    })
                  }}
                  required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm font-medium text-slate-900"
                >
                  <option value="" disabled>Choose diagnostic test...</option>
                  {popularTests.map(test => (
                    <option key={test.id} value={test.name}>{test.icon} {test.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Test Price (₹)</label>
                <input 
                  type="number" 
                  min="0"
                  step="0.01"
                  value={addForm.price} 
                  onChange={(e) => setAddForm({...addForm, price: e.target.value})}
                  required
                  placeholder="e.g. 499"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Test Description</label>
                <textarea 
                  rows="3"
                  value={addForm.description} 
                  onChange={(e) => setAddForm({...addForm, description: e.target.value})}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-slate-900 resize-none"
                  placeholder="Describe pre-requisites or details..."
                />
              </div>

              <div className="mt-8 flex gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition disabled:opacity-50 cursor-pointer text-xs shadow-md"
                >
                  {isSubmitting ? 'Adding...' : 'Add to Catalog'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setAddModalOpen(false)}
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

      {/* EDIT TEST MODAL */}
      {editModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-fade-in-up">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Edit Test Details</h2>
            <p className="text-slate-500 text-xs mb-6">Price changes apply only to new future bookings.</p>
            
            {formError && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-xs border border-red-100">{formError}</div>}
            
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Test Name</label>
                <input 
                  type="text"
                  value={editModalData.test_name} 
                  onChange={(e) => setEditModalData({...editModalData, test_name: e.target.value})}
                  required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Price (₹)</label>
                <input 
                  type="number" 
                  min="0"
                  step="0.01"
                  value={editModalData.price} 
                  onChange={(e) => setEditModalData({...editModalData, price: e.target.value})}
                  required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Description</label>
                <textarea 
                  rows="3"
                  value={editModalData.description} 
                  onChange={(e) => setEditModalData({...editModalData, description: e.target.value})}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-slate-900 resize-none"
                />
              </div>

              <div className="mt-8 flex gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition disabled:opacity-50 cursor-pointer text-xs shadow-md"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setEditModalData(null)}
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

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 p-6 md:p-10 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-8">
          
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                Diagnostic Catalog
              </span>
              <h1 className="text-3xl font-extrabold text-slate-900 mt-2">Manage Diagnostic Tests</h1>
              <p className="text-slate-500 text-sm mt-1">View, edit, or publish tests offered by your diagnostic laboratory.</p>
            </div>
            <button 
              onClick={() => {
                setAddForm({ test_name: '', price: '', description: '' })
                setAddModalOpen(true)
                setFormError('')
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-5 py-3 rounded-xl shadow-md transition cursor-pointer"
            >
              + Add New Test
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100 text-sm">
              {error}
            </div>
          )}

          {tests.length === 0 ? (
            <div className="bg-white p-12 sm:p-16 rounded-3xl border border-slate-200/80 shadow-sm text-center max-w-md mx-auto">
              <span className="text-5xl block mb-4">🧪</span>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No Tests Published</h3>
              <p className="text-slate-500 text-sm mb-6">Publish diagnostic tests to receive patient appointments.</p>
              <button 
                onClick={() => setAddModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-6 py-3 rounded-xl shadow-md transition cursor-pointer"
              >
                Add Your First Test
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tests.map(test => (
                <div key={test.test_id} className="glass-card hover-lift p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl transition duration-300 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-4 mb-3">
                      <h3 className="text-xl font-extrabold text-slate-900">{test.test_name}</h3>
                      <span className="text-2xl font-extrabold text-green-600">₹{test.price}</span>
                    </div>
                    
                    <div className="mb-4">
                      <span className={`px-3 py-0.5 rounded-full text-xs font-bold ${
                        test.is_verified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {test.is_verified ? '✓ Verified Test' : 'Pending Verification'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed mb-6 line-clamp-3">
                      {test.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-slate-100">
                    <button 
                      onClick={() => setEditModalData(test)}
                      className="flex-1 bg-slate-100 text-slate-700 font-semibold text-xs py-2.5 rounded-xl hover:bg-slate-200 transition cursor-pointer"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => triggerDelete(test.test_id, test.test_name)}
                      className="flex-1 bg-red-50 text-red-600 font-semibold text-xs py-2.5 rounded-xl hover:bg-red-100 transition border border-red-100 cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
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
            <Link to="/labs/tests" className="flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-xs bg-blue-50 text-blue-700 transition">
              <span>🧪</span> Manage Tests
            </Link>
            <Link to="/labs/slots" className="flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition">
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
