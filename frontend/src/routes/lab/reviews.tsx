import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/lab/reviews")({
  component: LabReviewsPage,
});

function LabReviewsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-4">Reviews & Ratings</h1>
        <p className="text-lg text-gray-600 mb-8">
          View patient reviews and ratings for your diagnostic center
        </p>

        {/* TODO: Implement reviews display and analytics */}
        <div className="bg-blue-100 border-l-4 border-blue-500 p-4 rounded">
          <p className="text-blue-700">
            <strong>Coming Soon:</strong> Reviews feature is under development
          </p>
        </div>
      </div>
    </div>
  );
}
