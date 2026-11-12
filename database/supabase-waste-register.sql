-- Create the waste_register_requests table
CREATE TABLE IF NOT EXISTS public.waste_register_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    house_no VARCHAR(100) NOT NULL,
    moo VARCHAR(50),
    type VARCHAR(255),
    phone VARCHAR(50),
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    image_url TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    note TEXT,
    line_user_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_waste_register_requests_status ON public.waste_register_requests(status);
CREATE INDEX IF NOT EXISTS idx_waste_register_requests_created_at ON public.waste_register_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_waste_register_requests_line_user_id ON public.waste_register_requests(line_user_id);

-- Set up Row Level Security (RLS)
ALTER TABLE public.waste_register_requests ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access
CREATE POLICY "Allow anonymous read access" ON public.waste_register_requests
    FOR SELECT USING (true);

-- Allow anonymous insert access
CREATE POLICY "Allow anonymous insert access" ON public.waste_register_requests
    FOR INSERT WITH CHECK (true);

-- Allow anonymous update access (e.g., to update status)
CREATE POLICY "Allow anonymous update access" ON public.waste_register_requests
    FOR UPDATE USING (true);
