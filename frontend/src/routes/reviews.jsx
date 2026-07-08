import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

export const Route = createFileRoute('/reviews')({
  component: Reviews,
})

function Reviews() {
  const navigate = useNavigate()
  
  const { user, token, loading: authLoading } = useAuth()

  // Data State
  const [completedAppointments, setCompletedAppointments] = useState([]);
  const [pastReviews, setPastReviews] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState('');
  
  // UI State
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'past'
  
  // Form State
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Security Redirect
  useEffect(() => {
    if (!authLoading) {
      if (!user) navigate({ to: '/login', replace: true })
      else if (user.role !== 'patient') navigate({ to: user.role === 'lab' ? '/labs' : '/', replace: true })
    }
  }, [user, authLoading, navigate])

  // Fetch Initial Data
  useEffect(() => {
    if (user && user.role === 'patient') {
      fetchReviewData();
    }
  }, [user]);

  const fetchReviewData = async () => {
    try {
      setDataLoading(true);
      setError('');
      
      const headers = { 
        'Authorization': `Bearer ${token}`, 
        'Content-Type': 'application/json' 
      };

      const [appointmentsRes, reviewsRes] = await Promise.all([
        fetch('http://localhost:5000/api/patients/appointments/completed', { headers }),
        fetch('http://localhost:5000/api/patients/reviews/past', { headers })
      ]);
      
      if (!appointmentsRes.ok || !reviewsRes.ok) {
        throw new Error('Failed to fetch dashboard data (Unauthorized or Server Error)');
      }

      const appointmentsData = await appointmentsRes.json();
      const reviewsData = await reviewsRes.json();

      setCompletedAppointments(appointmentsData);
      setPastReviews(reviewsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setDataLoading(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAppointmentId) return;

    setError('');
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`http://localhost:5000/api/reviews/appointment/${selectedAppointmentId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ rating, comment })
      });

      const data = await response.json();

      if (response.status === 409) {
        throw new Error("You have already submitted a review for this appointment.");
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      setSelectedAppointmentId(null);
      setRating(5);
      setComment('');
      
      await fetchReviewData();
      setActiveTab('past');
      
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper formatting function for the time
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const date = new Date();
    date.setHours(h, m);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  if (authLoading || dataLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-medium">Loading your reviews...</p>
      </div>
    )
  }

  const pendingReviews = completedAppointments.filter(
    app => !pastReviews.some(review => review.appointment_id === app.id)
  );

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 relative">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Reviews</h1>
          <p className="text-gray-500">Share your feedback or view past reviews from your diagnostic tests.</p>
        </div>
        
        {/* Error Alert */}
        {error && (
          <div className="p-4 mb-6 bg-red-50 text-red-700 rounded-xl border border-red-100">
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-4 border-b border-gray-200 mb-6">
          <button 
            onClick={() => setActiveTab('pending')}
            className={`pb-4 px-2 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === 'pending' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Pending Reviews ({pendingReviews.length})
          </button>
          <button 
            onClick={() => setActiveTab('past')}
            className={`pb-4 px-2 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === 'past' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Past Reviews ({pastReviews.length})
          </button>
        </div>

        {/* SECTION 1: PENDING REVIEWS */}
        {activeTab === 'pending' && (
          <div>
            {pendingReviews.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-gray-100 shadow-sm text-center">
                <span className="text-4xl block mb-4">🎉</span>
                <h3 className="text-xl font-bold text-gray-900 mb-2">You're all caught up!</h3>
                <p className="text-gray-500 mb-6">All your completed appointments have been reviewed.</p>
                <button onClick={() => setActiveTab('past')} className="inline-block bg-blue-600 text-white font-medium px-6 py-3 rounded-xl hover:bg-blue-700 transition">
                  View Past Reviews
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {pendingReviews.map((app) => (
                  <div key={app.id} className="block">
                    {/* Main Card */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col md:flex-row gap-6 justify-between hover:shadow-md transition">
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                            Needs Review
                          </span>
                          <span className="text-sm font-medium text-gray-500 font-mono">ID: {app.id}</span>
                        </div>
                        
                        <h3 className="text-xl font-bold text-gray-900 mb-1">{app.test_name}</h3>
                        <p className="text-gray-600 font-medium">{app.lab_name}</p>
                        
                        <div className="text-sm text-gray-500 mt-3 space-y-1">
                          <p className="flex items-center gap-2">
                            <span>📅</span> {new Date(app.appointment_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                          </p>
                          {app.start_time && app.end_time && (
                            <p className="flex items-center gap-2">
                              <span>⏰</span> {formatTime(app.start_time)} <span>-</span>{formatTime(app.end_time)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col md:items-end justify-center md:pl-6 md:border-l border-gray-100 min-w-[200px] mt-4 md:mt-0">
                        {selectedAppointmentId === app.id ? (
                          <button onClick={() => setSelectedAppointmentId(null)} className="w-full py-2.5 px-4 rounded-xl font-medium transition-all bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200">
                            Cancel
                          </button>
                        ) : (
                          <button onClick={() => setSelectedAppointmentId(app.id)} className="w-full py-2.5 px-4 rounded-xl font-medium transition-all bg-blue-600 text-white hover:bg-blue-700">
                            Write Review
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expandable Form Modal */}
                    {selectedAppointmentId === app.id && (
                      <div className="bg-blue-50 border border-blue-100 p-6 md:p-8 rounded-2xl mt-4 shadow-inner">
                        <h4 className="font-bold text-gray-900 text-lg mb-4">Submit Feedback for {app.lab_name}</h4>
                        <form onSubmit={handleReviewSubmit} className="space-y-5">
                          
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Overall Rating</label>
                            <select 
                              value={rating} 
                              onChange={(e) => setRating(Number(e.target.value))} 
                              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm font-medium"
                            >
                              <option value="5">⭐⭐⭐⭐⭐ (5/5 - Excellent)</option>
                              <option value="4">⭐⭐⭐⭐ (4/5 - Very Good)</option>
                              <option value="3">⭐⭐⭐ (3/5 - Average)</option>
                              <option value="2">⭐⭐ (2/5 - Poor)</option>
                              <option value="1">⭐ (1/5 - Terrible)</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Your Experience</label>
                            <textarea 
                              rows="4" 
                              value={comment} 
                              onChange={(e) => setComment(e.target.value)} 
                              className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 bg-white shadow-sm" 
                              placeholder={`How was the staff at ${app.lab_name}? Was the environment clean? Tell us about your visit...`}
                              required 
                            />
                          </div>
                          
                          <button 
                            type="submit" 
                            disabled={isSubmitting} 
                            className="w-full py-3 bg-green-600 hover:bg-green-700 transition text-white font-bold rounded-xl disabled:opacity-70 shadow-sm"
                          >
                            {isSubmitting ? 'Submitting...' : 'Submit Review'}
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 2: PAST REVIEWS */}
        {activeTab === 'past' && (
          <div>
            {pastReviews.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-gray-100 shadow-sm text-center">
                <span className="text-4xl block mb-4">📝</span>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No past reviews</h3>
                <p className="text-gray-500 mb-6">You haven't submitted any feedback yet.</p>
                {pendingReviews.length > 0 && (
                  <button onClick={() => setActiveTab('pending')} className="inline-block bg-blue-600 text-white font-medium px-6 py-3 rounded-xl hover:bg-blue-700 transition">
                    Review Pending Appointments
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {pastReviews.map((review) => (
                  <div key={review.review_id} className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition">
                    
                    <div className="mb-4">
                      <h4 className="font-bold text-gray-900 text-lg mb-1">{review.test_name}</h4>
                      <p className="text-gray-500 font-medium text-sm">{review.lab_name}</p>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between md:items-center mb-4">
                      <div className="mb-2 md:mb-0">
                        <div className="flex items-center text-lg">
                          <span className="text-yellow-400">{"⭐".repeat(review.rating)}</span>
                          {review.rating < 5 && (
                            <span className="text-gray-200">{"⭐".repeat(5 - review.rating)}</span>
                          )}
                        </div>
                      </div>
                      
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-100 px-3 py-1.5 rounded-full inline-block w-fit">
                        {new Date(review.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    
                    <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                      <p className="text-gray-700 italic">"{review.comment}"</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}