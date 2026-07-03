import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

export const Route = createFileRoute("/labs")({
  component: LabsDashboard,
});

function LabsDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("tests");

  // Protect the route: Only logged-in labs can see this
  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate({ to: "/login" });
      } else if (user && !user.is_verified && user.role === "lab") {
        // adjust based on your user object
        // Optional: Handle unverified labs
      }
    }
  }, [user, loading, navigate]);

  if (loading)
    return <div className="p-10 text-center">Loading dashboard...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row w-full">
      {/* SIDEBAR */}
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Lab Dashboard</h2>
          <p className="text-sm text-gray-500 mt-1">
            {user?.name || "Diagnostic Center"}
          </p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <SidebarButton
            active={activeTab === "tests"}
            onClick={() => setActiveTab("tests")}
            icon="🧪"
            label="Manage Tests"
          />
          <SidebarButton
            active={activeTab === "slots"}
            onClick={() => setActiveTab("slots")}
            icon="🕒"
            label="Time Slots"
          />
          <SidebarButton
            active={activeTab === "appointments"}
            onClick={() => setActiveTab("appointments")}
            icon="📅"
            label="Appointments"
          />
          <SidebarButton
            active={activeTab === "reviews"}
            onClick={() => setActiveTab("reviews")}
            icon="⭐"
            label="Reviews"
          />
        </nav>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        {activeTab === "tests" && <TestsManager />}
        {activeTab === "slots" && <TimeSlotsManager />}
        {activeTab === "appointments" && <AppointmentsViewer />}
        {activeTab === "reviews" && <ReviewsViewer />}
      </main>
    </div>
  );
}

// ==========================================
// SIDEBAR BUTTON COMPONENT
// ==========================================
function SidebarButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left font-medium transition-colors ${
        active
          ? "bg-blue-50 text-blue-700"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      <span className="text-lg">{icon}</span>
      {label}
    </button>
  );
}

// ==========================================
// 1. TESTS MANAGER TAB
// ==========================================
function TestsManager() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manage Tests</h2>
          <p className="text-gray-500 text-sm">
            Add, edit, or remove tests from your catalog.
          </p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition font-medium">
          + Add New Test
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
              <th className="p-4 font-medium">Test Name</th>
              <th className="p-4 font-medium">Price (₹)</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {/* Mock Data Row */}
            <tr className="hover:bg-gray-50 transition">
              <td className="p-4">
                <p className="font-medium text-gray-900">
                  Complete Blood Count (CBC)
                </p>
                <p className="text-xs text-gray-500">
                  Checks overall health parameters.
                </p>
              </td>
              <td className="p-4 font-medium text-gray-900">500</td>
              <td className="p-4">
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                  Verified
                </span>
              </td>
              <td className="p-4 text-right space-x-3">
                <button className="text-blue-600 hover:underline text-sm font-medium">
                  Edit
                </button>
                <button className="text-red-600 hover:underline text-sm font-medium">
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==========================================
// 2. TIME SLOTS MANAGER TAB
// ==========================================
function TimeSlotsManager() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Weekly Time Slots
          </h2>
          <p className="text-gray-500 text-sm">
            Define your operating hours and capacities.
          </p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition font-medium">
          + Add Slot
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Mock Slot Card */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-start mb-2">
            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-xs font-bold uppercase tracking-wide">
              Monday
            </span>
            <div className="space-x-2">
              <button className="text-gray-400 hover:text-blue-600">✏️</button>
              <button className="text-gray-400 hover:text-red-600">🗑️</button>
            </div>
          </div>
          <h3 className="text-lg font-bold text-gray-900">
            09:00 AM - 10:00 AM
          </h3>
          <p className="text-gray-500 text-sm mt-1">
            Max Capacity:{" "}
            <span className="font-medium text-gray-900">5 patients</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. APPOINTMENTS VIEWER TAB
// ==========================================
function AppointmentsViewer() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Patient Appointments
        </h2>
        <p className="text-gray-500 text-sm">
          View who is coming in for specific tests and times.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Select Date
          </label>
          <input
            type="date"
            className="w-full p-2 border border-gray-300 rounded-md outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Select Time Slot
          </label>
          <select className="w-full p-2 border border-gray-300 rounded-md outline-none focus:border-blue-500">
            <option>09:00 AM - 10:00 AM</option>
            <option>10:00 AM - 11:00 AM</option>
          </select>
        </div>
        <div className="flex items-end">
          <button className="bg-gray-900 text-white px-6 py-2 rounded-md hover:bg-gray-800 font-medium h-[42px]">
            Filter
          </button>
        </div>
      </div>

      {/* Patients List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
              <th className="p-4 font-medium">Patient Name</th>
              <th className="p-4 font-medium">Contact</th>
              <th className="p-4 font-medium">Test Booked</th>
              <th className="p-4 font-medium text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr className="hover:bg-gray-50 transition">
              <td className="p-4 font-medium text-gray-900">Rahul Sharma</td>
              <td className="p-4 text-gray-600">+91 9876543210</td>
              <td className="p-4 text-gray-900">Lipid Profile</td>
              <td className="p-4 text-right">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  Confirmed
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==========================================
// 4. REVIEWS VIEWER TAB
// ==========================================
function ReviewsViewer() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Patient Reviews</h2>
        <p className="text-gray-500 text-sm">
          See what patients are saying about your services.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Mock Review Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-start mb-4">
            <div className="flex gap-3 items-center">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500">
                P
              </div>
              <div>
                <h4 className="font-bold text-gray-900">Priya Singh</h4>
                <p className="text-xs text-gray-500">2 days ago</p>
              </div>
            </div>
            <div className="text-yellow-400">⭐⭐⭐⭐⭐</div>
          </div>
          <p className="text-gray-700 text-sm">
            "Very clean facility and the staff was very professional. Got my
            reports on time as promised!"
          </p>
        </div>
      </div>
    </div>
  );
}
