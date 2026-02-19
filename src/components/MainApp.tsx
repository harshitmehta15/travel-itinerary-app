import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Plane, LogOut, Plus } from 'lucide-react';
import { ItineraryList } from './ItineraryList';
import { ItineraryDetails } from './ItineraryDetails';

export function MainApp() {
  const { signOut } = useAuth();
  const [selectedItineraryId, setSelectedItineraryId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Plane className="w-6 h-6 text-white" />
          </div>
          <h1 className="ml-3 text-2xl font-bold text-gray-800">TripPlan</h1>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              New Itinerary
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ItineraryList
              selectedId={selectedItineraryId}
              onSelect={setSelectedItineraryId}
              showCreateModal={showCreateModal}
              onCloseCreateModal={() => setShowCreateModal(false)}
            />
          </div>
        </aside>

        <main className="flex-1 overflow-hidden">
          {selectedItineraryId ? (
            <ItineraryDetails itineraryId={selectedItineraryId} />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Plane className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold text-gray-700 mb-2">
                  Welcome to TripPlan
                </h2>
                <p className="text-gray-500 mb-6">
                  Select an itinerary or create a new one to get started
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
