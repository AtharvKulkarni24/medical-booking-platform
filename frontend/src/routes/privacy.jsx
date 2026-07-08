import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPolicy,
});

function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="container mx-auto max-w-4xl px-6">
        <div className="rounded-3xl bg-white shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-blue-600 px-8 py-10 text-white">
            <h1 className="text-4xl font-bold">Privacy Policy</h1>
            <p className="mt-2 text-blue-100">Your trust and data security are our foundation.</p>
          </div>

          <div className="space-y-8 p-8 text-gray-700 leading-8">
            <p>At MedBook, we facilitate connections between patients and diagnostic laboratories. We are committed to ensuring your personal and health-related data is handled with the highest standards of confidentiality.</p>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">1. Data We Collect</h2>
              <p>We collect personal information (name, contact, email) to manage your bookings. We also collect health-related preferences or history provided by you to enable easier booking. Location data is collected only to help you find labs within your vicinity.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">2. Information Sharing</h2>
              <p>MedBook shares your booking details (name, test requested, contact) strictly with the specific laboratory you have selected. We do not sell your personal data. Laboratories are contractually obligated to maintain the privacy of your diagnostic results.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">3. Security</h2>
              <p>We employ industry-standard encryption for data in transit and at rest. Access to your personal data is restricted to authorized personnel and the laboratory assigned to your booking.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">4. Your Rights</h2>
              <p>You have the right to request the deletion of your account and associated personal data at any time, provided no active bookings or legal obligations exist.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}