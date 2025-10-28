# Singles Search - AI-Powered Matchmaking

A Next.js 14 application that provides conversational natural language search over a singles database using hybrid search technology (PostgreSQL full-text search + vector embeddings).

## Features

- **Hybrid Search**: Combines PostgreSQL full-text search with OpenAI vector embeddings for semantic matching
- **Conversational Interface**: LLM-generated summaries with refinement suggestions
- **Real-time Sync**: Automatic embedding updates when profiles are modified
- **Smart Filtering**: Filter by gender, age range, and state
- **Primary Image Auto-sync**: Automatically displays the primary image from related images table
- **Manual & Automatic Refresh**: Sync embeddings on-demand or via scheduled cron jobs

## Tech Stack

- **Framework**: Next.js 14 with App Router, TypeScript, Tailwind CSS
- **Database**: Supabase (PostgreSQL with pgvector extension)
- **AI**: OpenAI (text-embedding-3-small for embeddings, gpt-4o-mini for chat)
- **Auth**: Supabase auth helpers (authenticated access only)

## Prerequisites

- Node.js 18+ and npm
- Supabase account with a project
- OpenAI API key

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=https://liogapsqhkualetfswel.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxpb2dhcHNxaGt1YWxldGZzd2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxMjQxNzYsImV4cCI6MjA2MTcwMDE3Nn0.V0R6MhZAwumLMn_l95WLYacpt0zDUB4504s-3Xqom2Y
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
OPENAI_API_KEY=your-openai-api-key-here
```

**Important**:
- Get your `SUPABASE_SERVICE_ROLE_KEY` from Supabase Dashboard → Settings → API
- Get your `OPENAI_API_KEY` from OpenAI Dashboard
- Never commit these keys to version control

### 3. Run Database Migration

1. Open Supabase SQL Editor
2. Copy the contents of `supabase_migration.sql`
3. Execute the migration script

This will:
- Enable vector and pg_trgm extensions
- Add computed columns (searchable_text, content_tsv, age_years)
- Add embedding column (vector 1536 dimensions)
- Add primary_image_url with auto-sync triggers
- Create indexes for performance
- Create RPC functions for hybrid search
- Set up Row Level Security (RLS)

### 4. Initial Embedding Backfill

Start the development server:

```bash
npm run dev
```

Then run the backfill command to generate embeddings for all existing profiles:

```bash
npm run embed:all
```

This may take a few minutes depending on the number of profiles in your database.

### 5. Test the Application

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Search Interface

1. **Natural Language Search**: Type a query like "outdoorsy woman in Denver, late 20s to early 30s"
2. **Filters**: Apply optional filters for gender, age range, and state
3. **Results**: View matching profiles with images, summaries, and AI-generated insights
4. **Refinement Suggestions**: Get AI-powered suggestions to improve your search

### Sync Embeddings

- **Manual Sync**: Click "Sync Now" button to update dirty embeddings (up to 100 profiles)
- **Automatic Sync**: Use `npm run sync:now` or set up a Vercel Cron Job

### New Search

Click "New Search" to clear all fields and start over.

## API Endpoints

### POST /api/chat

Main search endpoint that performs hybrid search and generates LLM summaries.

**Request Body**:
```json
{
  "message": "search query",
  "gender": "Female",
  "minAge": 25,
  "maxAge": 35,
  "state": "CO",
  "alpha": 0.6,
  "topK": 24
}
```

**Response**:
```json
{
  "answer": "LLM-generated summary with suggestions",
  "results": [...]
}
```

### POST /api/reset

Clears conversation state (stateless, returns success message).

### POST /api/embeddings

Backfills embeddings for all profiles or specific IDs.

**Request Body**:
```json
{
  "ids": [1, 2, 3]  // optional
}
```

### POST /api/embeddings/sync

Syncs embeddings for profiles marked as dirty.

**Request Body**:
```json
{
  "limit": 50  // optional, default 50
}
```

## Database Schema

### Key Columns Added to `singles_form_data`

- `searchable_text` - Concatenated text from all searchable fields
- `content_tsv` - Full-text search vector (tsvector)
- `age_years` - Computed age from date_of_birth
- `embedding` - Vector embedding (1536 dimensions)
- `primary_image_url` - Auto-synced primary image URL
- `embedding_dirty` - Flag for embedding freshness
- `embedding_updated_at` - Last embedding update timestamp
- `embedding_version` - Embedding version number

### RPC Functions

- `match_singles()` - Pure vector KNN search with filters
- `hybrid_search_singles()` - Hybrid search combining FTS + vector similarity

## Deployment

### Deploy to Vercel (Public Web App)

This application is configured for **public access** - anyone with the link can search without authentication.

**Deployment Steps:**

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Import in Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository

3. **Configure Environment Variables**

   Add the following environment variables in Vercel Dashboard → Settings → Environment Variables:

   ```
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   OPENAI_API_KEY=your-openai-api-key-here
   ```

   **Note**: The `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are already configured in `vercel.json` and are safe to be public.

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Your app will be live at `https://your-project.vercel.app`

5. **Run Database Migration** (One-time setup)
   - Open Supabase SQL Editor at [Supabase Dashboard](https://supabase.com/dashboard)
   - Execute the contents of `supabase_migration.sql`
   - This creates the necessary tables, indexes, and RPC functions

6. **Initial Embedding Backfill** (One-time setup)

   After deployment, run the backfill endpoint to generate embeddings for all profiles:

   ```bash
   curl -X POST https://your-project.vercel.app/api/embeddings \
     -H "Content-Type: application/json"
   ```

   Or use the npm script locally:
   ```bash
   npm run embed:all
   ```

### Set Up Automatic Sync (Recommended)

To keep embeddings up-to-date automatically, configure a Vercel Cron Job:

1. In Vercel Dashboard, go to your project
2. Navigate to Settings → Cron Jobs
3. Add a new cron job:
   - **Path**: `/api/embeddings/sync`
   - **Schedule**: `*/5 * * * *` (every 5 minutes) or `0 * * * *` (hourly)
   - **Method**: POST
   - **Body**: `{"limit":50}`

This will automatically sync embeddings for any profiles that have been updated.

## Hybrid Search Tuning

The `alpha` parameter controls the balance between full-text search and vector similarity:

- `alpha = 1.0` - 100% full-text search (keyword matching)
- `alpha = 0.6` - 60% FTS, 40% vector (default, balanced)
- `alpha = 0.0` - 100% vector similarity (semantic matching)

Adjust based on user query patterns and preferences.

## Security Notes

**Public Access Configuration:**
- This application is designed for **public access** - no authentication required for searching
- RLS is enabled on `singles_form_data` table with policies allowing anonymous (anon) access
- The anon key is safe to expose publicly (it's in the client-side code)
- RPC functions (`match_singles`, `hybrid_search_singles`) are granted to both `anon` and `authenticated` roles

**Server-Side Security:**
- Service Role key is only used server-side for admin operations (embedding generation)
- Service Role key is **never** exposed to the client
- Embedding generation endpoints (`/api/embeddings`, `/api/embeddings/sync`) use Service Role key
- Direct table access is controlled via RLS policies

**Important:**
- Only profile data intended for public viewing should be in the database
- The search view (`singles_search_view`) only exposes safe, public fields
- Sensitive data should never be stored in searchable fields

## Troubleshooting

### No Results Found
- Ensure embeddings are generated (`npm run embed:all`)
- Check that profiles have non-empty `searchable_text`
- Verify database connection in `.env.local`

### Slow Search Performance
- Verify indexes are created (`idx_singles_content_tsv`, `idx_singles_embedding`)
- Consider increasing IVFFlat index lists for larger datasets
- Reduce `topK` parameter for faster results

### Embeddings Not Syncing
- Check OpenAI API key is valid
- Verify Service Role key has correct permissions
- Review server logs for rate limiting errors

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Backfill all embeddings
npm run embed:all

# Sync dirty embeddings
npm run sync:now
```

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.