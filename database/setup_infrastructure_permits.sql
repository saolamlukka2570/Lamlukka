-- database/setup_infrastructure_permits.sql
-- คำสั่งสร้างตารางคำขออนุญาต E-Permit และ แฟ้มเตรียมความพร้อมเงินอุดหนุนเฉพาะกิจ

CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. ตารางคำขอก่อสร้าง ดัดแปลง รื้อถอน และเคลื่อนย้ายอาคาร (infra_permits)
CREATE TABLE IF NOT EXISTS public.infra_permits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seq_num SERIAL,
    permit_code VARCHAR(50) UNIQUE, -- เลขใบคำขอ (เช่น EP-INF-0001/2569)
    permit_type VARCHAR(100) NOT NULL, -- ประเภท (Building Permit, Construction Permit, Demolition Permit, Modification Permit)
    applicant_name VARCHAR(150) NOT NULL, -- ชื่อผู้ยื่นคำขอ
    applicant_phone VARCHAR(50),
    building_type VARCHAR(150), -- ประเภทสิ่งก่อสร้าง (อาคารเดี่ยว 2 ชั้น, กำแพงกั้นดิน, สะพานทางข้าม)
    address TEXT, -- ที่อยู่ดำเนินการก่อสร้าง
    parcel_id VARCHAR(50), -- เชื่อมโยงรหัสระวางโฉนด/เลขแปลงที่ดิน
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    status VARCHAR(50) DEFAULT 'submitted', -- สถานภาพคำขอ (submitted, reviewing, approved, issued, rejected)
    document_url TEXT, -- ลิงก์เก็บเอกสาร PDF แบบร่างอาคาร
    inspection_notes TEXT, -- บันทึกความคิดเห็นของวิศวกรผู้ตรวจหน้างาน
    geom GEOMETRY(Point, 4326), -- พิกัด GIS ของสถานที่ก่อสร้าง
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Spatial Index
CREATE INDEX IF NOT EXISTS infra_permits_geom_idx ON public.infra_permits USING GIST(geom);

-- Trigger ฟังก์ชันสร้างรหัสคำขอ E-Permit อัตโนมัติ
CREATE OR REPLACE FUNCTION generate_infra_permit_code()
RETURNS TRIGGER AS $$
DECLARE
    thai_year TEXT;
    formatted_seq TEXT;
BEGIN
    thai_year := (EXTRACT(YEAR FROM CURRENT_DATE) + 543)::TEXT;
    formatted_seq := LPAD(NEW.seq_num::TEXT, 4, '0');
    NEW.permit_code := 'EP-INF-' || formatted_seq || '/' || thai_year;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_infra_permit_code ON public.infra_permits;
CREATE TRIGGER set_infra_permit_code
BEFORE INSERT ON public.infra_permits
FOR EACH ROW
EXECUTE FUNCTION generate_infra_permit_code();

-- 2. ตารางเอกสารจัดตั้งงบประมาณขอเงินอุดหนุนเฉพาะกิจ (infra_grant_proposals)
CREATE TABLE IF NOT EXISTS public.infra_grant_proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_code VARCHAR(50) UNIQUE NOT NULL, -- รหัสแบบขอทุน
    project_name VARCHAR(250) NOT NULL, -- ชื่อโครงการ
    budget_amount DOUBLE PRECISION DEFAULT 0.0, -- ประมาณการวงเงินงบประมาณ
    boq_detail JSONB, -- ตารางประมาณราคาแบบละเอียด (BOQ)
    cost_estimate DOUBLE PRECISION, -- ยอดประมาณราคารวมวิศวกรรม
    project_justification TEXT, -- หลักการและเหตุผลความจำเป็นของโครงการ
    location_map_url TEXT, -- รูปภาพแผนที่นำทางระบุจุดดำเนินงาน
    photo_urls TEXT[], -- อาเรย์ลิงก์ภาพถ่ายความเดือดร้อน
    supporting_documents JSONB, -- รายชื่อและลิงก์เอกสารแนบอื่นๆ
    status VARCHAR(50) DEFAULT 'draft', -- สถานะเอกสาร (draft, finalized, submitted, approved, budget_allocated)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.infra_permits IS 'ตารางแฟ้มทะเบียนคำขอใบอนุญาตด้านโยธาเชิงแผนที่ GIS';
COMMENT ON TABLE public.infra_grant_proposals IS 'ตารางแบบฟอร์มจัดทำเงินอุดหนุนเฉพาะกิจของกองช่าง';

-- RLS
ALTER TABLE public.infra_permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.infra_grant_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select on infra_permits" ON public.infra_permits FOR SELECT USING (true);
CREATE POLICY "Allow insert on infra_permits" ON public.infra_permits FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on infra_permits" ON public.infra_permits FOR UPDATE USING (true);
CREATE POLICY "Allow delete on infra_permits" ON public.infra_permits FOR DELETE USING (true);

CREATE POLICY "Allow select on grant_proposals" ON public.infra_grant_proposals FOR SELECT USING (true);
CREATE POLICY "Allow insert on grant_proposals" ON public.infra_grant_proposals FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on grant_proposals" ON public.infra_grant_proposals FOR UPDATE USING (true);
CREATE POLICY "Allow delete on grant_proposals" ON public.infra_grant_proposals FOR DELETE USING (true);
