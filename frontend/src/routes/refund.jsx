import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/refund')({
  component: RefundPolicy,
})

function RefundPolicy() {
  return (
    <div className="container mx-auto px-4 max-w-4xl py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Refund Policy</h1>
      <div className="text-gray-700 space-y-4">
        <p className="text-sm text-gray-500">Last updated: {new Date().toLocaleDateString()}</p>
        <p>We want you to be satisfied with your experience on MedConnect. Here is how our refund process works.</p>
        
        <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">1. Cancellation by Patient</h2>
        <p>Tests cancelled at least 24 hours before the scheduled sample collection are eligible for a full refund. Cancellations made within 24 hours may be subject to a nominal cancellation fee.</p>
        
        <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">2. Refund Processing</h2>
        <p>Approved refunds will be processed within 5-7 business days. The amount will automatically be credited back to your original payment method.</p>
      </div>
    </div>
  )
}