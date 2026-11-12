-- ========================================================
-- Schema Setup for Water Meters (มาตรน้ำประปา)
-- ========================================================

CREATE TABLE IF NOT EXISTS public.infra_water_meters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    meter_code VARCHAR(100) UNIQUE NOT NULL,
    house_number VARCHAR(100),
    village_no VARCHAR(50),
    owner_name VARCHAR(200),
    caretaker_name VARCHAR(200),
    image_url TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    geom JSONB,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS (Row Level Security) - if applicable in your project
ALTER TABLE public.infra_water_meters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.infra_water_meters
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON public.infra_water_meters
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON public.infra_water_meters
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON public.infra_water_meters
    FOR DELETE USING (true);
