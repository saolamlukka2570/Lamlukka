-- database/setup_infrastructure_repairs.sql
-- คำสั่งสร้างตาราง ประวัติและระบบรับแจ้งซ่อมบำรุงโครงสร้างพื้นฐานดิจิทัล (infra_repairs)

CREATE TABLE IF NOT EXISTS public.infra_repairs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seq_num SERIAL, -- ลำดับความต่อเนื่องตัวเลข
    repair_code VARCHAR(50) UNIQUE, -- รหัสคำแจ้งซ่อม (เช่น INF-REP-001/2569)
    asset_type VARCHAR(100) NOT NULL, -- ประเภททรัพย์สิน (ถนน, แหล่งน้ำ, เส้นทางน้ำ, ฝาท่อระบายน้ำ, รางระบายน้ำ, ไฟฟ้าส่องสว่าง)
    asset_id VARCHAR(100) NOT NULL, -- รหัสประจำตัวของทรัพย์สิน (เช่น road_id, water_code, pole_code)
    damage_detail TEXT NOT NULL, -- รายละเอียด/อาการชำรุด
    reporter_name VARCHAR(150), -- ชื่อผู้แจ้งเรื่อง
    reporter_phone VARCHAR(50), -- เบอร์ติดต่อ
    status VARCHAR(50) DEFAULT 'pending', -- สถานะงาน (pending, accepted, in_progress, completed, cancelled)
    budget DOUBLE PRECISION DEFAULT 0.0, -- งบประมาณที่ใช้ (บาท)
    contractor VARCHAR(150), -- บริษัท/ห้างหุ้นส่วนผู้รับดำเนินการซ่อม
    materials_used JSONB, -- รายการอะไหล่/วัสดุที่ใช้ซ่อม
    image_url_before TEXT, -- ภาพถ่ายความชำรุดก่อนทำการซ่อม
    image_url_after TEXT, -- ภาพถ่ายความสำเร็จหลังทำการซ่อม
    latitude DOUBLE PRECISION, -- พิกัดจุดชำรุด
    longitude DOUBLE PRECISION,
    repair_date DATE, -- วันที่ดำเนินการซ่อมเสร็จสิ้น
    staff_name VARCHAR(150), -- ผู้รับผิดชอบ (วิศวกรผู้ควบคุมงานช่าง)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ฟังก์ชันอัตโนมัติในการสร้างรหัสใบงานแจ้งซ่อมบำรุง
CREATE OR REPLACE FUNCTION generate_infra_repair_code()
RETURNS TRIGGER AS $$
DECLARE
    thai_year TEXT;
    formatted_seq TEXT;
BEGIN
    thai_year := (EXTRACT(YEAR FROM CURRENT_DATE) + 543)::TEXT;
    formatted_seq := LPAD(NEW.seq_num::TEXT, 4, '0');
    NEW.repair_code := 'INF-REP-' || formatted_seq || '/' || thai_year;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS set_infra_repair_code ON public.infra_repairs;
CREATE TRIGGER set_infra_repair_code
BEFORE INSERT ON public.infra_repairs
FOR EACH ROW
EXECUTE FUNCTION generate_infra_repair_code();

COMMENT ON TABLE public.infra_repairs IS 'ตารางบันทึกประวัติการบำรุงรักษาและการแจ้งซ่อมโครงสร้างพื้นฐาน';

-- RLS
ALTER TABLE public.infra_repairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select on infra_repairs" ON public.infra_repairs FOR SELECT USING (true);
CREATE POLICY "Allow insert on infra_repairs" ON public.infra_repairs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on infra_repairs" ON public.infra_repairs FOR UPDATE USING (true);
CREATE POLICY "Allow delete on infra_repairs" ON public.infra_repairs FOR DELETE USING (true);
