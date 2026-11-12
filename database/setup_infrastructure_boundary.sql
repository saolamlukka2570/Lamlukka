-- database/setup_infrastructure_boundary.sql
-- คำสั่งสร้างตาราง ข้อมูลแนวเขตตำบล และ หลักเขต/หมุดภูมิศาสตร์ ใน Supabase

CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. ตารางขอบเขตการปกครอง/แนวเขตตำบล (infra_boundaries)
CREATE TABLE IF NOT EXISTS public.infra_boundaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    boundary_name VARCHAR(150) NOT NULL, -- ชื่อแนวเขต เช่น แนวเขตตำบล/แนวเขตหมู่ 1
    boundary_type VARCHAR(50) NOT NULL, -- ประเภทแนวเขต (แนวเขตตำบล, แนวเขตหมู่บ้าน)
    gazette_announcement_text TEXT, -- คำบรรยายแนวเขตอย่างเป็นทางการ (ประกาศกระทรวงมหาดไทย/ราชกิจจานุเบกษา)
    map_reference VARCHAR(150), -- แหล่งที่มาของระวางแผนที่อ้างอิง
    geom GEOMETRY(MultiPolygon, 4326), -- ขอบเขตเชิงพื้นที่โพลิกอน (MultiPolygon EPSG:4326)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Spatial Index
CREATE INDEX IF NOT EXISTS infra_boundaries_geom_idx ON public.infra_boundaries USING GIST(geom);

-- 2. ตารางทะเบียนหลักเขตและหมุดแนวเขตสำคัญ (infra_boundary_markers)
CREATE TABLE IF NOT EXISTS public.infra_boundary_markers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    marker_code VARCHAR(50) UNIQUE NOT NULL, -- รหัสหมุดหลักเขต (เช่น BM-01)
    marker_type VARCHAR(50) NOT NULL, -- ประเภทหลักเขต (หลักเขตตำบล, หลักเขตหมู่บ้าน, หมุดหมุดโครงข่าย GPS)
    description TEXT, -- รายละเอียดตำแหน่งและการสังเกต
    village_no VARCHAR(10), -- หมู่ที่ตั้งอยู่
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    marker_condition VARCHAR(50) DEFAULT 'perfect', -- สภาพทางกายภาพ (สมบูรณ์ดี, ชำรุดแตกหัก, สูญหาย/หาไม่พบ)
    image_url TEXT, -- ภาพถ่ายของหลักเขตในพื้นที่จริง
    document_url TEXT, -- ลิงก์เอกสารอ้างอิงหรือรูปถ่ายเปรียบเทียบในระวาง
    geom GEOMETRY(Point, 4326), -- ตำแหน่งเชิงภูมิศาสตร์แบบจุด (Point EPSG:4326)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Spatial Index
CREATE INDEX IF NOT EXISTS infra_boundary_markers_geom_idx ON public.infra_boundary_markers USING GIST(geom);

COMMENT ON TABLE public.infra_boundaries IS 'ตารางบันทึกประกาศคำบรรยายแนวเขตและขอบเขตตำบล/หมู่บ้าน';
COMMENT ON TABLE public.infra_boundary_markers IS 'ตารางบันทึกตำแหน่งทะเบียนหมุดและหลักเขตตำบลภูมิศาสตร์ทางวิศวกรรม';

-- RLS
ALTER TABLE public.infra_boundaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.infra_boundary_markers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select on infra_boundaries" ON public.infra_boundaries FOR SELECT USING (true);
CREATE POLICY "Allow insert on infra_boundaries" ON public.infra_boundaries FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on infra_boundaries" ON public.infra_boundaries FOR UPDATE USING (true);
CREATE POLICY "Allow delete on infra_boundaries" ON public.infra_boundaries FOR DELETE USING (true);

CREATE POLICY "Allow select on boundary_markers" ON public.infra_boundary_markers FOR SELECT USING (true);
CREATE POLICY "Allow insert on boundary_markers" ON public.infra_boundary_markers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on boundary_markers" ON public.infra_boundary_markers FOR UPDATE USING (true);
CREATE POLICY "Allow delete on boundary_markers" ON public.infra_boundary_markers FOR DELETE USING (true);
