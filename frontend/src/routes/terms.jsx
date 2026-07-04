import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/terms')({
  component: TermsOfService,
})

function TermsOfService() {
  return (
    <div className="container mx-auto px-4 max-w-4xl py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Terms of Service</h1>
      <div className="text-gray-700 space-y-4">
        <p className="text-sm text-gray-500">Last updated: {new Date().toLocaleDateString()}</p>
        <p>Please read these Terms of Service carefully before using the MedConnect platform.</p>
        
        <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">1. Acceptance of Terms</h2>
        <p>By accessing or using our service, you agree to be bound by these terms. If you disagree with any part of the terms, you do not have permission to access the service.</p>
        
        <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">2. User Accounts</h2>
        <p>You are responsible for safeguarding the password that you use to access the service and for any activities or actions under your password. You agree not to disclose your password to any third party.</p>
      </div>
    </div>
  )
}