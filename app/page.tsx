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

export default function Home() {
  // Search state
  const [input, setInput] = useState('');
  const [gender, setGender] = useState('');
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');
  const [state, setState] = useState('');

  // Results state
  const [answer, setAnswer] = useState('');
  const [results, setResults] = useState<Result[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  const search = async () => {
    if (!input.trim()) {
      alert('Please enter a search query');
      return;
    }

    setLoading(true);
    setAnswer('');
    setResults([]);
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
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Search failed');
      }

      const data = await response.json();
      setAnswer(data.answer || '');
      setResults(data.results || []);
    } catch (error) {
      console.error('Search error:', error);
      setAnswer(
        `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
      );
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
    setAnswer('');
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
                onClick={syncNow}
                disabled={syncing}
                className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
              <button
                onClick={reset}
                className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
              >
                New Search
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="mb-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search for singles... (e.g., 'outdoorsy woman in Denver, late 20s to early 30s')"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
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

          {/* Search Button */}
          <button
            onClick={search}
            disabled={loading || !input.trim()}
            className="w-full px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>

          {/* Sync Message */}
          {syncMsg && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-sm">
              {syncMsg}
            </div>
          )}
        </div>

        {/* Answer Section */}
        {answer && (
          <div className="mb-8 p-6 bg-gray-50 rounded-2xl">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Summary
            </h2>
            <div className="text-gray-700 whitespace-pre-line leading-relaxed">
              {answer}
            </div>
          </div>
        )}

        {/* Results Grid */}
        {results.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Results ({results.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((result) => {
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
                    className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow"
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
                          Score: {result.final_score.toFixed(4)} • ID: #
                          {result.id}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No Results */}
        {!loading && answer && results.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">
              No profiles found matching your search criteria.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
