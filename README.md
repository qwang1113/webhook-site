# Webhook Tester

A self-hosted webhook testing service similar to [webhook.site](https://webhook.site). Capture, inspect, and forward HTTP requests with persistent storage.

## Features

- **Unique Webhook URLs** - Generate unique endpoints to receive HTTP requests
- **Request Capture** - Capture all HTTP methods (GET, POST, PUT, DELETE, etc.)
- **Request History** - View headers, body, query parameters with full detail
- **Custom Responses** - Configure status code, headers, and body for each endpoint
- **Request Forwarding** - Forward captured requests to another URL
- **Persistent Storage** - All data stored in Supabase (500MB free tier)
- **Manage Key** - Secure endpoint management without user accounts

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- Supabase account (free)

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd webhook-deploy
pnpm install
```

### 2. Setup Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the schema from `supabase/schema.sql`
3. Copy your project URL and anon key from Settings > API

### 3. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

## API Reference

### Create Endpoint

```
POST /api/endpoints
Content-Type: application/json

{
  "response_status": 200,
  "response_headers": {"X-Custom": "value"},
  "response_body": "OK",
  "forward_url": "https://example.com/webhook"
}
```

### Webhook URL

```
ANY /api/hook/{endpoint_id}
```

All requests to this URL are captured and stored.

### Get Requests

```
GET /api/endpoints/{id}/requests?key={manage_key}
```

### Manage Endpoint

```
GET    /api/endpoints/{id}?key={manage_key}
PATCH  /api/endpoints/{id}?key={manage_key}
DELETE /api/endpoints/{id}?key={manage_key}
```

## License

MIT
