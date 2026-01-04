create extension if not exists pgcrypto;

create table if not exists webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  manage_key_hash text not null,
  name text,
  paused boolean not null default false,

  response_status smallint not null default 200,
  response_content_type text not null default 'text/plain; charset=utf-8',
  response_headers jsonb not null default '{}'::jsonb,
  response_body text not null default 'OK',



  forward_enabled boolean not null default false,
  forward_url text,
  forward_timeout_ms integer not null default 7000,
  forward_add_headers jsonb not null default '{}'::jsonb,

  constraint forward_url_requires_enabled
    check ((forward_enabled = false) or (forward_url is not null))
);

create table if not exists webhook_requests (
  id bigint generated always as identity primary key,
  endpoint_id uuid not null references webhook_endpoints(id) on delete cascade,
  received_at timestamptz not null default now(),

  method text not null,
  path text not null,
  query jsonb not null default '{}'::jsonb,

  client_ip inet,
  user_agent text,
  content_type text,
  content_length integer,

  headers jsonb,
  body text,
  body_size integer,
  body_sha256 text
);

create table if not exists webhook_forwards (
  id bigint generated always as identity primary key,
  request_id bigint not null references webhook_requests(id) on delete cascade,
  endpoint_id uuid not null references webhook_endpoints(id) on delete cascade,

  target_url text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  ok boolean,
  status integer,
  duration_ms integer,
  error text
);

create index if not exists idx_requests_endpoint_id_id_desc
  on webhook_requests (endpoint_id, id desc);

create index if not exists idx_requests_received_at_brin
  on webhook_requests using brin (received_at);

create index if not exists idx_forwards_request_id
  on webhook_forwards (request_id);

create index if not exists idx_forwards_endpoint_started_desc
  on webhook_forwards (endpoint_id, started_at desc);
