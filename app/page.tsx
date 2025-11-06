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
  status?: string | null;
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

// US States list
const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

// Helper function to get status color
const getStatusColor = (status: string | null | undefined) => {
  if (!status) return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' };

  const statusLower = status.toLowerCase();

  if (statusLower.includes('active') || statusLower.includes('available')) {
    return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' };
  }
  if (statusLower.includes('pending') || statusLower.includes('review')) {
    return { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' };
  }
  if (statusLower.includes('inactive') || statusLower.includes('unavailable')) {
    return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' };
  }
  if (statusLower.includes('matched') || statusLower.includes('dating')) {
    return { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' };
  }
  if (statusLower.includes('paused') || statusLower.includes('hold')) {
    return { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' };
  }

  // Default
  return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' };
};

export default function Home() {
  // Search state
  const [input, setInput] = useState('');
  const [gender, setGender] = useState('');
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');
  const [states, setStates] = useState<string[]>([]); // Multi-select states (REQUIRED)
  const [minHeight, setMinHeight] = useState(''); // In inches (REQUIRED)
  const [maxHeight, setMaxHeight] = useState(''); // In inches (REQUIRED)

  // Conversation history
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);

  // Results state - stores ALL results from initial search
  const [results, setResults] = useState<Result[]>([]);
  const [allResults, setAllResults] = useState<Result[]>([]); // Complete result set from database

  // UI state
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  // Profile modal state
  const [selectedProfile, setSelectedProfile] = useState<ProfileDetails | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const search = async () => {
    // Validate required fields
    if (!input.trim()) {
      alert('Please enter a search query');
      return;
    }

    if (states.length === 0) {
      alert('Please select at least one state');
      return;
    }

    if (!minAge || !maxAge) {
      alert('Please enter both minimum and maximum age');
      return;
    }

    if (!minHeight || !maxHeight) {
      alert('Please enter both minimum and maximum height');
      return;
    }

    // Validate age range
    const minAgeNum = parseInt(minAge);
    const maxAgeNum = parseInt(maxAge);
    if (minAgeNum > maxAgeNum) {
      alert('Minimum age cannot be greater than maximum age');
      return;
    }

    // Validate height range
    const minHeightNum = parseInt(minHeight);
    const maxHeightNum = parseInt(maxHeight);
    if (minHeightNum > maxHeightNum) {
      alert('Minimum height cannot be greater than maximum height');
      return;
    }

    setLoading(true);
    setSyncMsg('');

    try {
      const isFirstQuery = allResults.length === 0;
      console.log('Starting search - isFirstQuery:', isFirstQuery, 'allResults count:', allResults.length);

      const requestBody = {
        message: input,
        gender: gender || undefined,
        minAge: minAge ? parseInt(minAge) : undefined,
        maxAge: maxAge ? parseInt(maxAge) : undefined,
        states: states, // Multi-select states (required)
        minHeight: minHeight ? parseInt(minHeight) : undefined,
        maxHeight: maxHeight ? parseInt(maxHeight) : undefined,
        topK: 10000, // Return entire database - scales automatically as database grows
        conversationHistory: conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        // For refinement queries, send existing results to filter
        isRefinement: !isFirstQuery,
        existingResults: !isFirstQuery ? allResults : undefined,
      };

      console.log('Request body prepared - sending refinement:', requestBody.isRefinement,
                  'existingResults count:', requestBody.existingResults?.length || 0);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('API Error Response:', error);
        const errorMsg = error.details ? `${error.error}: ${error.details}` : (error.error || 'Search failed');
        throw new Error(errorMsg);
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

      // Store all results from initial search
      if (isFirstQuery) {
        setAllResults(data.results || []);
      }

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
    setStates([]);
    setMinHeight('');
    setMaxHeight('');
    setConversationHistory([]);
    setResults([]);
    setAllResults([]); // Clear stored results for fresh search
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

          {/* Required Filters Notice */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-sm">
            <strong>Required filters:</strong> You must select at least one state, age range, and height range before searching.
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {/* States - Multi-select (REQUIRED) */}
            <div className="lg:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                States <span className="text-red-500">*</span>
              </label>
              <select
                multiple
                value={states}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                  setStates(selected);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-32"
                disabled={loading}
              >
                {US_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
              {states.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {states.map((state) => (
                    <span
                      key={state}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                    >
                      {state}
                      <button
                        onClick={() => setStates(states.filter(s => s !== state))}
                        className="hover:text-blue-600"
                        disabled={loading}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Age Range (REQUIRED) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Age Range <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={minAge}
                  onChange={(e) => setMinAge(e.target.value)}
                  placeholder="Min (e.g., 25)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                  required
                />
                <input
                  type="number"
                  value={maxAge}
                  onChange={(e) => setMaxAge(e.target.value)}
                  placeholder="Max (e.g., 35)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Height Range in inches (REQUIRED) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Height Range (inches) <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={minHeight}
                  onChange={(e) => setMinHeight(e.target.value)}
                  placeholder="Min (e.g., 60)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                  required
                />
                <input
                  type="number"
                  value={maxHeight}
                  onChange={(e) => setMaxHeight(e.target.value)}
                  placeholder="Max (e.g., 72)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">5'0" = 60", 6'0" = 72"</p>
            </div>

            {/* Gender (Optional) */}
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

                          const statusColors = getStatusColor(result.status);

                          return (
                            <div
                              key={result.id}
                              onClick={() => openProfileDetails(result.id)}
                              className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                            >
                              {/* Image with Status Badge */}
                              <div className="relative">
                                {result.primary_image_url ? (
                                  <img
                                    src={result.primary_image_url}
                                    alt={nameWithAge}
                                    className="w-full h-80 object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-80 bg-gray-200 flex items-center justify-center">
                                    <span className="text-gray-400 text-sm">
                                      No image
                                    </span>
                                  </div>
                                )}

                                {/* Status Badge on Image */}
                                {result.status && (
                                  <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold border ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}>
                                    {result.status}
                                  </div>
                                )}
                              </div>

                              {/* Content */}
                              <div className="p-4">
                                <div className="flex items-center justify-between mb-1">
                                  <h3 className="text-lg font-semibold text-gray-900">
                                    {nameWithAge}
                                  </h3>
                                </div>
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
            className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
              <h2 className="text-2xl font-bold text-gray-900">
                Profile Details
              </h2>
              <button
                onClick={closeProfileModal}
                className="text-gray-500 hover:text-gray-700 text-3xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Status Badge - Prominent at Top */}
              {selectedProfile.profile.status && (
                <div className="mb-6">
                  {(() => {
                    const statusColors = getStatusColor(selectedProfile.profile.status);
                    return (
                      <div className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold border ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}>
                        <span className="mr-2">●</span>
                        Status: {selectedProfile.profile.status}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Images */}
              {selectedProfile.images && selectedProfile.images.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Photos
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedProfile.images.map((img: any, idx: number) => (
                      <div key={idx} className="relative bg-gray-100 rounded-xl overflow-hidden" style={{ minHeight: '600px' }}>
                        <img
                          src={img.image_url}
                          alt={`Photo ${idx + 1}`}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Profile Info - Organized by Sections */}
              <div className="space-y-8">
                {(() => {
                  const profile = selectedProfile.profile;

                  // Helper functions
                  const formatFieldName = (str: string) => {
                    return str
                      .split('_')
                      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(' ');
                  };

                  const formatValue = (val: any) => {
                    if (val === null || val === '') return null;
                    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
                    if (val instanceof Date || (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/))) {
                      try {
                        const date = new Date(val);
                        return date.toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        });
                      } catch {
                        return String(val);
                      }
                    }
                    return String(val);
                  };

                  const renderField = (label: string, value: any) => {
                    const formattedValue = formatValue(value);
                    if (!formattedValue) return null;
                    return (
                      <div key={label}>
                        <h5 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">
                          {label}
                        </h5>
                        <p className="text-gray-900 whitespace-pre-wrap">{formattedValue}</p>
                      </div>
                    );
                  };

                  const renderSection = (title: string, fields: Array<[string, any]>) => {
                    const renderedFields = fields
                      .map(([label, value]) => renderField(label, value))
                      .filter(Boolean);

                    if (renderedFields.length === 0) return null;

                    return (
                      <div className="border-b border-gray-200 pb-6 last:border-b-0">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">{title}</h3>
                        <div className="space-y-4">
                          {renderedFields}
                        </div>
                      </div>
                    );
                  };

                  return (
                    <>
                      {/* Basic Information */}
                      {renderSection('Basic Information', [
                        ['Full Name', `${profile.first_name || ''} ${profile.last_name || ''}`.trim()],
                        ['Gender', profile.gender],
                        ['Age', profile.age_years],
                        ['Date of Birth', profile.date_of_birth],
                      ])}

                      {/* Location */}
                      {renderSection('Location', [
                        ['City', profile.city],
                        ['State', profile.state],
                        ['Country', profile.country],
                        ['Metropolitan Area', profile.metropolitan_area],
                      ])}

                      {/* About / Summary */}
                      {renderSection('About', [
                        ['Personal Summary', profile.personal_summary],
                        ['About Me', profile.about_me],
                        ['Bio', profile.bio],
                        ['Notes', profile.notes],
                      ])}

                      {/* Physical Attributes */}
                      {renderSection('Physical Attributes', [
                        ['Height', profile.height],
                        ['Weight', profile.weight],
                        ['Body Type', profile.body_type],
                        ['Eye Color', profile.eye_color],
                        ['Hair Color', profile.hair_color],
                        ['Ethnicity', profile.ethnicity],
                        ['Race', profile.race],
                      ])}

                      {/* Lifestyle & Interests */}
                      {renderSection('Lifestyle & Interests', [
                        ['Occupation', profile.occupation],
                        ['Education', profile.education],
                        ['Lifestyle Interests', profile.lifestyle_interests],
                        ['Physical Activities', profile.physical_activities],
                        ['Hobbies', profile.hobbies],
                        ['Interests', profile.interests],
                      ])}

                      {/* Preferences & Looking For */}
                      {renderSection('Preferences', [
                        ['Looking For', profile.looking_for],
                        ['Relationship Goals', profile.relationship_goals],
                        ['Preferences', profile.preferences],
                      ])}

                      {/* Religious & Values */}
                      {renderSection('Religious & Values', [
                        ['Religion', profile.religion],
                        ['Religious Beliefs', profile.religious_beliefs],
                        ['Political Views', profile.political_views],
                        ['Values', profile.values],
                      ])}

                      {/* Family & Background */}
                      {renderSection('Family & Background', [
                        ['Has Children', profile.has_children],
                        ['Wants Children', profile.wants_children],
                        ['Family Background', profile.family_background],
                      ])}

                      {/* Contact Information */}
                      {renderSection('Contact Information', [
                        ['Email', profile.email],
                        ['Phone', profile.phone],
                        ['Phone Number', profile.phone_number],
                      ])}

                      {/* Other Fields - catch any remaining fields not covered above */}
                      {(() => {
                        const skipFields = [
                          'id', 'created_at', 'updated_at', 'embedding', 'embedding_dirty',
                          'embedding_updated_at', 'embedding_version', 'content_tsv',
                          'searchable_text', 'primary_image_url', 'first_name', 'last_name',
                          'gender', 'age_years', 'date_of_birth', 'city', 'state', 'country',
                          'metropolitan_area', 'personal_summary', 'about_me', 'bio', 'notes',
                          'height', 'weight', 'body_type', 'eye_color', 'hair_color', 'ethnicity',
                          'race', 'occupation', 'education', 'lifestyle_interests',
                          'physical_activities', 'hobbies', 'interests', 'looking_for',
                          'relationship_goals', 'preferences', 'religion', 'religious_beliefs',
                          'political_views', 'values', 'has_children', 'wants_children',
                          'family_background', 'email', 'phone', 'phone_number'
                        ];

                        const otherFields = Object.entries(profile)
                          .filter(([key, value]) => !skipFields.includes(key) && value !== null && value !== '')
                          .map(([key, value]) => [formatFieldName(key), value] as [string, any]);

                        return renderSection('Additional Information', otherFields);
                      })()}
                    </>
                  );
                })()}
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
