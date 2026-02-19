import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { MapPin, Calendar, X } from 'lucide-react';
import type { Database } from '../lib/supabase';

type Itinerary = Database['public']['Tables']['itineraries']['Row'];

interface ItineraryListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  showCreateModal: boolean;
  onCloseCreateModal: () => void;
}

export function ItineraryList({ selectedId, onSelect, showCreateModal, onCloseCreateModal }: ItineraryListProps) {
  const { user } = useAuth();
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadItineraries();
  }, [user]);

  const loadItineraries = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('itineraries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading itineraries:', error);
    } else {
      setItineraries(data || []);
    }
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('itineraries')
        .insert({
          name,
          destination,
          start_date: startDate || null,
          end_date: endDate || null,
          description,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setItineraries([data, ...itineraries]);
      setName('');
      setDestination('');
      setStartDate('');
      setEndDate('');
      setDescription('');
      onCloseCreateModal();
      onSelect(data.id);
    } catch (error) {
      console.error('Error creating itinerary:', error);
    } finally {
      setCreating(false);
    }
  };

  const formatDateRange = (start: string | null, end: string | null) => {
    if (!start) return 'No dates set';
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : null;

    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const startStr = startDate.toLocaleDateString('en-US', options);
    const endStr = endDate ? endDate.toLocaleDateString('en-US', options) : '';

    return endStr ? `${startStr} - ${endStr}` : startStr;
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        Loading itineraries...
      </div>
    );
  }

  return (
    <>
      <div className="py-2">
        {itineraries.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500 text-sm">
            No itineraries yet. Create your first one!
          </div>
        ) : (
          itineraries.map((itinerary) => (
            <button
              key={itinerary.id}
              onClick={() => onSelect(itinerary.id)}
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-l-4 ${
                selectedId === itinerary.id
                  ? 'bg-blue-50 border-blue-600'
                  : 'border-transparent'
              }`}
            >
              <h3 className="font-semibold text-gray-800 mb-1">{itinerary.name}</h3>
              {itinerary.destination && (
                <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                  <MapPin className="w-3 h-3" />
                  <span>{itinerary.destination}</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar className="w-3 h-3" />
                <span>{formatDateRange(itinerary.start_date, itinerary.end_date)}</span>
              </div>
            </button>
          ))
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">Create New Itinerary</h2>
              <button
                onClick={onCloseCreateModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trip Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Summer in Europe"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Destination
                </label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Paris, France"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add notes about your trip..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onCloseCreateModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
