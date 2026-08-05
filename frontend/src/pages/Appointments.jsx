import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function Appointments() {
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState({ upcoming: [], past: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("upcoming");

  const [cancelModalData, setCancelModalData] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    const fetchAppointments = async () => {
      const token = localStorage.getItem("accessToken");
      const userString = localStorage.getItem("user");
      const user = userString ? JSON.parse(userString) : null;

      if (!token || user?.role !== "patient") {
        navigate("/login?redirect=/appointments");
        return;
      }

      try {
        const response = await fetch(
          "http://localhost:5000/api/appointments/my-appointments",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        const result = await response.json();

        if (!response.ok)
          throw new Error(result.error || "Failed to fetch appointments.");

        setAppointments({
          upcoming: result.upcoming || [],
          past: result.past || [],
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAppointments();
  }, [navigate]);

  const canBeCancelled = (dateStr, timeStr) => {
    const now = new Date();
    const appointmentDateTime = new Date(`${dateStr}T${timeStr}`);
    return appointmentDateTime > now;
  };

  const isMissedAppointment = (dateStr, timeStr, status) => {
    if (status === "COMPLETED" || status === "CANCELLED") return false;
    const now = new Date();
    const appointmentDateTime = new Date(`${dateStr}T${timeStr}`);
    return appointmentDateTime < now;
  };

  const confirmCancel = async () => {
    if (!cancelModalData) return;

    setIsCancelling(true);
    const token = localStorage.getItem("accessToken");
    const appointmentId = cancelModalData.appointment_id;

    try {
      const response = await fetch(
        `http://localhost:5000/api/appointments/${appointmentId}/cancel`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const result = await response.json();

      if (!response.ok)
        throw new Error(result.error || "Failed to cancel appointment.");

      setAppointments((prev) => {
        const cancelledApp = prev.upcoming.find(
          (a) => a.appointment_id === appointmentId,
        );
        if (!cancelledApp) return prev;

        cancelledApp.status = "CANCELLED";
        return {
          upcoming: prev.upcoming.filter(
            (a) => a.appointment_id !== appointmentId,
          ),
          past: [cancelledApp, ...prev.past],
        };
      });

      setCancelModalData(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsCancelling(false);
    }
  };

  const formatDateLabel = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":");
    const date = new Date();
    date.setHours(h, m);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status, isMissed = false) => {
    if (isMissed) {
      return (
        <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
          Missed Visit
        </span>
      );
    }
    switch (status) {
      case "CONFIRMED":
        return (
          <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            Confirmed
          </span>
        );
      case "COMPLETED":
        return (
          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            Completed
          </span>
        );
      case "CANCELLED":
        return (
          <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            {status}
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-slate-50">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-600 font-medium">Loading your appointments...</p>
      </div>
    );
  }

  const currentList =
    activeTab === "upcoming" ? appointments.upcoming : appointments.past;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 relative">

      {/* CANCELLATION MODAL */}
      {cancelModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center animate-fade-in-up">
            <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-3xl mx-auto mb-4">
              ⚠️
            </div>

            <h3 className="text-2xl font-bold text-slate-900 mb-2">
              Cancel Appointment?
            </h3>
            <p className="text-slate-500 text-sm mb-4">
              Are you sure you want to cancel your <span className="font-bold text-slate-900">{cancelModalData.test_name}</span> at <span className="font-bold text-slate-900">{cancelModalData.lab_name}</span>?
            </p>

            <div className="bg-red-50 text-red-700 text-xs font-semibold p-3.5 rounded-xl border border-red-100 mb-6 text-left">
              <strong>Notice:</strong> Appointment cancellation cannot be undone once confirmed.
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={confirmCancel}
                disabled={isCancelling}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition shadow-md disabled:opacity-50 cursor-pointer"
              >
                {isCancelling ? "Cancelling..." : "Yes, Cancel Booking"}
              </button>
              <button
                onClick={() => setCancelModalData(null)}
                disabled={isCancelling}
                className="w-full bg-slate-100 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-200 transition cursor-pointer"
              >
                Keep Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD CONTAINER */}
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 p-6 md:p-8 bg-white rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
              Patient Portal
            </span>
            <h1 className="text-3xl font-extrabold text-slate-900 mt-2">My Appointments</h1>
            <p className="text-slate-500 text-sm mt-1">Manage scheduled test slots, view report downloads, and track appointment history.</p>
          </div>

          <Link
            to="/search/labs"
            className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md transition"
          >
            + Book New Test
          </Link>
        </div>

        {error && (
          <div className="p-4 mb-6 bg-red-50 text-red-700 rounded-2xl border border-red-100 text-sm">
            {error}
          </div>
        )}

        {/* TABS */}
        <div className="flex border-b border-slate-200 mb-8 gap-8">
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`pb-4 font-bold text-sm sm:text-base transition cursor-pointer flex items-center gap-2 relative ${activeTab === "upcoming" ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-500 hover:text-slate-900"
              }`}
          >
            <span>Upcoming Bookings</span>
            <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-bold">{appointments.upcoming.length}</span>
          </button>

          <button
            onClick={() => setActiveTab("past")}
            className={`pb-4 font-bold text-sm sm:text-base transition cursor-pointer flex items-center gap-2 relative ${activeTab === "past" ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-500 hover:text-slate-900"
              }`}
          >
            <span>Past & History</span>
            <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full text-xs font-bold">{appointments.past.length}</span>
          </button>
        </div>

        {/* LIST AREA */}
        {currentList.length === 0 ? (
          <div className="bg-white p-12 sm:p-16 rounded-3xl border border-slate-200/80 shadow-sm text-center max-w-md mx-auto">
            <span className="text-5xl block mb-4">🩺</span>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              No {activeTab} appointments
            </h3>
            <p className="text-slate-500 text-sm mb-6">
              You don't have any {activeTab} diagnostic test bookings.
            </p>
            {activeTab === "upcoming" && (
              <Link
                to="/search/labs"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-6 py-3 rounded-xl shadow-md transition"
              >
                Browse & Book Tests Now
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {currentList.map((app) => {
              const isMissed =
                activeTab === "past" &&
                isMissedAppointment(
                  app.appointment_date,
                  app.start_time,
                  app.status,
                );

              return (
                <div
                  key={app.appointment_id}
                  className="glass-card hover-lift p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl transition duration-300 flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      {getStatusBadge(app.status, isMissed)}
                      <span className="text-xs font-bold text-slate-400 font-mono">
                        #APP-{app.appointment_id}
                      </span>
                    </div>

                    <h3 className="text-2xl font-extrabold text-slate-900">
                      {app.test_name}
                    </h3>
                    <p className="text-slate-600 font-semibold text-sm">
                      {app.lab_name}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <span>📍</span> {app.address_text}
                    </p>
                  </div>

                  <div className="flex flex-col md:items-end w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-slate-100 gap-3">
                    <div className="text-left md:text-right">
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Scheduled Date & Slot</span>
                      <span className="font-bold text-slate-900 text-sm">{formatDateLabel(app.appointment_date)}</span>
                      <span className="block text-blue-600 font-extrabold text-sm">{formatTime(app.start_time)}</span>
                    </div>

                    <div className="w-full md:w-auto flex flex-col gap-2">
                      {app.status === "CONFIRMED" &&
                        activeTab === "upcoming" &&
                        canBeCancelled(
                          app.appointment_date,
                          app.start_time,
                        ) && (
                          <button
                            onClick={() => setCancelModalData(app)}
                            className="w-full md:w-auto py-2.5 px-5 rounded-xl font-semibold text-xs transition bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 cursor-pointer"
                          >
                            Cancel Appointment
                          </button>
                        )}

                      {app.status === "COMPLETED" && app.report_url && (
                        <a
                          href={app.report_url}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full md:w-auto text-center bg-green-600 hover:bg-green-700 text-white font-semibold text-xs py-2.5 px-5 rounded-xl transition shadow-sm"
                        >
                          📄 Download Report
                        </a>
                      )}

                      {app.status === "COMPLETED" && (
                        <Link
                          to="/reviews"
                          className="w-full md:w-auto text-center bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs py-2.5 px-5 rounded-xl transition border border-blue-100"
                        >
                          ⭐ Write Review
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
