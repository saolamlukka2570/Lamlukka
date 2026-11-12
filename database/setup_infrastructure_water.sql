-- database/setup_infrastructure_water.sql
-- คำสั่งสร้างตาราง แหล่งน้ำสาธารณะ และ เส้นทางน้ำ ใน Supabase

CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. ตารางแหล่งน้ำสาธารณะ (หนอง, คลอง, บึง, สระ, อ่างเก็บน้ำ)
CREATE TABLE IF NOT EXISTS public.infra_water_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    water_code VARCHAR(50) UNIQUE NOT NULL, -- รหัสแหล่งน้ำ
    water_name VARCHAR(150) NOT NULL, -- ชื่อแหล่งน้ำ
    water_type VARCHAR(50) NOT NULL, -- ประเภทแหล่งน้ำ (หนอง, คลอง, บึง, สระน้ำชุมชน, อ่างเก็บน้ำ)
    surface_area_sqm DOUBLE PRECISION, -- ขนาดเนื้อที่ผิวน้ำ (ตารางเมตร)
    depth_m DOUBLE PRECISION, -- ความลึกเฉลี่ย (เมตร)
    capacity_cum DOUBLE PRECISION, -- ปริมาตรความจุน้ำ (ลูกบาศก์เมตร)
    village_no VARCHAR(10), -- หมู่ที่
    status VARCHAR(50) DEFAULT 'normal', -- สถานภาพแหล่งน้ำ (ปกติ, ตื้นเขิน, เสื่อมโทรม)
    latitude DOUBLE PRECISION, -- จุดศูนย์กลางภูมิศาสตร์
    longitude DOUBLE PRECISION,
    geom GEOMETRY(Polygon, 4326), -- แผนที่ขอบเขตแหล่งน้ำ (Polygon EPSG:4326)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Spatial Index
CREATE INDEX IF NOT EXISTS infra_water_res_geom_idx ON public.infra_water_resources USING GIST(geom);

-- 2. ตารางเส้นทางน้ำสาธารณะ (คลองส่งน้ำ, ลำราง, ลำห้วย)
CREATE TABLE IF NOT EXISTS public.infra_waterways (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    waterway_code VARCHAR(50) UNIQUE NOT NULL, -- รหัสเส้นทางน้ำ
    waterway_name VARCHAR(150) NOT NULL, -- ชื่อเส้นทางน้ำ
    waterway_type VARCHAR(50) NOT NULL, -- ประเภทเส้นทางน้ำ (คลองส่งน้ำ, ลำรางระบายน้ำ, ลำห้วยธรรมชาติ, ลำธาร)
    width_m DOUBLE PRECISION, -- ความกว้างสายน้ำ (เมตร)
    depth_m DOUBLE PRECISION, -- ความลึกเฉลี่ย (เมตร)
    length_m DOUBLE PRECISION, -- ความยาวสายน้ำ (เมตร)
    village_no VARCHAR(10), -- หมู่ที่
    status VARCHAR(50) DEFAULT 'normal', -- สภาพทางน้ำ (ไหลเวียนดี, อุดตัน/วัชพืชหนาแน่น, ตื้นเขิน)
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    geom GEOMETRY(LineString, 4326), -- พิกัดเส้นแนวคลอง (LineString EPSG:4326)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Spatial Index
CREATE INDEX IF NOT EXISTS infra_waterways_geom_idx ON public.infra_waterways USING GIST(geom);

COMMENT ON TABLE public.infra_water_resources IS 'ตารางทะเบียนแหล่งน้ำนิ่งสาธารณะ';
COMMENT ON COLUMN public.infra_water_resources.geom IS 'รูปทรงพื้นที่ขอบเขตของแหล่งน้ำ (Polygon EPSG:4326)';

COMMENT ON TABLE public.infra_waterways IS 'ตารางทะเบียนเส้นทางระบายน้ำและคลองธรรมชาติ';
COMMENT ON COLUMN public.infra_waterways.geom IS 'เส้นกลางแนวลำคลองหรือลำธาร (LineString EPSG:4326)';

-- RLS
ALTER TABLE public.infra_water_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.infra_waterways ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select on infra_water_res" ON public.infra_water_resources FOR SELECT USING (true);
CREATE POLICY "Allow insert on infra_water_res" ON public.infra_water_resources FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on infra_water_res" ON public.infra_water_resources FOR UPDATE USING (true);
CREATE POLICY "Allow delete on infra_water_res" ON public.infra_water_resources FOR DELETE USING (true);

CREATE POLICY "Allow select on infra_waterways" ON public.infra_waterways FOR SELECT USING (true);
CREATE POLICY "Allow insert on infra_waterways" ON public.infra_waterways FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on infra_waterways" ON public.infra_waterways FOR UPDATE USING (true);
CREATE POLICY "Allow delete on infra_waterways" ON public.infra_waterways FOR DELETE USING (true);
