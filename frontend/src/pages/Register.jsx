import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [role, setRole] = useState("patient");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone_number: "",
    password: "",
    confirm_password: "",
    address: "",
    latitude: "",
    longitude: "",
    auth_document_url: "",
  });

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addressInputRef = useRef(null);

  useEffect(() => {
    if (!loading && user) {
      if (user.role === "lab") {
        navigate("/labs", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    let autocompleteListener;

    if (role === "lab" && window.google && addressInputRef.current) {
      const autocomplete = new window.google.maps.places.Autocomplete(
        addressInputRef.current,
        {
          types: ["address"],
        },
      );

      autocompleteListener = autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place.geometry) {
          setFormData((prev) => ({
            ...prev,
            address: place.formatted_address,
            latitude: place.geometry.location.lat(),
            longitude: place.geometry.location.lng(),
          }));
        }
      });
    }

    return () => {
      if (autocompleteListener && window.google) {
        window.google.maps.event.removeListener(autocompleteListener);
      }
    };
  }, [role]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirm_password) {
      setError("Passwords do not match. Please try again.");
      return;
    }

    setIsSubmitting(true);

    try {
      const endpoint =
        role === "patient"
          ? "http://localhost:5000/api/patients/register"
          : "http://localhost:5000/api/labs/register";

      const { confirm_password, address, ...restData } = formData;
      const submitData =
        role === "patient"
          ? {
              name: restData.name,
              email: restData.email,
              password: restData.password,
              phone_number: restData.phone_number,
            }
          : {
              ...restData,
              address_text: address,
            };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to register account.");
      }

      navigate("/login");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-slate-50">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-600 font-medium">Verifying session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-md w-full bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-xl animate-fade-in-up">
        
        <div className="text-center mb-8">
          <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            New Registration
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 mt-3">Create Account</h2>
          <p className="text-slate-500 text-xs mt-1">Join MedBook to search or host diagnostic test services.</p>
        </div>

        {/* ROLE TOGGLE */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6 border border-slate-200/60">
          <button
            type="button"
            onClick={() => setRole("patient")}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer ${
              role === "patient"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            👤 Patient
          </button>
          <button
            type="button"
            onClick={() => setRole("lab")}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer ${
              role === "lab"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            🧪 Diagnostic Lab
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 text-xs rounded-2xl border border-red-100 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
              {role === "patient" ? "Full Name" : "Laboratory Name"}
            </label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-slate-900 placeholder-slate-400"
              placeholder={role === "patient" ? "John Doe" : "City Diagnostics Lab"}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-slate-900 placeholder-slate-400"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
              Phone Number
            </label>
            <input
              type="tel"
              name="phone_number"
              required
              value={formData.phone_number}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-slate-900 placeholder-slate-400"
              placeholder="+91 9876543210"
            />
          </div>

          {role === "lab" && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Lab Location / Address
                </label>
                <input
                  ref={addressInputRef}
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-blue-300 bg-blue-50/50 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-slate-900 placeholder-slate-400"
                  placeholder="Type address or search location..."
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Latitude
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={formData.latitude}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 text-xs font-mono outline-none cursor-not-allowed"
                    placeholder="Auto-filled"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Longitude
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={formData.longitude}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 text-xs font-mono outline-none cursor-not-allowed"
                    placeholder="Auto-filled"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Certification Document URL
                </label>
                <input
                  type="url"
                  name="auth_document_url"
                  required
                  value={formData.auth_document_url}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-slate-900 placeholder-slate-400"
                  placeholder="https://drive.google.com/your-license"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
              Password
            </label>
            <input
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-slate-900 placeholder-slate-400"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
              Confirm Password
            </label>
            <input
              type="password"
              name="confirm_password"
              required
              value={formData.confirm_password}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-slate-900 placeholder-slate-400"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 mt-2 rounded-xl shadow-md transition disabled:opacity-70 cursor-pointer text-xs"
          >
            {isSubmitting ? "Creating account..." : `Sign Up as ${role === 'patient' ? 'Patient' : 'Lab Partner'}`}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-slate-500 pt-6 border-t border-slate-100">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-600 font-bold hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
