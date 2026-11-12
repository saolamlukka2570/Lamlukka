-- ==============================================================================
-- Waste Payment Real-time Chat System
-- ==============================================================================

-- 1. Create the waste_chats table
CREATE TABLE IF NOT EXISTS public.waste_chats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id VARCHAR(255) NOT NULL,          -- Identifier for the chat room (usually Citizen's LINE ID or HouseNo+Name)
    sender_type VARCHAR(50) NOT NULL,       -- 'citizen' or 'official'
    sender_name VARCHAR(255) NOT NULL,      -- Name of the sender to display
    message TEXT NOT NULL,                  -- The chat message content
    is_read BOOLEAN DEFAULT FALSE,          -- Read status for notifications
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_waste_chats_room_id ON public.waste_chats(room_id);
CREATE INDEX IF NOT EXISTS idx_waste_chats_created_at ON public.waste_chats(created_at);
CREATE INDEX IF NOT EXISTS idx_waste_chats_is_read ON public.waste_chats(is_read);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.waste_chats ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies (Allowing anon access for simplicity in this frontend-heavy app)
-- Policy: Allow read access to everyone
CREATE POLICY "Allow anonymous read access" ON public.waste_chats
    FOR SELECT USING (true);

-- Policy: Allow insert access to everyone
CREATE POLICY "Allow anonymous insert access" ON public.waste_chats
    FOR INSERT WITH CHECK (true);

-- Policy: Allow update access to everyone (for updating is_read status)
CREATE POLICY "Allow anonymous update access" ON public.waste_chats
    FOR UPDATE USING (true);

-- 5. Enable Realtime for the table
-- Change replica identity to full so that realtime events include previous and new records
ALTER TABLE public.waste_chats REPLICA IDENTITY FULL;

-- Add the table to the supabase_realtime publication
-- Note: If the publication 'supabase_realtime' doesn't exist, this might fail,
-- but Supabase usually has it created by default.
BEGIN;
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'waste_chats'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.waste_chats;
    END IF;
  END
  $$;
COMMIT;
