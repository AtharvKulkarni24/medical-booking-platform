import { useState, useEffect } from "react";
import { apiClient } from "../../api/client";

export default function LabPayoutSettings() {
  const [payoutInfo, setPayoutInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    bank_account_holder_name: "",
    bank_account_number: "",
    confirm_account_number: "",
    bank_ifsc: "",
    business_entity_type: "individual",
  });

  const fetchPayoutDetails = async () => {
    try {
      setLoading(true);
      const res = await apiClient.request("/labs/razorpay-payout-status");
      if (res.success && res.payout_info) {
        setPayoutInfo(res.payout_info);
        if (res.payout_info.bank_account_holder_name) {
          setFormData((prev) => ({
            ...prev,
            bank_account_holder_name: res.payout_info.bank_account_holder_name || "",
            bank_ifsc: res.payout_info.bank_ifsc || "",
            business_entity_type: res.payout_info.business_entity_type || "individual",
          }));
        }
      }
    } catch (err) {
      console.error("Error fetching payout settings:", err);
      setError("Failed to load payout settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayoutDetails();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (formData.bank_account_number !== formData.confirm_account_number) {
      setError("Bank account numbers do not match.");
      return;
    }

    if (!formData.bank_account_number || !formData.bank_ifsc || !formData.bank_account_holder_name) {
      setError("Please fill in all required bank details.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiClient.request("/labs/razorpay-onboard", {
        method: "POST",
        body: JSON.stringify({
          bank_account_number: formData.bank_account_number,
          bank_ifsc: formData.bank_ifsc.trim().toUpperCase(),
          bank_account_holder_name: formData.bank_account_holder_name.trim(),
          business_entity_type: formData.business_entity_type,
        }),
      });

      if (res.success) {
        setMessage("Razorpay Linked Account configured successfully!");
        setFormData((prev) => ({
          ...prev,
          bank_account_number: "",
          confirm_account_number: "",
        }));
        await fetchPayoutDetails();
      } else {
        setError(res.error || "Failed to link account.");
      }
    } catch (err) {
      console.error("Onboarding Submit Error:", err);
      setError(err.message || "Failed to submit bank account details.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const isLinked = payoutInfo?.status === "ACTIVATED" || Boolean(payoutInfo?.razorpay_account_id);
  const earnings = payoutInfo?.earnings || {
    total_gross_volume: 0,
    total_platform_fee: 0,
    total_net_payout: 0,
    total_transactions: 0,
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Payouts & Payment Splitting
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Razorpay Route
              </span>
            </div>
            <p className="text-slate-300 text-sm mt-1">
              Direct settlement to your lab's bank account with automated fee distribution & refund reversals.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/80 backdrop-blur border border-slate-700 px-4 py-2 rounded-xl">
            <span className="text-xs text-slate-400 font-medium">Account Status:</span>
            {isLinked ? (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                ACTIVATED
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-800">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                ACTION REQUIRED
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Bookings</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">₹{earnings.total_gross_volume.toLocaleString("en-IN")}</p>
          <p className="text-xs text-slate-400 mt-1">Total revenue collected from patients</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Platform Fee ({payoutInfo?.platform_commission_percentage || 10}%)</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">₹{earnings.total_platform_fee.toLocaleString("en-IN")}</p>
          <p className="text-xs text-slate-400 mt-1">App commission & service charge</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Bank Settled</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">₹{earnings.total_net_payout.toLocaleString("en-IN")}</p>
          <p className="text-xs text-slate-400 mt-1">Direct payouts to your bank account</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Transactions</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{earnings.total_transactions}</p>
          <p className="text-xs text-slate-400 mt-1">Paid appointment transactions</p>
        </div>
      </div>

      {/* Main Content: Form & Linked Account Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Linked Bank Account Overview Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Linked Razorpay Account
            </h2>

            {isLinked ? (
              <div className="space-y-4">
                <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4">
                  <div className="flex items-center justify-between text-xs text-emerald-800 font-medium">
                    <span>Razorpay Account ID</span>
                    <span className="font-mono bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded">{payoutInfo?.razorpay_account_id}</span>
                  </div>
                </div>

                <div className="space-y-3 divide-y divide-slate-100 text-sm">
                  <div className="pt-2 flex justify-between">
                    <span className="text-slate-500">Account Holder:</span>
                    <span className="font-semibold text-slate-800">{payoutInfo?.bank_account_holder_name || "N/A"}</span>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-slate-500">Bank Account:</span>
                    <span className="font-mono font-semibold text-slate-800">{payoutInfo?.bank_account_number || "••••••••"}</span>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-slate-500">IFSC Code:</span>
                    <span className="font-mono font-semibold text-slate-800">{payoutInfo?.bank_ifsc || "N/A"}</span>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-slate-500">Entity Type:</span>
                    <span className="capitalize font-semibold text-slate-800">{payoutInfo?.business_entity_type || "individual"}</span>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-slate-500">Commission Rate:</span>
                    <span className="font-semibold text-emerald-600">{payoutInfo?.platform_commission_percentage}% per booking</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-300 p-4">
                <svg className="w-12 h-12 text-slate-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm font-semibold text-slate-700">No Account Linked Yet</p>
                <p className="text-xs text-slate-500 mt-1">
                  Fill out your bank details to connect your Razorpay Route account so patients can book your diagnostic tests.
                </p>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-slate-50 to-emerald-50/30 rounded-2xl p-5 border border-slate-200">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              How Payment Splitting Works
            </h3>
            <ul className="mt-3 text-xs text-slate-600 space-y-2 list-disc list-inside">
              <li>Patient pays via Razorpay (UPI, Cards, Netbanking).</li>
              <li>Razorpay Route automatically splits the payment upon success.</li>
              <li>Your lab receives net earnings directly into your bank account.</li>
              <li>If a booking is cancelled, funds are automatically reversed from your linked balance to process the customer's refund.</li>
            </ul>
          </div>
        </div>

        {/* Bank Account Onboarding Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 mb-1">
              {isLinked ? "Update Bank Account Details" : "Connect Razorpay Linked Account"}
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Enter your official bank details for automatic settlements via Razorpay Route.
            </p>

            {message && (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                {message}
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-xl flex items-center gap-2">
                <svg className="w-5 h-5 text-rose-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Account Holder / Beneficiary Name *
                </label>
                <input
                  type="text"
                  name="bank_account_holder_name"
                  value={formData.bank_account_holder_name}
                  onChange={handleChange}
                  placeholder="e.g. HealthCare Diagnostics Pvt Ltd"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Bank Account Number *
                  </label>
                  <input
                    type="password"
                    name="bank_account_number"
                    value={formData.bank_account_number}
                    onChange={handleChange}
                    placeholder="Enter Account Number"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Confirm Account Number *
                  </label>
                  <input
                    type="text"
                    name="confirm_account_number"
                    value={formData.confirm_account_number}
                    onChange={handleChange}
                    placeholder="Re-enter Account Number"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Bank IFSC Code *
                  </label>
                  <input
                    type="text"
                    name="bank_ifsc"
                    value={formData.bank_ifsc}
                    onChange={handleChange}
                    placeholder="e.g. SBIN0001234"
                    required
                    maxLength={11}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Business Structure *
                  </label>
                  <select
                    name="business_entity_type"
                    value={formData.business_entity_type}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white"
                  >
                    <option value="individual">Individual / Proprietorship</option>
                    <option value="partnership">Partnership</option>
                    <option value="private_limited">Private Limited (Pvt Ltd)</option>
                    <option value="llp">Limited Liability Partnership (LLP)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Connecting Account...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      {isLinked ? "Update Payout Bank Details" : "Submit & Activate Payout Account"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
