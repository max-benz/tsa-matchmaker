'use client';

import { useState } from 'react';

type Result = {
  id: number;
  first_name: string;
  last_name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  age_years: number | null;
  gender: string | null;
  personal_summary: string | null;
  primary_image_url: string | null;
  final_score: number;
};

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  results?: Result[];
};

type ProfileDetails = {
  profile: any;
  images: any[];
};

export default function Home() {
  // Search state
  const [input, setInput] = useState('');
  const [gender, setGender] = useState('');
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');
  const [state, setState] = useState('');

  // Conversation history
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);

  // Results state
  const [results, setResults] = useState<Result[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  // Profile modal state
  const [selectedProfile, setSelectedProfile] = useState<ProfileDetails | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const search = async () => {
    if (!input.trim()) {
      alert('Please enter a search query');
      return;
    }

    setLoading(true);
    setSyncMsg('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          gender: gender || undefined,
          minAge: minAge ? parseInt(minAge) : undefined,
          maxAge: maxAge ? parseInt(maxAge) : undefined,
          state: state || undefined,
          conversationHistory: conversationHistory.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Search failed');
      }

      const data = await response.json();

      // Add user message to conversation
      const userMessage: ChatMessage = {
        role: 'user',
        content: input,
      };

      // Add assistant response to conversation
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.answer || '',
        results: data.results || [],
      };

      setConversationHistory([...conversationHistory, userMessage, assistantMessage]);
      setResults(data.results || []);
      setInput(''); // Clear input after successful search
    } catch (error) {
      console.error('Search error:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
      };
      setConversationHistory([...conversationHistory, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    setInput('');
    setGender('');
    setMinAge('');
    setMaxAge('');
    setState('');
    setConversationHistory([]);
    setResults([]);
    setSyncMsg('Conversation cleared. New search started.');

    try {
      await fetch('/api/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Reset error:', error);
    }
  };

  const openProfileDetails = async (profileId: number) => {
    setLoadingProfile(true);
    try {
      const response = await fetch(`/api/profile/${profileId}`);
      if (!response.ok) {
        throw new Error('Failed to load profile');
      }
      const data = await response.json();
      setSelectedProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
      alert('Failed to load profile details');
    } finally {
      setLoadingProfile(false);
    }
  };

  const closeProfileModal = () => {
    setSelectedProfile(null);
  };

  const syncNow = async () => {
    setSyncing(true);
    setSyncMsg('Syncing embeddings...');

    try {
      const response = await fetch('/api/embeddings/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 100 }),
      });

      if (!response.ok) {
        throw new Error('Sync failed');
      }

      const data = await response.json();
      setSyncMsg(
        data.message || `Updated ${data.updated || 0} profiles`
      );
    } catch (error) {
      console.error('Sync error:', error);
      setSyncMsg(
        `Sync error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setSyncing(false);
    }
  };

  const backfillAll = async () => {
    setSyncing(true);
    setSyncMsg('Generating embeddings for all profiles... This may take several minutes.');

    try {
      const response = await fetch('/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Backfill failed');
      }

      const data = await response.json();
      setSyncMsg(
        data.message || `Successfully generated embeddings for ${data.updated || 0} profiles`
      );
    } catch (error) {
      console.error('Backfill error:', error);
      setSyncMsg(
        `Backfill error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setSyncing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !loading) {
      search();
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">
                Singles Search
              </h1>
              <p className="text-gray-600 mt-1">
                AI-powered matchmaking with natural language search
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={backfillAll}
                disabled={syncing}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {syncing ? 'Processing...' : 'Generate All Embeddings'}
              </button>
              <button
                onClick={syncNow}
                disabled={syncing}
                className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {syncing ? 'Syncing...' : 'Sync Updates'}
              </button>
              <button
                onClick={reset}
                className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
              >
                New Search
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              >
                <option value="">Any</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Age
              </label>
              <input
                type="number"
                value={minAge}
                onChange={(e) => setMinAge(e.target.value)}
                placeholder="e.g., 25"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Age
              </label>
              <input
                type="number"
                value={maxAge}
                onChange={(e) => setMaxAge(e.target.value)}
                placeholder="e.g., 35"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g., CO"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
            </div>
          </div>

          {/* Sync Message */}
          {syncMsg && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-sm">
              {syncMsg}
            </div>
          )}
        </div>

        {/* Conversation History */}
        {conversationHistory.length > 0 && (
          <div className="mb-8 space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              Conversation
            </h2>
            {conversationHistory.map((message, index) => (
              <div key={index}>
                {message.role === 'user' ? (
                  <div className="flex justify-end">
                    <div className="bg-blue-600 text-white rounded-2xl px-4 py-3 max-w-2xl">
                      {message.content}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="bg-gray-50 rounded-2xl p-6 mb-4">
                      <div className="text-gray-700 whitespace-pre-line leading-relaxed">
                        {message.content}
                      </div>
                    </div>

                    {/* Results for this message */}
                    {message.results && message.results.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        {message.results.map((result) => {
                          const locationParts = [
                            result.city,
                            result.state,
                            result.country,
                          ].filter(Boolean);
                          const location =
                            locationParts.length > 0
                              ? locationParts.join(', ')
                              : 'Location not specified';
                          const nameWithAge = `${result.first_name} ${
                            result.last_name?.charAt(0) || ''
                          }.${result.age_years ? ` (${result.age_years})` : ''}`;

                          return (
                            <div
                              key={result.id}
                              onClick={() => openProfileDetails(result.id)}
                              className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                            >
                              {/* Image */}
                              {result.primary_image_url ? (
                                <img
                                  src={result.primary_image_url}
                                  alt={nameWithAge}
                                  className="w-full h-56 object-cover"
                                />
                              ) : (
                                <div className="w-full h-56 bg-gray-200 flex items-center justify-center">
                                  <span className="text-gray-400 text-sm">
                                    No image
                                  </span>
                                </div>
                              )}

                              {/* Content */}
                              <div className="p-4">
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                  {nameWithAge}
                                </h3>
                                <p className="text-sm text-gray-600 mb-2">
                                  {location}
                                </p>
                                {result.personal_summary && (
                                  <p className="text-sm text-gray-700 line-clamp-3">
                                    {result.personal_summary}
                                  </p>
                                )}
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                  <span className="text-xs text-gray-500">
                                    Click to view full profile • ID: #{result.id}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Search Input - Always at bottom */}
        <div className="sticky bottom-0 bg-white pt-4 pb-4 border-t border-gray-200">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question or refine your search..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
              <button
                onClick={search}
                disabled={loading || !input.trim()}
                className="px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      {selectedProfile && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={closeProfileModal}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                Profile Details
              </h2>
              <button
                onClick={closeProfileModal}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Images */}
              {selectedProfile.images && selectedProfile.images.length > 0 && (
                <div className="mb-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {selectedProfile.images.map((img: any, idx: number) => (
                      <img
                        key={idx}
                        src={img.image_url}
                        alt={`Photo ${idx + 1}`}
                        className="w-full h-48 object-cover rounded-xl"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Profile Info */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {selectedProfile.profile.first_name}{' '}
                    {selectedProfile.profile.last_name}
                  </h3>
                  <p className="text-gray-600">
                    {selectedProfile.profile.age_years} years old •{' '}
                    {selectedProfile.profile.gender}
                  </p>
                  <p className="text-gray-600">
                    {[
                      selectedProfile.profile.city,
                      selectedProfile.profile.state,
                      selectedProfile.profile.country,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>

                {selectedProfile.profile.personal_summary && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Personal Summary
                    </h4>
                    <p className="text-gray-700">
                      {selectedProfile.profile.personal_summary}
                    </p>
                  </div>
                )}

                {selectedProfile.profile.occupation && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Occupation
                    </h4>
                    <p className="text-gray-700">
                      {selectedProfile.profile.occupation}
                    </p>
                  </div>
                )}

                {selectedProfile.profile.lifestyle_interests && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Lifestyle & Interests
                    </h4>
                    <p className="text-gray-700">
                      {selectedProfile.profile.lifestyle_interests}
                    </p>
                  </div>
                )}

                {selectedProfile.profile.physical_activities && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Physical Activities
                    </h4>
                    <p className="text-gray-700">
                      {selectedProfile.profile.physical_activities}
                    </p>
                  </div>
                )}

                {selectedProfile.profile.notes && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Notes</h4>
                    <p className="text-gray-700">
                      {selectedProfile.profile.notes}
                    </p>
                  </div>
                )}

                {selectedProfile.profile.email && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Contact
                    </h4>
                    <p className="text-gray-700">
                      {selectedProfile.profile.email}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading Profile Overlay */}
      {loadingProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-40">
          <div className="bg-white rounded-xl px-6 py-4">
            <p className="text-gray-700">Loading profile...</p>
          </div>
        </div>
      )}
    </div>
  );
}
