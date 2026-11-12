-- database/setup_infrastructure_drainage.sql
-- คำสั่งสร้างตาราง ทะเบียนระบบระบายน้ำ (infra_drainage_assets) ใน Supabase

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS public.infra_drainage_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id VARCHAR(50) UNIQUE NOT NULL, -- รหัสสินทรัพย์ระบายน้ำ (เช่น DN-0001)
    drainage_type VARCHAR(50) NOT NULL, -- ประเภทระบบระบายน้ำ (ฝาท่อระบายน้ำ, รางระบายน้ำ, ท่อระบายน้ำ)
    material VARCHAR(50), -- วัสดุ (คอนกรีต, เหล็กหล่อ, พลาสติก HDPE, หินก่อ)
    width_m DOUBLE PRECISION, -- ขนาดความกว้าง/เส้นผ่านศูนย์กลาง (เมตร)
    depth_m DOUBLE PRECISION, -- ความลึก (เมตร)
    length_m DOUBLE PRECISION, -- ความยาว (เมตร) (สำหรับรางหรือท่อระบายน้ำแบบเส้น)
    road_id VARCHAR(50), -- เชื่อมโยงกับรหัสสายทาง/ถนน
    village_no VARCHAR(10), -- หมู่ที่
    status VARCHAR(50) DEFAULT 'good', -- สถานะสภาพทางกายภาพ (ปกติ/ไหลดี, ชำรุด/อุดตัน, แตกหักต้องเปลี่ยน)
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    geom GEOMETRY(Geometry, 4326), -- พิกัดแผนที่ (สามารถเป็น Point หรือ LineString ขึ้นกับประเภท)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Spatial Index
CREATE INDEX IF NOT EXISTS infra_drainage_geom_idx ON public.infra_drainage_assets USING GIST(geom);

COMMENT ON TABLE public.infra_drainage_assets IS 'ตารางทะเบียนระบบและท่อระบายน้ำสาธารณะ';
COMMENT ON COLUMN public.infra_drainage_assets.geom IS 'รูปทรงเชิงตำแหน่งทางภูมิศาสตร์ (Point, LineString EPSG:4326)';

-- RLS
ALTER TABLE public.infra_drainage_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select on infra_drainage" ON public.infra_drainage_assets FOR SELECT USING (true);
CREATE POLICY "Allow insert on infra_drainage" ON public.infra_drainage_assets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on infra_drainage" ON public.infra_drainage_assets FOR UPDATE USING (true);
CREATE POLICY "Allow delete on infra_drainage" ON public.infra_drainage_assets FOR DELETE USING (true);
