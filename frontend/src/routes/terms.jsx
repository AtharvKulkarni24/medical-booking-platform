import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/terms')({
  component: TermsOfService,
})

function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="container mx-auto max-w-4xl px-6">
        <div className="rounded-3xl bg-white shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-blue-900 px-8 py-10 text-white">
            <h1 className="text-4xl font-bold">Terms of Service</h1>
            <p className="mt-2 text-blue-100">The guidelines for using the MedBook platform.</p>
          </div>

          <div className="space-y-8 p-8 text-gray-700 leading-8">
            <p>MedBook acts as a platform to connect users with diagnostic centers. By using MedBook, you agree to the following terms:</p>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">1. Platform Role</h2>
              <p>MedBook is a booking facilitator. The actual diagnostic testing, sample collection, and reporting are the sole responsibility of the chosen laboratory. We do not provide medical advice or diagnostic services ourselves.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">2. Accuracy of Information</h2>
              <p>Users are responsible for ensuring all information provided during the booking process is accurate. Laboratories reserve the right to cancel bookings if provided information is found to be false or insufficient.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">3. Payments</h2>
              <p>All payments made through MedBook are processed via secure gateways. MedBook is not responsible for any direct cash transactions made outside our platform between users and laboratories.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">4. Lab Responsibilities</h2>
              <p>Participating laboratories must keep their test catalog, pricing, and availability updated. Persistent failure to honor booked slots may result in the removal of the lab from MedBook.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}