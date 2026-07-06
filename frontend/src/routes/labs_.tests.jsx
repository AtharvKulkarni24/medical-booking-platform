import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/labs_/tests')({
  component: ManageTestsPage,
})

// Define the allowed popular tests outside the component
const popularTests = [
  { id: 1, name: 'Blood Test', description: 'Evaluates overall health and detects a wide range of disorders.', icon: '🩸' },
  { id: 2, name: 'Sonography Test', description: 'High-resolution ultrasound imaging for internal organ screening.', icon: '🩺' },
  { id: 3, name: 'Kidney Test', description: 'Evaluates how well your kidneys are filtering waste from your blood.', icon: '🫘' },
  { id: 4, name: 'Liver Test', description: 'Measures proteins, liver enzymes, and bilirubin in the blood.', icon: '🧪' },
  { id: 5, name: 'Sugar Test', description: 'Measures blood glucose levels to screen for and monitor diabetes.', icon: '📏' },
  { id: 6, name: 'Vitamin Test', description: 'Checks for essential vitamin deficiencies affecting bone and nerve health.', icon: '☀️' },
  { id: 7, name: 'Urine Test', description: 'Routine analysis to detect urinary tract infections and kidney issues.', icon: '💧' }
];

function ManageTestsPage() {
  const navigate = useNavigate()
  
  const [tests, setTests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Form Modal States
  const [editModalData, setEditModalData] = useState(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addForm, setAddForm] = useState({ test_name: '', price: '', description: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Action/Alert Modal States
  const [deleteConfirmData, setDeleteConfirmData] = useState(null) 
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Generic Info/Success/Error Modal
  const [infoModal, setInfoModal] = useState(null) 

  // Fetch Tests on Mount
  useEffect(() => {
    const fetchTests = async () => {
      const token = localStorage.getItem('accessToken')
      const userString = localStorage.getItem('user')
      const user = userString ? JSON.parse(userString) : null

      if (!token || user?.role !== 'lab') {
        navigate({ to: '/login', search: { redirect: '/labs/tests' } })
        return
      }

      try {
        const response = await fetch('http://localhost:5000/api/labs/tests', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const result = await response.json()

        if (!response.ok) throw new Error(result.error || result.message || 'Failed to fetch tests')

        setTests(result.tests || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTests()
  }, [navigate])

  // --- DELETE LOGIC ---
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

      if (!response.ok) throw new Error(result.error || result.message || 'Failed to delete test')

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

  // --- EDIT LOGIC ---
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
      if (!response.ok) throw new Error(result.error || result.message || 'Failed to update test')

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

  // --- ADD TEST LOGIC ---
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
      if (!response.ok) throw new Error(result.error || result.message || 'Failed to add test')

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
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-medium">Loading your tests...</p>
      </div>
    )
  }

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
            <button 
              onClick={() => setInfoModal(null)}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition"
            >
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
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Test?</h3>
            <p className="text-gray-600 mb-4 text-sm">
              Are you sure you want to delete <span className="font-bold">{deleteConfirmData.name}</span>?
            </p>
            <div className="bg-red-50 text-red-700 text-xs font-medium p-3 rounded-lg border border-red-100 mb-6 text-left">
              <strong>Note:</strong> Deletion will be blocked if there are active future bookings for this test.
            </div>
            <div className="flex flex-col gap-3">
              <button 
                onClick={executeDelete}
                disabled={isDeleting}
                className="w-full bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete it'}
              </button>
              <button 
                onClick={() => setDeleteConfirmData(null)}
                disabled={isDeleting}
                className="w-full bg-gray-50 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-100 transition border border-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------- */}
      {/* ADD TEST MODAL                        */}
      {/* ------------------------------------- */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 px-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New Test</h2>
            
            {formError && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">{formError}</div>}
            
            <form onSubmit={handleAddSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Test Name</label>
                  <select 
                    value={addForm.test_name} 
                    onChange={(e) => {
                      const selectedTest = popularTests.find(t => t.name === e.target.value);
                      setAddForm({
                        ...addForm, 
                        test_name: e.target.value,
                        // Auto-fill description if available
                        description: selectedTest ? selectedTest.description : addForm.description
                      })
                    }}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="" disabled>Select a test...</option>
                    {popularTests.map(test => (
                      <option key={test.id} value={test.name}>{test.icon} {test.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
                  <input 
                    type="number" 
                    min="0"
                    step="0.01"
                    value={addForm.price} 
                    onChange={(e) => setAddForm({...addForm, price: e.target.value})}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea 
                    rows="3"
                    value={addForm.description} 
                    onChange={(e) => setAddForm({...addForm, description: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  />
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 bg-green-600 text-white font-medium py-2.5 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Adding...' : 'Add Test'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setAddModalOpen(false)}
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

      {/* ------------------------------------- */}
      {/* EDIT TEST MODAL                       */}
      {/* ------------------------------------- */}
      {editModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 px-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Edit Test</h2>
            
            <div className="bg-yellow-50 text-yellow-800 text-xs font-medium p-3 rounded-lg border border-yellow-100 mb-6">
              <strong>Note:</strong> Editing a test will reset its status to <em>Pending Verification</em>. Price changes only apply to future bookings.
            </div>
            
            {formError && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">{formError}</div>}
            
            <form onSubmit={handleEditSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Test Name</label>
                  <select 
                    value={editModalData.test_name} 
                    onChange={(e) => setEditModalData({...editModalData, test_name: e.target.value})}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="" disabled>Select a test...</option>
                    {popularTests.map(test => (
                      <option key={test.id} value={test.name}>{test.icon} {test.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
                  <input 
                    type="number" 
                    min="0"
                    step="0.01"
                    value={editModalData.price} 
                    onChange={(e) => setEditModalData({...editModalData, price: e.target.value})}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea 
                    rows="3"
                    value={editModalData.description} 
                    onChange={(e) => setEditModalData({...editModalData, description: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  />
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 text-white font-medium py-2.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setEditModalData(null)}
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
      <div className="flex-1 p-6 md:p-10">
        <div className="max-w-5xl mx-auto">
          
          <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Tests</h1>
              <p className="text-gray-500">View, edit, or remove the diagnostic tests offered by your lab.</p>
            </div>
            <button 
              onClick={() => {
                setAddForm({ test_name: '', price: '', description: '' })
                setAddModalOpen(true)
                setFormError('')
              }}
              className="bg-blue-600 text-white font-medium px-5 py-2.5 rounded-xl hover:bg-blue-700 transition shadow-sm"
            >
              + Add New Test
            </button>
          </div>

          {error && (
            <div className="p-4 mb-6 bg-red-50 text-red-700 rounded-xl border border-red-100">
              {error}
            </div>
          )}

          {tests.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-gray-100 shadow-sm text-center">
              <span className="text-4xl block mb-4">🧪</span>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No tests available</h3>
              <p className="text-gray-500">You haven't added any diagnostic tests to your lab yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tests.map(test => (
                <div key={test.test_id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition flex flex-col">
                  
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-gray-900 pr-4">{test.test_name}</h3>
                    <span className="text-xl font-bold text-green-600">₹{test.price}</span>
                  </div>
                  
                  <div className="mb-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                      test.is_verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {test.is_verified ? 'Verified' : 'Pending Verification'}
                    </span>
                  </div>

                  <div className="mb-6 flex-grow">
                    <p className="text-sm text-gray-500 line-clamp-3">
                      {test.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-gray-100">
                    <button 
                      onClick={() => setEditModalData(test)}
                      className="flex-1 bg-blue-50 text-blue-700 font-medium py-2 rounded-lg hover:bg-blue-100 transition"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => triggerDelete(test.test_id, test.test_name)}
                      className="flex-1 bg-red-50 text-red-700 font-medium py-2 rounded-lg hover:bg-red-100 transition"
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

      {/* RIGHT SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-72 bg-white border-l border-gray-200 p-6 flex flex-col min-h-full shadow-sm">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 px-3">Lab Menu</h2>
        <nav className="flex flex-col gap-2">
          <Link to="/labs" className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition">
            <span className="text-lg">📊</span> Dashboard
          </Link>
          <Link to="/labs/tests" className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium bg-blue-50 text-blue-700 transition">
            <span className="text-lg">🧪</span> Manage Tests
          </Link>
          <Link to="/labs/slots" className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition">
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