import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/lab/timeslots/manage")({
  component: LabManageTimeslotsPage,
});

function LabManageTimeslotsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-4">Manage Time Slots</h1>
        <p className="text-lg text-gray-600 mb-8">
          Create and manage appointment time slots for your diagnostic center
        </p>

        {/* TODO: Implement time slot management calendar and form */}
        <div className="bg-blue-100 border-l-4 border-blue-500 p-4 rounded">
          <p className="text-blue-700">
            <strong>Coming Soon:</strong> Time slot management feature is under development
          </p>
        </div>
      </div>
    </div>
  );
}
