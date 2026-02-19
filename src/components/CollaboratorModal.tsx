import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { X, UserPlus, Trash2 } from 'lucide-react';

interface CollaboratorModalProps {
  itineraryId: string;
  onClose: () => void;
}

interface Collaborator {
  id: string;
  user_id: string;
  role: string;
  profiles: {
    email: string;
    display_name: string;
  };
}

export function CollaboratorModal({ itineraryId, onClose }: CollaboratorModalProps) {
  const { user } = useAuth();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCollaborators();
  }, [itineraryId]);

  const loadCollaborators = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('collaborators')
      .select(`
        id,
        user_id,
        role,
        profiles!collaborators_user_id_fkey (
          email,
          display_name
        )
      `)
      .eq('itinerary_id', itineraryId);

    if (error) {
      console.error('Error loading collaborators:', error);
    } else {
      setCollaborators(data as any || []);
    }
    setLoading(false);
  };

  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setAdding(true);

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile) {
        setError('User not found with this email');
        setAdding(false);
        return;
      }

      if (profile.id === user?.id) {
        setError('You cannot add yourself as a collaborator');
        setAdding(false);
        return;
      }

      const { error: insertError } = await supabase
        .from('collaborators')
        .insert({
          itinerary_id: itineraryId,
          user_id: profile.id,
          role,
        });

      if (insertError) {
        if (insertError.code === '23505') {
          setError('This user is already a collaborator');
        } else {
          throw insertError;
        }
      } else {
        setEmail('');
        setRole('viewer');
        loadCollaborators();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    if (!confirm('Are you sure you want to remove this collaborator?')) return;

    const { error } = await supabase
      .from('collaborators')
      .delete()
      .eq('id', collaboratorId);

    if (error) {
      console.error('Error removing collaborator:', error);
    } else {
      setCollaborators(collaborators.filter(c => c.id !== collaboratorId));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Manage Collaborators</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={handleAddCollaborator} className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="user@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="viewer">Viewer - Can view only</option>
                <option value="editor">Editor - Can edit</option>
              </select>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={adding}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserPlus className="w-4 h-4" />
              {adding ? 'Adding...' : 'Add Collaborator'}
            </button>
          </form>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Current Collaborators
            </h3>
            {loading ? (
              <div className="text-sm text-gray-500">Loading...</div>
            ) : collaborators.length === 0 ? (
              <div className="text-sm text-gray-500">No collaborators yet</div>
            ) : (
              <div className="space-y-2">
                {collaborators.map((collaborator) => (
                  <div
                    key={collaborator.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">
                        {collaborator.profiles.display_name || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-600">
                        {collaborator.profiles.email}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {collaborator.role}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveCollaborator(collaborator.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
