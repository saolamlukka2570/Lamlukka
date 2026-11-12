-- ==========================================
-- CREATE TABLE: waste_staff
-- Description: เก็บข้อมูลเจ้าหน้าที่รับชำระค่าธรรมเนียมขยะ รวมถึงรูปโปรไฟล์และลายเซ็น
-- ==========================================

CREATE TABLE IF NOT EXISTS public.waste_staff (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    position TEXT,
    username TEXT,
    role TEXT NOT NULL DEFAULT 'Collector',
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    profile_image_url TEXT,
    signature_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE public.waste_staff ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous access (สำหรับการใช้งานทั่วไป ที่ไม่ได้ใช้ Supabase Auth)
-- หากใช้ Supabase Auth แนะนำให้เปลี่ยนเป็น role 'authenticated'
CREATE POLICY "Allow public read access for waste_staff" 
    ON public.waste_staff 
    FOR SELECT 
    USING (true);

CREATE POLICY "Allow public insert access for waste_staff" 
    ON public.waste_staff 
    FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Allow public update access for waste_staff" 
    ON public.waste_staff 
    FOR UPDATE 
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow public delete access for waste_staff" 
    ON public.waste_staff 
    FOR DELETE 
    USING (true);
