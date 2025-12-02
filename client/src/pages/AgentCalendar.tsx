import { ShowingsCalendar } from '@/components/agent/ShowingsCalendar';

export default function AgentCalendar() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
        <div className="px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Calendar & Showings</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage your property showings and appointments
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <ShowingsCalendar />
      </main>
    </div>
  );
}
