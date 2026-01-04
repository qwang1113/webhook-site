import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { generateManageKey, hashManageKey } from '@/lib/crypto';
import type { CreateEndpointRequest, CreateEndpointResponse } from '@/types/database';
import type { Database } from '@/types/supabase';

type EndpointInsert = Database['public']['Tables']['webhook_endpoints']['Insert'];

export async function POST(request: Request) {
  try {
    const body: CreateEndpointRequest = await request.json().catch(() => ({}));
    const supabase = getServerClient();
    
    const manageKey = generateManageKey();
    const manageKeyHash = await hashManageKey(manageKey);
    
    const insertData: EndpointInsert = {
      manage_key_hash: manageKeyHash,
      name: body.name || null,
      forward_enabled: !!body.forward_url,
      forward_url: body.forward_url || null,
    };
    
    const { data, error } = await supabase
      .from('webhook_endpoints')
      .insert(insertData)
      .select('id')
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;
    
    const response: CreateEndpointResponse = {
      endpoint_id: data.id,
      hook_url: `${baseUrl}/api/hook/${data.id}`,
      manage_key: manageKey,
      manage_url: `${baseUrl}/endpoint/${data.id}?key=${manageKey}`,
    };
    
    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
