export default function Privacy() {
  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div className="bg-white p-8 md:p-10 rounded-3xl border border-slate-200/80 shadow-sm">
          <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            Data & Security
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-3">Privacy Policy</h1>
          <p className="text-slate-500 text-sm mt-1">Your trust and medical data security are our top priorities.</p>
        </div>

        <div className="bg-white p-8 md:p-10 rounded-3xl border border-slate-200/80 shadow-sm space-y-8 text-slate-600 text-sm leading-relaxed">
          <p className="text-base text-slate-700 font-medium">
            At MedBook, we facilitate connections between patients and certified diagnostic laboratories. We are committed to handling your personal and health-related data with the highest security and confidentiality standards.
          </p>

          <div className="pt-4 border-t border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-2">1. Data We Collect</h2>
            <p>We collect personal information (name, contact details, email) to process test bookings. Location coordinates are collected solely to calculate distance to nearby laboratories.</p>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-2">2. Information Sharing</h2>
            <p>MedBook shares booking details strictly with your selected diagnostic lab center. We do not sell user data to third-party advertisers.</p>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-2">3. Security</h2>
            <p>We employ 256-bit SSL encryption for data in transit. Diagnostic test reports are accessible only via secure, authorized download links.</p>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-2">4. Patient Rights</h2>
            <p>Patients have the right to edit their personal information or request account deletion via our support desk.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
