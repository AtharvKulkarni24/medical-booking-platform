export default function Terms() {
  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div className="bg-white p-8 md:p-10 rounded-3xl border border-slate-200/80 shadow-sm">
          <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            Legal Terms
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-3">Terms of Service</h1>
          <p className="text-slate-500 text-sm mt-1">Guidelines for using the MedBook diagnostic booking platform.</p>
        </div>

        <div className="bg-white p-8 md:p-10 rounded-3xl border border-slate-200/80 shadow-sm space-y-8 text-slate-600 text-sm leading-relaxed">
          <p className="text-base text-slate-700 font-medium">
            MedBook provides an online platform for booking diagnostic test appointments. By accessing or using MedBook, you agree to these Terms of Service.
          </p>

          <div className="pt-4 border-t border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-2">1. Platform Role</h2>
            <p>MedBook is a booking technology provider. Diagnostic sample collection, testing, and clinical reporting remain the sole responsibility of the chosen laboratory center.</p>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-2">2. Accuracy of Booking Details</h2>
            <p>Patients are responsible for providing accurate contact and appointment schedule details. Laboratories reserve the right to decline unverified requests.</p>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-2">3. Payment Gateways</h2>
            <p>Online payments are processed securely via Razorpay. MedBook is not liable for cash transactions made outside the digital platform.</p>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-2">4. Lab Responsibilities</h2>
            <p>Diagnostic lab partners must maintain accurate test pricing, slot capacity, and licensing compliance.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
