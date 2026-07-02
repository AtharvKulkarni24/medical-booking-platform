import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/lab/dashboard")({
  component: LabDashboardPage,
});

function LabDashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-4">Lab Dashboard</h1>
        <p className="text-lg text-gray-600 mb-8">
          Overview and analytics for your diagnostic center
        </p>

        {/* TODO: Implement dashboard with stats, charts, and quick actions */}
        <div className="bg-blue-100 border-l-4 border-blue-500 p-4 rounded">
          <p className="text-blue-700">
            <strong>Coming Soon:</strong> Lab dashboard feature is under development
          </p>
        </div>
      </div>
    </div>
  );
}
