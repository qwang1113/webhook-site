export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface WebhookEndpoint {
  id: string;
  created_at: string;
  user_id: string;
  name: string | null;
  paused: boolean;

  response_status: number;
  response_content_type: string;
  response_headers: Record<string, string>;
  response_body: string;

  forward_enabled: boolean;
  forward_url: string | null;
  forward_timeout_ms: number;
  forward_add_headers: Record<string, string>;
}

export interface WebhookRequest {
  id: number;
  endpoint_id: string;
  received_at: string;

  method: HttpMethod;
  path: string;
  query: Record<string, string | string[]>;

  client_ip: string | null;
  user_agent: string | null;
  content_type: string | null;
  content_length: number | null;

  headers: Record<string, string> | null;

  body: string | null;
  body_size: number | null;
  body_sha256: string | null;
}

export interface WebhookForward {
  id: number;
  request_id: number;
  endpoint_id: string;

  target_url: string;
  started_at: string;
  finished_at: string | null;
  ok: boolean | null;
  status: number | null;
  duration_ms: number | null;
  error: string | null;
}

export interface CreateEndpointRequest {
  name?: string;
  forward_url?: string;
}

export interface CreateEndpointResponse {
  endpoint_id: string;
  hook_url: string;
  manage_url: string;
}

export interface UpdateEndpointRequest {
  name?: string;
  paused?: boolean;
  response_status?: number;
  response_content_type?: string;
  response_headers?: Record<string, string>;
  response_body?: string;
  forward_enabled?: boolean;
  forward_url?: string;
  forward_timeout_ms?: number;
  forward_add_headers?: Record<string, string>;
}

export interface ListRequestsParams {
  cursor?: number;
  limit?: number;
  direction?: 'older' | 'newer';
}

export interface ListRequestsResponse {
  items: WebhookRequest[];
  next_cursor: number | null;
  latest_cursor: number | null;
  total_count: number;
}
