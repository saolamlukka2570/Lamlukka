-- database/setup_infrastructure_roads.sql
-- คำสั่งสร้างตาราง ทะเบียนถนนและโครงข่ายทางหลวงท้องถิ่น (infra_roads) ใน Supabase
-- รองรับส่วนขยาย PostGIS เพื่อความสามารถด้านระบบพิกัดภูมิศาสตร์ (GIS)

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS public.infra_roads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    road_id VARCHAR(50) UNIQUE NOT NULL, -- รหัสสายทาง (เช่น ถ.ทถ. 1-0001)
    road_cl VARCHAR(50), -- รหัสจำแนกชั้นทางหลวงท้องถิ่น
    road_name VARCHAR(150) NOT NULL, -- ชื่อถนน/ซอย
    road_type VARCHAR(50) NOT NULL, -- ประเภทถนน (ถนนขึ้นทะเบียนทางหลวง, ถนนในแผนพัฒนา, ถนนภายในตำบล)
    surface_type VARCHAR(50), -- ประเภทผิวจราจร (คอนกรีตเสริมเหล็ก, แอสฟัลต์ติก/ลาดยาง, หินคลุก/ลูกรัง, อื่นๆ)
    width DOUBLE PRECISION, -- ความกว้างถนน (เมตร)
    length_m DOUBLE PRECISION, -- ความยาวถนน (เมตร)
    village_no VARCHAR(10), -- หมู่ที่
    status VARCHAR(50) DEFAULT 'good', -- สภาพถนน (ดี, ชำรุดบางส่วน, ชำรุดหนัก, อยู่ระหว่างซ่อม)
    construction_year INTEGER, -- ปีที่ก่อสร้าง (พ.ศ.)
    budget_source VARCHAR(150), -- แหล่งงบประมาณก่อสร้าง
    latitude DOUBLE PRECISION, -- จุดศูนย์กลางเริ่มต้น (พิกัด Y)
    longitude DOUBLE PRECISION, -- จุดศูนย์กลางเริ่มต้น (พิกัด X)
    geom GEOMETRY(LineString, 4326), -- เส้นแผนที่เชิงพื้นที่ถนน (Spatial Feature)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- สร้างดัชนีเชิงพื้นที่ (Spatial Index) เพื่อเร่งประสิทธิภาพการสืบค้น
CREATE INDEX IF NOT EXISTS infra_roads_geom_idx ON public.infra_roads USING GIST(geom);

COMMENT ON TABLE public.infra_roads IS 'ตารางทะเบียนถนนและโครงข่ายทางหลวงท้องถิ่น';
COMMENT ON COLUMN public.infra_roads.road_id IS 'รหัสสายทาง/รหัสทะเบียนถนน';
COMMENT ON COLUMN public.infra_roads.geom IS 'ข้อมูลแผนที่เชิงเส้นของถนน (LineString EPSG:4326)';

-- เปิดใช้งาน RLS
ALTER TABLE public.infra_roads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous select on infra_roads" ON public.infra_roads FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert on infra_roads" ON public.infra_roads FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update on infra_roads" ON public.infra_roads FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete on infra_roads" ON public.infra_roads FOR DELETE USING (true);
