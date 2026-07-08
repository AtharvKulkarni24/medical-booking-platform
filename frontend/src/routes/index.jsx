import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import TestCard from '../components/TestCard'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext' // Make sure this path is correct

export const Route = createFileRoute('/')({
  component: HomePage,
})

// Updated to strictly match the 7 test names in our database
const popularTests = [
  { id: 1, name: 'Blood Test', description: 'Evaluates overall health and detects a wide range of disorders.', icon: '🩸' },
  { id: 2, name: 'Sonography Test', description: 'High-resolution ultrasound imaging for internal organ screening.', icon: '🩺' },
  { id: 3, name: 'Kidney Test', description: 'Evaluates how well your kidneys are filtering waste from your blood.', icon: '🫘' },
  { id: 4, name: 'Liver Test', description: 'Measures proteins, liver enzymes, and bilirubin in the blood.', icon: '🧪' },
  { id: 5, name: 'Sugar Test', description: 'Measures blood glucose levels to screen for and monitor diabetes.', icon: '📏' },
  { id: 6, name: 'Vitamin Test', description: 'Checks for essential vitamin deficiencies affecting bone and nerve health.', icon: '☀️' },
  { id: 7, name: 'Urine Test', description: 'Routine analysis to detect urinary tract infections and kidney issues.', icon: '💧' }
];

function HomePage() {
  const navigate = useNavigate();
  
  // 1. Pull user and loading state from AuthContext
  const { user, loading: authLoading } = useAuth();
  
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [activeTest, setActiveTest] = useState('');

  // 2. Security Redirect: Send labs to their dashboard
  useEffect(() => {
    if (!authLoading) {
      if (user && user.role === 'lab') {
        navigate({ to: '/labs', replace: true });
      }
    }
  }, [user, authLoading, navigate]);

  const handleTestClick = (testName) => {
    setLocationError('');
    setIsLocating(true);
    setActiveTest(testName);

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        // Success! Navigate to the search route with the parameters in the URL
        navigate({
          to: '/search',
          search: {
            test: testName,
            lat: latitude,
            lng: longitude
          }
        });
      },
      (error) => {
        console.error("Location error:", error);
        setLocationError('Please allow location access to find labs near you.');
        setIsLocating(false);
      }
    );
  }

  // 3. Show a loading spinner while checking authentication so the UI doesn't flash
  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full w-full relative">
      
      {/* Loading Overlay */}
      {isLocating && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-50 flex flex-col items-center justify-center min-h-[50vh]">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          <p className="text-lg font-medium text-gray-700">Getting location for {activeTest}...</p>
        </div>
      )}

      <div className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Which Test do you want to perform?
          </h1>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Select from our most frequently booked diagnostic tests. Book online and get tested at a certified lab near you.
          </p>
        </div>

        {locationError && (
          <div className="mb-8 p-4 bg-red-50 text-red-700 rounded-md border border-red-100 text-center max-w-2xl mx-auto">
            {locationError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {popularTests.map((test) => (
            <TestCard 
              key={test.id} 
              name={test.name} 
              description={test.description} 
              icon={test.icon}
              onClick={handleTestClick} 
            />
          ))}
        </div>
      </div>

    </div>
  )
}