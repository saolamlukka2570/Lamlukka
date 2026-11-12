-- 1. Create sys_settings table for dynamic configurations
CREATE TABLE IF NOT EXISTS public.sys_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Insert initial road surfaces data
INSERT INTO public.sys_settings (setting_key, setting_value, description)
VALUES (
    'diis_road_surfaces', 
    '[{"name": "คอนกรีตเสริมเหล็ก", "color": "#0ea5e9"}, {"name": "แอสฟัลต์ติก/ลาดยาง", "color": "#10b981"}, {"name": "หินคลุก/ลูกรัง", "color": "#f97316"}, {"name": "อื่นๆ", "color": "#8b5cf6"}, {"name": "ถนนดิน", "color": "#78350f"}]'::jsonb,
    'ตั้งค่าประเภทผิวจราจรและสีเส้นถนน'
)
ON CONFLICT (setting_key) 
DO NOTHING;

-- 3. Grant permissions for anon and authenticated roles
GRANT ALL ON TABLE public.sys_settings TO anon;
GRANT ALL ON TABLE public.sys_settings TO authenticated;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.sys_settings ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies
-- Allow anyone to read settings
CREATE POLICY "Allow public read access" 
ON public.sys_settings FOR SELECT 
USING (true);

-- Allow anyone to update/insert settings (since auth might not be fully enforced yet)
CREATE POLICY "Allow public write access" 
ON public.sys_settings FOR ALL 
USING (true) 
WITH CHECK (true);
