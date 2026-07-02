import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/search")({
  component: SearchPage,
});

function SearchPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-4">Search Labs</h1>
        <p className="text-lg text-gray-600 mb-8">
          Find diagnostic centers near you and browse available tests
        </p>

        {/* TODO: Implement search functionality */}
        <div className="bg-blue-100 border-l-4 border-blue-500 p-4 rounded">
          <p className="text-blue-700">
            <strong>Coming Soon:</strong> Search lab feature is under development
          </p>
        </div>
      </div>
    </div>
  );
}
