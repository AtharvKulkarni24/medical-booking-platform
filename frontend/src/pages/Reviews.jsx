import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Reviews() {
  const navigate = useNavigate();
  const { user, token, loading: authLoading } = useAuth();

  const [completedAppointments, setCompletedAppointments] = useState([]);
  const [pastReviews, setPastReviews] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [activeTab, setActiveTab] = useState('pending');
  
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        throw new Error('Failed to fetch review data.');
      }

      const appointmentsData = await appointmentsRes.json();
      const reviewsData = await reviewsRes.json();

      setCompletedAppointments(appointmentsData || []);
      setPastReviews(reviewsData || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user) navigate('/login', { replace: true })
      else if (user.role !== 'patient') navigate(user.role === 'lab' ? '/labs' : '/', { replace: true })
    }
  }, [user, authLoading, navigate])

  useEffect(() => {
    if (user && user.role === 'patient') {
      fetchReviewData();
    }
  }, [user]);

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



  if (authLoading || dataLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-slate-50">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-600 font-medium">Loading review center...</p>
      </div>
    )
  }

  const pendingReviews = completedAppointments.filter(
    app => !pastReviews.some(review => review.appointment_id === app.id)
  );

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-5xl mx-auto">
        
        {/* HEADER CARD */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm mb-8">
          <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            Patient Feedback
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-2">My Reviews & Ratings</h1>
          <p className="text-slate-500 text-sm mt-1">Share your diagnostic experience to help other patients choose certified labs.</p>
        </div>
        
        {error && (
          <div className="p-4 mb-6 bg-red-50 text-red-700 rounded-2xl border border-red-100 text-sm">
            {error}
          </div>
        )}

        {/* TAB NAVIGATION */}
        <div className="flex border-b border-slate-200 mb-8 gap-8">
          <button 
            onClick={() => setActiveTab('pending')}
            className={`pb-4 font-bold text-sm sm:text-base transition cursor-pointer flex items-center gap-2 relative ${
              activeTab === 'pending' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>Pending Feedback</span>
            <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-bold">{pendingReviews.length}</span>
          </button>

          <button 
            onClick={() => setActiveTab('past')}
            className={`pb-4 font-bold text-sm sm:text-base transition cursor-pointer flex items-center gap-2 relative ${
              activeTab === 'past' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>Submitted Reviews</span>
            <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full text-xs font-bold">{pastReviews.length}</span>
          </button>
        </div>

        {/* TAB CONTENT: PENDING REVIEWS */}
        {activeTab === 'pending' && (
          <div>
            {pendingReviews.length === 0 ? (
              <div className="bg-white p-12 sm:p-16 rounded-3xl border border-slate-200/80 shadow-sm text-center max-w-md mx-auto">
                <span className="text-5xl block mb-4">🎉</span>
                <h3 className="text-xl font-bold text-slate-900 mb-2">You're All Caught Up!</h3>
                <p className="text-slate-500 text-sm mb-6">All your completed appointments have been reviewed.</p>
                <button 
                  onClick={() => setActiveTab('past')} 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-6 py-3 rounded-xl transition shadow-md cursor-pointer"
                >
                  View Past Reviews
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {pendingReviews.map((app) => (
                  <div key={app.id} className="block">
                    <div className="glass-card hover-lift p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                      
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <span className="bg-amber-100 text-amber-800 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider">
                            Needs Review
                          </span>
                          <span className="text-xs font-bold text-slate-400 font-mono">#APP-{app.id}</span>
                        </div>
                        
                        <h3 className="text-2xl font-extrabold text-slate-900">{app.test_name}</h3>
                        <p className="text-slate-600 font-semibold text-sm">{app.lab_name}</p>
                        <p className="text-xs text-slate-400">
                          Completed on {new Date(app.appointment_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>

                      <div>
                        {selectedAppointmentId === app.id ? (
                          <button 
                            onClick={() => setSelectedAppointmentId(null)} 
                            className="py-2.5 px-5 rounded-xl font-semibold text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                          >
                            Close Form
                          </button>
                        ) : (
                          <button 
                            onClick={() => setSelectedAppointmentId(app.id)} 
                            className="py-2.5 px-6 rounded-xl font-semibold text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-md transition cursor-pointer"
                          >
                            ⭐ Write Review
                          </button>
                        )}
                      </div>
                    </div>

                    {/* EXPANDABLE REVIEW FORM */}
                    {selectedAppointmentId === app.id && (
                      <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-3xl mt-4 shadow-lg animate-fade-in-up">
                        <h4 className="font-extrabold text-slate-900 text-xl mb-4">Submit Review for {app.lab_name}</h4>
                        <form onSubmit={handleReviewSubmit} className="space-y-5">
                          
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Select Star Rating</label>
                            <div className="flex gap-2 text-3xl cursor-pointer">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setRating(star)}
                                  className={`transition transform hover:scale-125 ${star <= rating ? 'text-amber-400' : 'text-slate-200'}`}
                                >
                                  ★
                                </button>
                              ))}
                              <span className="text-base font-bold text-slate-700 ml-3 self-center">
                                ({rating}/5 Stars)
                              </span>
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Write Detailed Feedback</label>
                            <textarea 
                              rows="4" 
                              value={comment} 
                              onChange={(e) => setComment(e.target.value)} 
                              className="w-full p-4 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm placeholder-slate-400" 
                              placeholder={`Share details about your visit to ${app.lab_name}...`}
                              required 
                            />
                          </div>
                          
                          <button 
                            type="submit" 
                            disabled={isSubmitting} 
                            className="w-full py-3.5 bg-green-600 hover:bg-green-700 transition text-white font-bold rounded-xl shadow-md disabled:opacity-70 cursor-pointer"
                          >
                            {isSubmitting ? 'Submitting Review...' : 'Publish Feedback'}
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

        {/* TAB CONTENT: SUBMITTED REVIEWS */}
        {activeTab === 'past' && (
          <div>
            {pastReviews.length === 0 ? (
              <div className="bg-white p-12 sm:p-16 rounded-3xl border border-slate-200/80 shadow-sm text-center max-w-md mx-auto">
                <span className="text-5xl block mb-4">📝</span>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No Past Reviews</h3>
                <p className="text-slate-500 text-sm mb-6">You haven't submitted any feedback yet.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {pastReviews.map((review) => (
                  <div key={review.review_id} className="glass-card hover-lift p-6 md:p-8 rounded-3xl border border-slate-200/90 shadow-sm">
                    
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-xl">{review.test_name}</h4>
                        <p className="text-slate-500 font-semibold text-sm">{review.lab_name}</p>
                      </div>

                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-3 py-1 rounded-full">
                        {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-amber-400 text-xl">
                        {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                      </span>
                      <span className="text-xs font-extrabold text-slate-700">({review.rating}/5)</span>
                    </div>
                    
                    <div className="bg-slate-50/90 p-4 rounded-2xl border border-slate-100">
                      <p className="text-slate-700 text-sm italic">"{review.comment || 'No comment provided.'}"</p>
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
