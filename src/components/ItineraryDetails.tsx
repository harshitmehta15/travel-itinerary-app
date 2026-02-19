import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { MapPin, Calendar, Plus, Clock, Trash2, Users, Sparkles } from 'lucide-react';
import type { Database } from '../lib/supabase';
import { ActivityForm } from './ActivityForm';
import { CollaboratorModal } from './CollaboratorModal';

type Itinerary = Database['public']['Tables']['itineraries']['Row'];
type Activity = Database['public']['Tables']['activities']['Row'];

interface ItineraryDetailsProps {
  itineraryId: string;
}

export function ItineraryDetails({ itineraryId }: ItineraryDetailsProps) {
  const { user } = useAuth();
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [showCollaborators, setShowCollaborators] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    loadItinerary();
    loadActivities();
  }, [itineraryId]);

  const loadItinerary = async () => {
    const { data, error } = await supabase
      .from('itineraries')
      .select('*')
      .eq('id', itineraryId)
      .maybeSingle();

    if (error) {
      console.error('Error loading itinerary:', error);
    } else {
      setItinerary(data);
    }
    setLoading(false);
  };

  const loadActivities = async () => {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('itinerary_id', itineraryId)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error loading activities:', error);
    } else {
      setActivities(data || []);
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!confirm('Are you sure you want to delete this activity?')) return;

    const { error } = await supabase
      .from('activities')
      .delete()
      .eq('id', activityId);

    if (error) {
      console.error('Error deleting activity:', error);
    } else {
      setActivities(activities.filter(a => a.id !== activityId));
    }
  };

  const handleGetSuggestions = async () => {
    if (!itinerary) return;

    setLoadingSuggestions(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/suggest-activities`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            destination: itinerary.destination,
            startDate: itinerary.start_date,
            endDate: itinerary.end_date,
            description: itinerary.description,
          }),
        }
      );

      const data = await response.json();
      if (data.suggestions) {
        setSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Error getting suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'No date';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const groupActivitiesByDate = () => {
    const grouped: { [key: string]: Activity[] } = {};
    activities.forEach(activity => {
      const dateKey = activity.date || 'unscheduled';
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(activity);
    });
    return grouped;
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'food': 'bg-orange-100 text-orange-700',
      'sightseeing': 'bg-blue-100 text-blue-700',
      'accommodation': 'bg-green-100 text-green-700',
      'transport': 'bg-gray-100 text-gray-700',
      'activity': 'bg-teal-100 text-teal-700',
      'other': 'bg-gray-100 text-gray-700',
    };
    return colors[category] || colors['other'];
  };

  if (loading || !itinerary) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  const groupedActivities = groupActivitiesByDate();

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">{itinerary.name}</h1>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          {itinerary.destination && (
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>{itinerary.destination}</span>
            </div>
          )}
          {itinerary.start_date && (
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>
                {formatDate(itinerary.start_date)}
                {itinerary.end_date && ` - ${formatDate(itinerary.end_date)}`}
              </span>
            </div>
          )}
        </div>
        {itinerary.description && (
          <p className="mt-3 text-gray-600">{itinerary.description}</p>
        )}
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => setShowActivityForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Activity
          </button>
          <button
            onClick={() => setShowCollaborators(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Users className="w-4 h-4" />
            Collaborators
          </button>
          <button
            onClick={handleGetSuggestions}
            disabled={loadingSuggestions}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {loadingSuggestions ? 'Getting Suggestions...' : 'AI Suggestions'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {suggestions.length > 0 && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-blue-900">AI Suggestions</h3>
            </div>
            <ul className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <li key={index} className="text-sm text-blue-800 flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {activities.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              No activities yet
            </h3>
            <p className="text-gray-500 mb-4">
              Start planning your trip by adding activities
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedActivities).map(([date, dateActivities]) => (
              <div key={date}>
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {date === 'unscheduled' ? 'Unscheduled' : formatDate(date)}
                </h3>
                <div className="space-y-3">
                  {dateActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-gray-800">{activity.title}</h4>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(activity.category)}`}>
                              {activity.category}
                            </span>
                          </div>
                          {activity.description && (
                            <p className="text-sm text-gray-600 mb-2">{activity.description}</p>
                          )}
                          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                            {activity.start_time && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>
                                  {formatTime(activity.start_time)}
                                  {activity.end_time && ` - ${formatTime(activity.end_time)}`}
                                </span>
                              </div>
                            )}
                            {activity.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                <span>{activity.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteActivity(activity.id)}
                          className="ml-2 p-2 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showActivityForm && (
        <ActivityForm
          itineraryId={itineraryId}
          onClose={() => setShowActivityForm(false)}
          onSuccess={() => {
            loadActivities();
            setShowActivityForm(false);
          }}
        />
      )}

      {showCollaborators && (
        <CollaboratorModal
          itineraryId={itineraryId}
          onClose={() => setShowCollaborators(false)}
        />
      )}
    </div>
  );
}
