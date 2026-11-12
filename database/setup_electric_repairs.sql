-- คำสั่งสร้างตาราง แจ้งซ่อมไฟฟ้า (electric_repairs) ใน Supabase
-- และระบบสร้างเลขคำร้องอัตโนมัติ (เช่น 001/2569)

CREATE TABLE IF NOT EXISTS public.electric_repairs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seq_num SERIAL, -- ลำดับตัวเลขรันอัตโนมัติ 1, 2, 3...
    complaint_id VARCHAR(50) UNIQUE, -- เลขคำร้อง (เช่น 001/2569)
    reporter_name VARCHAR(150),
    reporter_phone VARCHAR(50),
    reporter_address TEXT,
    pole_id VARCHAR(50),
    damage_cause TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    status VARCHAR(50) DEFAULT 'pending',
    image_url TEXT,
    staff_id UUID,
    staff_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.electric_repairs IS 'ตารางบันทึกการแจ้งซ่อมไฟฟ้าสาธารณะ';

-- สร้างฟังก์ชันสำหรับเจนเลขคำร้องอัตโนมัติ (Trigger Function)
CREATE OR REPLACE FUNCTION generate_complaint_id()
RETURNS TRIGGER AS $$
DECLARE
    buddhist_year TEXT;
    formatted_seq TEXT;
BEGIN
    -- ดึงปีปัจจุบัน (ค.ศ.) แล้วบวก 543 เพื่อแปลงเป็น พ.ศ.
    buddhist_year := (EXTRACT(YEAR FROM CURRENT_DATE) + 543)::TEXT;
    
    -- จัดรูปแบบตัวเลข seq_num ให้มี 3 หลัก (เช่น 1 -> 001)
    formatted_seq := LPAD(NEW.seq_num::TEXT, 3, '0');
    
    -- นำมาต่อกันแล้วเก็บลงใน complaint_id (เช่น 001/2569)
    NEW.complaint_id := formatted_seq || '/' || buddhist_year;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- สร้าง Trigger เพื่อเรียกใช้ฟังก์ชันทุกครั้งที่มีการ INSERT ข้อมูลใหม่
DROP TRIGGER IF EXISTS set_electric_complaint_id ON public.electric_repairs;
CREATE TRIGGER set_electric_complaint_id
BEFORE INSERT ON public.electric_repairs
FOR EACH ROW
EXECUTE FUNCTION generate_complaint_id();

-- เปิดใช้งาน Row Level Security (RLS)
ALTER TABLE public.electric_repairs ENABLE ROW LEVEL SECURITY;

-- สร้าง Policy ให้อ่าน เขียน แก้ไข ลบ ข้อมูลได้ (ปรับตามความเหมาะสมของสิทธิ์ผู้ใช้งานจริง)
CREATE POLICY "Allow anonymous select on electric_repairs" ON public.electric_repairs FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert on electric_repairs" ON public.electric_repairs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update on electric_repairs" ON public.electric_repairs FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete on electric_repairs" ON public.electric_repairs FOR DELETE USING (true);

-- อัปเดตตารางเพื่อรองรับการบันทึกผลการซ่อม (Repair Detail & Image)
ALTER TABLE public.electric_repairs ADD COLUMN IF NOT EXISTS repair_detail TEXT;
ALTER TABLE public.electric_repairs ADD COLUMN IF NOT EXISTS repair_image_url TEXT;
ALTER TABLE public.electric_repairs ADD COLUMN IF NOT EXISTS repair_date DATE;
