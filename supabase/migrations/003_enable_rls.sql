-- Migration: Enable Row Level Security
-- Run this AFTER data migration is complete and user_id is NOT NULL

-- Enable RLS on all tables
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_forwards ENABLE ROW LEVEL SECURITY;

-- webhook_endpoints policies
CREATE POLICY "Users can view own endpoints"
ON webhook_endpoints FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own endpoints"
ON webhook_endpoints FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own endpoints"
ON webhook_endpoints FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own endpoints"
ON webhook_endpoints FOR DELETE
USING (auth.uid() = user_id);

-- webhook_requests policies (accessed via endpoint ownership)
CREATE POLICY "Users can view requests of own endpoints"
ON webhook_requests FOR SELECT
USING (
  endpoint_id IN (
    SELECT id FROM webhook_endpoints WHERE user_id = auth.uid()
  )
);

-- Allow service role to insert requests (webhook reception is public)
CREATE POLICY "Service can insert requests"
ON webhook_requests FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can delete requests of own endpoints"
ON webhook_requests FOR DELETE
USING (
  endpoint_id IN (
    SELECT id FROM webhook_endpoints WHERE user_id = auth.uid()
  )
);

-- webhook_forwards policies
CREATE POLICY "Users can view forwards of own endpoints"
ON webhook_forwards FOR SELECT
USING (
  endpoint_id IN (
    SELECT id FROM webhook_endpoints WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert forwards for own endpoints"
ON webhook_forwards FOR INSERT
WITH CHECK (
  endpoint_id IN (
    SELECT id FROM webhook_endpoints WHERE user_id = auth.uid()
  )
);
