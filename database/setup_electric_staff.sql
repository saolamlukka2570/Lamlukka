-- =========================================================================
-- สคริปต์สร้างฐานข้อมูลสำหรับเจ้าหน้าที่/ช่างไฟฟ้า (Electric Staff)
-- =========================================================================

-- 1. สร้างตารางเก็บรายชื่อเจ้าหน้าที่ไฟฟ้า (electric_staff)
CREATE TABLE IF NOT EXISTS public.electric_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    position VARCHAR(150),
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.electric_staff IS 'ข้อมูลเจ้าหน้าที่/ช่าง สำหรับระบบซ่อมบำรุงไฟฟ้าโดยเฉพาะ';

-- 2. เปิดใช้งาน Row Level Security (RLS) และกำหนดสิทธิ์ (Policies)
ALTER TABLE public.electric_staff ENABLE ROW LEVEL SECURITY;

-- ให้สิทธิ์ในการอ่าน (SELECT)
CREATE POLICY "Allow anonymous select on electric_staff" ON public.electric_staff FOR SELECT USING (true);
-- ให้สิทธิ์ในการเพิ่มข้อมูล (INSERT)
CREATE POLICY "Allow anonymous insert on electric_staff" ON public.electric_staff FOR INSERT WITH CHECK (true);
-- ให้สิทธิ์ในการแก้ไขข้อมูล (UPDATE)
CREATE POLICY "Allow anonymous update on electric_staff" ON public.electric_staff FOR UPDATE USING (true);
-- ให้สิทธิ์ในการลบข้อมูล (DELETE)
CREATE POLICY "Allow anonymous delete on electric_staff" ON public.electric_staff FOR DELETE USING (true);

-- =========================================================================
-- 3. เพิ่มข้อมูลตัวอย่างเจ้าหน้าที่ไฟฟ้า (Mock Data)
-- =========================================================================
INSERT INTO public.electric_staff (name, position, phone) VALUES
('สมชาย ช่างไฟประจำ', 'หัวหน้าช่างไฟฟ้า', '081-234-5678'),
('วิชัย สายตรง', 'ช่างไฟฟ้าปฏิบัติการ', '089-876-5432'),
('มานพ หลอดสว่าง', 'ผู้ช่วยช่างไฟฟ้า', '086-111-2222')
ON CONFLICT DO NOTHING;
