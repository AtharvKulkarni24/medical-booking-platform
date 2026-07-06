import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/refund")({
  component: RefundPolicy,
});

// ... (imports remain the same)
function RefundPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="container mx-auto max-w-4xl px-6">
        <div className="rounded-3xl bg-white shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-green-600 px-8 py-10 text-white">
            <h1 className="text-4xl font-bold">Refund Policy</h1>
            <p className="mt-2 text-green-50">Simple, fair, and transparent.</p>
          </div>

          <div className="space-y-8 p-8 text-gray-700 leading-8">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">1. Patient-Initiated Cancellations</h2>
              <p>Cancellations made <strong>more than 24 hours</strong> before the scheduled appointment slot are eligible for a full refund. Cancellations made <strong>within 24 hours</strong> of the slot may be subject to a non-refundable booking fee or laboratory service charge.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">2. Lab-Initiated Cancellations</h2>
              <p>If a lab cancels a booking for any reason (operational, staff unavailability), MedBook will automatically process a 100% refund to the original payment method, or provide an option to re-book with a different lab.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">3. No-Show Policy</h2>
              <p>If a patient fails to show up for the appointment at the designated laboratory without prior cancellation, the booking fee is generally non-refundable.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">4. Processing Time</h2>
              <p>Approved refunds are processed through our payment gateway and typically reflect in your account within <strong>5 to 7 business days</strong> depending on your bank.</p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg text-sm italic">
              Need help with a refund? Contact us at support@medbook.com with your Appointment ID.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}