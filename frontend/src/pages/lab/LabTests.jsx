import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'

export default function LabTests() {
  const navigate = useNavigate()
  
  const [tests, setTests] = useState([])
  const [categories, setCategories] = useState([])
  const [masterTests, setMasterTests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [editModalData, setEditModalData] = useState(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [addForm, setAddForm] = useState({
    test_name: '',
    price: '',
    description: '',
    category_id: '',
    master_test_id: '',
    sample_type: 'Blood',
    fasting_required: false,
    turnaround_hours: 24
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const [deleteConfirmData, setDeleteConfirmData] = useState(null) 
  const [isDeleting, setIsDeleting] = useState(false)
  const [infoModal, setInfoModal] = useState(null) 

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('accessToken')
      const userString = localStorage.getItem('user')
      const user = userString ? JSON.parse(userString) : null

      if (!token || user?.role !== 'lab') {
        navigate('/login?redirect=/labs/tests')
        return
      }

      try {
        const [testsRes, catRes, masterRes] = await Promise.all([
          fetch('http://localhost:5000/api/labs/tests', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('http://localhost:5000/api/search/categories'),
          fetch('http://localhost:5000/api/search/master-tests')
        ])

        const testsData = await testsRes.json()
        const catData = await catRes.json()
        const masterData = await masterRes.json()

        if (!testsRes.ok) throw new Error(testsData.error || testsData.message || 'Failed to fetch tests.')

        setTests(testsData.tests || [])
        if (catData.success) setCategories(catData.categories || [])
        if (masterData.success) setMasterTests(masterData.master_tests || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [navigate])

  const handleTemplateSelect = (templateId) => {
    setSelectedTemplateId(templateId)
    if (!templateId || templateId === 'custom') {
      setAddForm(prev => ({
        ...prev,
        master_test_id: '',
        category_id: categories[0]?.category_id || ''
      }))
      return
    }

    const tpl = masterTests.find(m => m.master_test_id.toString() === templateId.toString())
    if (tpl) {
      setAddForm({
        test_name: tpl.test_name,
        price: addForm.price || '',
        description: tpl.description || '',
        category_id: tpl.category_id || '',
        master_test_id: tpl.master_test_id,
        sample_type: tpl.sample_type || 'Blood',
        fasting_required: Boolean(tpl.fasting_required),
        turnaround_hours: tpl.turnaround_hours || 24
      })
    }
  }

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
        body: JSON.stringify(editModalData)
      })
      
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || result.message || 'Failed to update test.')

      const updatedTest = result.test;

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

      const newTest = result.test;

      setTests(prev => [...prev, newTest])
      setAddModalOpen(false)
      setSelectedTemplateId('')
      setAddForm({
        test_name: '',
        price: '',
        description: '',
        category_id: '',
        master_test_id: '',
        sample_type: 'Blood',
        fasting_required: false,
        turnaround_hours: 24
      })
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl my-8 animate-fade-in-up">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Add Diagnostic Test</h2>
            
            {formError && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-xs border border-red-100">{formError}</div>}
            
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Standard Master Template</label>
                <select 
                  value={selectedTemplateId} 
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm font-medium text-slate-900"
                >
                  <option value="">Choose standard test template (Auto-fills info)...</option>
                  {masterTests.map(mt => (
                    <option key={mt.master_test_id} value={mt.master_test_id}>
                      {mt.category_icon || '🧪'} {mt.test_name} ({mt.category_name})
                    </option>
                  ))}
                  <option value="custom">✏️ Custom / Unlisted Test</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Test Name</label>
                <input 
                  type="text"
                  value={addForm.test_name}
                  onChange={(e) => setAddForm({...addForm, test_name: e.target.value})}
                  required
                  placeholder="e.g. Complete Blood Count"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Category</label>
                <select 
                  value={addForm.category_id} 
                  onChange={(e) => setAddForm({...addForm, category_id: e.target.value})}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm font-medium text-slate-900"
                >
                  <option value="">Select category...</option>
                  {categories.map(c => (
                    <option key={c.category_id} value={c.category_id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Price (₹)</label>
                  <input 
                    type="number" 
                    min="0"
                    step="0.01"
                    value={addForm.price} 
                    onChange={(e) => setAddForm({...addForm, price: e.target.value})}
                    required
                    placeholder="499"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Turnaround (Hrs)</label>
                  <input 
                    type="number" 
                    min="1"
                    value={addForm.turnaround_hours} 
                    onChange={(e) => setAddForm({...addForm, turnaround_hours: e.target.value})}
                    placeholder="24"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Sample Type</label>
                  <select
                    value={addForm.sample_type}
                    onChange={(e) => setAddForm({...addForm, sample_type: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-medium text-slate-900"
                  >
                    <option value="Blood">🩸 Blood</option>
                    <option value="Urine">💧 Urine</option>
                    <option value="Ultrasound">🩺 Ultrasound</option>
                    <option value="Swab">🧪 Swab</option>
                    <option value="Imaging">📷 Imaging</option>
                    <option value="Other">📋 Other</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input 
                    type="checkbox"
                    id="add_fasting"
                    checked={addForm.fasting_required}
                    onChange={(e) => setAddForm({...addForm, fasting_required: e.target.checked})}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label htmlFor="add_fasting" className="text-xs font-bold text-slate-700 cursor-pointer">
                    🍽️ Fasting Required
                  </label>
                </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl my-8 animate-fade-in-up">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Edit Diagnostic Test</h2>
            
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
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Category</label>
                <select 
                  value={editModalData.category_id || ''} 
                  onChange={(e) => setEditModalData({...editModalData, category_id: e.target.value})}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm font-medium text-slate-900"
                >
                  <option value="">Select category...</option>
                  {categories.map(c => (
                    <option key={c.category_id} value={c.category_id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Turnaround (Hrs)</label>
                  <input 
                    type="number" 
                    min="1"
                    value={editModalData.turnaround_hours || 24} 
                    onChange={(e) => setEditModalData({...editModalData, turnaround_hours: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Sample Type</label>
                  <select
                    value={editModalData.sample_type || 'Blood'}
                    onChange={(e) => setEditModalData({...editModalData, sample_type: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-medium text-slate-900"
                  >
                    <option value="Blood">🩸 Blood</option>
                    <option value="Urine">💧 Urine</option>
                    <option value="Ultrasound">🩺 Ultrasound</option>
                    <option value="Swab">🧪 Swab</option>
                    <option value="Imaging">📷 Imaging</option>
                    <option value="Other">📋 Other</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input 
                    type="checkbox"
                    id="edit_fasting"
                    checked={Boolean(editModalData.fasting_required)}
                    onChange={(e) => setEditModalData({...editModalData, fasting_required: e.target.checked})}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label htmlFor="edit_fasting" className="text-xs font-bold text-slate-700 cursor-pointer">
                    🍽️ Fasting Required
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Test Description</label>
                <textarea 
                  rows="3"
                  value={editModalData.description || ''} 
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
                setSelectedTemplateId('')
                setAddForm({
                  test_name: '',
                  price: '',
                  description: '',
                  category_id: categories[0]?.category_id || '',
                  master_test_id: '',
                  sample_type: 'Blood',
                  fasting_required: false,
                  turnaround_hours: 24
                })
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
                    <div className="flex justify-between items-start gap-4 mb-2">
                      <h3 className="text-xl font-extrabold text-slate-900">{test.test_name}</h3>
                      <span className="text-2xl font-extrabold text-green-600">₹{test.price}</span>
                    </div>
                    
                    {/* BADGES ROW */}
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        test.is_verified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {test.is_verified ? '✓ Verified' : 'Pending Verification'}
                      </span>

                      {test.category_name && (
                        <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-blue-100">
                          {test.category_icon || '🧪'} {test.category_name}
                        </span>
                      )}

                      {test.fasting_required && (
                        <span className="bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-amber-200">
                          🍽️ Fasting
                        </span>
                      )}

                      {test.sample_type && (
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[11px] font-medium">
                          {test.sample_type}
                        </span>
                      )}
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
