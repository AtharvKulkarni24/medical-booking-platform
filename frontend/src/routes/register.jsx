import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
// 1. Import useAuth
import { useAuth } from "../context/AuthContext";

export const Route = createFileRoute("/register")({
  component: Register,
});

function Register() {
  const navigate = useNavigate();

  // 2. Extract user and loading state
  const { user, loading } = useAuth();

  // State
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

  // 3. THE REDIRECT RULE: Kick logged-in users out of the signup page
  useEffect(() => {
    if (!loading && user) {
      if (user.role === "lab") {
        navigate({ to: "/labs", replace: true });
      } else {
        navigate({ to: "/", replace: true });
      }
    }
  }, [user, loading, navigate]);

  // Map autocomplete logic
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
        throw new Error(data.error || "Failed to register account");
      }

      navigate({ to: "/login" });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Wait for AuthContext to finish checking before rendering
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-10 mb-10 bg-white p-8 rounded-xl shadow-sm border border-gray-100">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Create an Account</h2>
      </div>

      {/* Role Toggle */}
      <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
        <button
          type="button"
          onClick={() => setRole("patient")}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            role === "patient"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Patient
        </button>
        <button
          type="button"
          onClick={() => setRole("lab")}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            role === "lab"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Laboratory
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-100">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* COMMON FIELDS */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {role === "patient" ? "Full Name" : "Laboratory Name"}
          </label>
          <input
            type="text"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition"
            placeholder={role === "patient" ? "John Doe" : "City Diagnostics"}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            name="phone_number"
            required
            value={formData.phone_number}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition"
            placeholder="+91 9876543210"
          />
        </div>

        {/* LAB ONLY FIELDS */}
        {role === "lab" && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Address
              </label>
              <input
                ref={addressInputRef}
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-blue-300 bg-blue-50 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition"
                placeholder="Start typing your address..."
              />
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Latitude
                </label>
                <input
                  type="text"
                  readOnly
                  value={formData.latitude}
                  className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-md text-gray-500 text-sm outline-none cursor-not-allowed"
                  placeholder="Auto-filled"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Longitude
                </label>
                <input
                  type="text"
                  readOnly
                  value={formData.longitude}
                  className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-md text-gray-500 text-sm outline-none cursor-not-allowed"
                  placeholder="Auto-filled"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Auth Document URL
              </label>
              <input
                type="url"
                name="auth_document_url"
                required
                value={formData.auth_document_url}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition"
                placeholder="https://drive.google.com/..."
              />
            </div>
          </>
        )}

        {/* PASSWORD */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            name="password"
            required
            value={formData.password}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition"
            placeholder="••••••••"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirm Password
          </label>
          <input
            type="password"
            name="confirm_password"
            required
            value={formData.confirm_password}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white font-medium py-2.5 mt-2 rounded-md hover:bg-blue-700 transition disabled:opacity-70"
        >
          {isSubmitting ? "Creating account..." : "Sign Up"}
        </button>
      </form>
      <div className="mt-6 text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link to="/login" className="text-blue-600 font-medium hover:underline">
          Log in
        </Link>
      </div>
    </div>
  );
}
