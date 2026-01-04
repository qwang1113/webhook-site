export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      webhook_endpoints: {
        Row: {
          id: string
          created_at: string
          manage_key_hash: string
          name: string | null
          paused: boolean
          response_status: number
          response_content_type: string
          response_headers: Json
          response_body: string

          forward_enabled: boolean
          forward_url: string | null
          forward_timeout_ms: number
          forward_add_headers: Json
        }
        Insert: {
          id?: string
          created_at?: string
          manage_key_hash: string
          name?: string | null
          paused?: boolean
          response_status?: number
          response_content_type?: string
          response_headers?: Json
          response_body?: string
          forward_enabled?: boolean
          forward_url?: string | null
          forward_timeout_ms?: number
          forward_add_headers?: Json
        }
        Update: {
          id?: string
          created_at?: string
          manage_key_hash?: string
          name?: string | null
          paused?: boolean
          response_status?: number
          response_content_type?: string
          response_headers?: Json
          response_body?: string
          forward_enabled?: boolean
          forward_url?: string | null
          forward_timeout_ms?: number
          forward_add_headers?: Json
        }
        Relationships: []
      }
      webhook_requests: {
        Row: {
          id: number
          endpoint_id: string
          received_at: string
          method: string
          path: string
          query: Json
          client_ip: string | null
          user_agent: string | null
          content_type: string | null
          content_length: number | null
          headers: Json | null
          body: string | null
          body_size: number | null
          body_sha256: string | null
        }
        Insert: {
          id?: number
          endpoint_id: string
          received_at?: string
          method: string
          path: string
          query?: Json
          client_ip?: string | null
          user_agent?: string | null
          content_type?: string | null
          content_length?: number | null
          headers?: Json | null
          body?: string | null
          body_size?: number | null
          body_sha256?: string | null
        }
        Update: {
          id?: number
          endpoint_id?: string
          received_at?: string
          method?: string
          path?: string
          query?: Json
          client_ip?: string | null
          user_agent?: string | null
          content_type?: string | null
          content_length?: number | null
          headers?: Json | null
          body?: string | null
          body_size?: number | null
          body_sha256?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_requests_endpoint_id_fkey"
            columns: ["endpoint_id"]
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          }
        ]
      }
      webhook_forwards: {
        Row: {
          id: number
          request_id: number
          endpoint_id: string
          target_url: string
          started_at: string
          finished_at: string | null
          ok: boolean | null
          status: number | null
          duration_ms: number | null
          error: string | null
        }
        Insert: {
          id?: number
          request_id: number
          endpoint_id: string
          target_url: string
          started_at?: string
          finished_at?: string | null
          ok?: boolean | null
          status?: number | null
          duration_ms?: number | null
          error?: string | null
        }
        Update: {
          id?: number
          request_id?: number
          endpoint_id?: string
          target_url?: string
          started_at?: string
          finished_at?: string | null
          ok?: boolean | null
          status?: number | null
          duration_ms?: number | null
          error?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_forwards_request_id_fkey"
            columns: ["request_id"]
            referencedRelation: "webhook_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_forwards_endpoint_id_fkey"
            columns: ["endpoint_id"]
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
