import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/lab/tests/add")({
  component: LabAddTestsPage,
});

function LabAddTestsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-4">Add Medical Tests</h1>
        <p className="text-lg text-gray-600 mb-8">
          Add and configure new medical tests for your diagnostic center
        </p>

        {/* TODO: Implement test addition form */}
        <div className="bg-blue-100 border-l-4 border-blue-500 p-4 rounded">
          <p className="text-blue-700">
            <strong>Coming Soon:</strong> Add tests feature is under development
          </p>
        </div>
      </div>
    </div>
  );
}
