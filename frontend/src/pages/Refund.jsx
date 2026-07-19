export default function Refund() {
  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div className="bg-white p-8 md:p-10 rounded-3xl border border-slate-200/80 shadow-sm">
          <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            Payment & Support
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-3">Cancellation & Refund Policy</h1>
          <p className="text-slate-500 text-sm mt-1">Transparent and fair cancellation policies for all diagnostic bookings.</p>
        </div>

        <div className="bg-white p-8 md:p-10 rounded-3xl border border-slate-200/80 shadow-sm space-y-8 text-slate-600 text-sm leading-relaxed">
          <div className="pt-4">
            <h2 className="text-lg font-bold text-slate-900 mb-2">1. Patient-Initiated Cancellations</h2>
            <p>Appointments cancelled prior to the scheduled slot date are eligible for full cancellation processing. Note that once a diagnostic appointment slot has passed, cancellations are not permitted.</p>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-2">2. Lab-Initiated Cancellations</h2>
            <p>If a diagnostic lab center cancels a scheduled slot due to unforeseen maintenance or staff absence, a 100% refund is automatically issued to your original payment method.</p>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-2">3. Refund Processing Timeline</h2>
            <p>Approved refunds are dispatched via Razorpay payment gateway and typically clear into your source bank account or card within 5 to 7 business days.</p>
          </div>

          <div className="bg-blue-50/70 p-5 rounded-2xl border border-blue-100 text-xs font-medium text-slate-700">
            Need support with an appointment payment or refund? Contact our helpdesk at <strong>support@medbook.com</strong> with your Appointment ID.
          </div>
        </div>

      </div>
    </div>
  );
}
