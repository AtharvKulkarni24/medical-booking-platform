import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/privacy')({
  component: PrivacyPolicy,
})

function PrivacyPolicy() {
  return (
    <div className="container mx-auto px-4 max-w-4xl py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
      <div className="text-gray-700 space-y-4">
        <p className="text-sm text-gray-500">Last updated: {new Date().toLocaleDateString()}</p>
        <p>At MedConnect, we take your privacy seriously. This policy describes how we collect, use, and protect your personal and medical information.</p>
        
        <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">1. Information We Collect</h2>
        <p>We collect information you provide directly to us when you create an account, update your profile, or use our diagnostic booking services. This includes contact information and location data to match you with nearby laboratories.</p>
        
        <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">2. How We Use Your Information</h2>
        <p>We use the information we collect to operate, maintain, and provide you with the features and functionality of our platform, and to communicate with our certified Lab Partners securely.</p>
      </div>
    </div>
  )
}