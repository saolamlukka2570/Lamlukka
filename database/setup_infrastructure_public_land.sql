-- database/setup_infrastructure_public_land.sql
-- คำสั่งสร้างตาราง ทะเบียนที่ดินสาธารณประโยชน์ (infra_public_lands) ใน Supabase

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS public.infra_public_lands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    land_code VARCHAR(50) UNIQUE NOT NULL, -- รหัสทะเบียนที่ดิน/เลขสารบบ นสล.
    land_name VARCHAR(150) NOT NULL, -- ชื่อเรียกที่ดินสาธารณประโยชน์/สถานที่ราชการ
    land_type VARCHAR(50) NOT NULL, -- ประเภทพื้นที่ (ที่สาธารณะประโยชน์, พื้นที่สีเขียว/สวนสาธารณะ, พื้นที่ราชพัสดุ, ป่าชุมชน)
    area_rai INTEGER DEFAULT 0, -- เนื้อที่ (ไร่)
    area_ngan INTEGER DEFAULT 0, -- เนื้อที่ (งาน)
    area_sqwa DOUBLE PRECISION DEFAULT 0, -- เนื้อที่ (ตารางวา)
    village_no VARCHAR(10), -- หมู่ที่
    status VARCHAR(50) DEFAULT 'used', -- สภาพการครอบครอง (สงวนหวงห้ามไว้ใช้ร่วมกัน, ขึ้นทะเบียนแล้วแต่ราษฎรครอบครอง, ใช้ประโยชน์ในราชการ)
    current_use TEXT, -- วัตถุประสงค์การใช้ประโยชน์ ณ ปัจจุบัน
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    geom GEOMETRY(Polygon, 4326), -- ขอบเขตที่ดินเชิงแปลงแผนที่ (Polygon EPSG:4326)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Spatial Index
CREATE INDEX IF NOT EXISTS infra_public_lands_geom_idx ON public.infra_public_lands USING GIST(geom);

COMMENT ON TABLE public.infra_public_lands IS 'ตารางทะเบียนที่สาธารณประโยชน์และที่ดินราชพัสดุ';
COMMENT ON COLUMN public.infra_public_lands.geom IS 'รูปทรงเชิงแปลงขอบเขตของที่ดิน (Polygon EPSG:4326)';

-- RLS
ALTER TABLE public.infra_public_lands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select on infra_public_lands" ON public.infra_public_lands FOR SELECT USING (true);
CREATE POLICY "Allow insert on infra_public_lands" ON public.infra_public_lands FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on infra_public_lands" ON public.infra_public_lands FOR UPDATE USING (true);
CREATE POLICY "Allow delete on infra_public_lands" ON public.infra_public_lands FOR DELETE USING (true);
