-- คำสั่งสร้างตาราง ทะเบียนเสาไฟฟ้า (electric_poles) ใน Supabase
-- สำหรับนำไปวางในช่อง SQL Editor ของ Supabase แล้วกด RUN

CREATE TABLE IF NOT EXISTS public.electric_poles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pole_code VARCHAR(50) NOT NULL UNIQUE,
    pole_type VARCHAR(50) NOT NULL,
    light_type VARCHAR(50) NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    location_detail TEXT,
    village_no VARCHAR(10),
    status VARCHAR(20) DEFAULT 'normal',
    image_url TEXT, -- คอลัมน์นี้จะเก็บ URL ของรูปภาพจาก Google Drive
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- เพิ่ม Comment อธิบายตาราง
COMMENT ON TABLE public.electric_poles IS 'ตารางทะเบียนเสาไฟฟ้าสาธารณะ';
COMMENT ON COLUMN public.electric_poles.pole_code IS 'รหัสเสาไฟฟ้า';
COMMENT ON COLUMN public.electric_poles.image_url IS 'URL รูปภาพเสาไฟฟ้า (เก็บที่ Google Drive)';

-- เปิดใช้งาน Row Level Security (RLS) เพื่อความปลอดภัยเบื้องต้น
ALTER TABLE public.electric_poles ENABLE ROW LEVEL SECURITY;

-- สร้าง Policy ให้อ่าน เขียน แก้ไข ลบ ข้อมูลได้ (ปรับตามความเหมาะสมของสิทธิ์ผู้ใช้งานจริง)
CREATE POLICY "Allow anonymous select on electric_poles" ON public.electric_poles FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert on electric_poles" ON public.electric_poles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update on electric_poles" ON public.electric_poles FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete on electric_poles" ON public.electric_poles FOR DELETE USING (true);
