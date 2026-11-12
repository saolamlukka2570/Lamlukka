-- database/setup_infrastructure_roads_master_gis.sql
-- คำสั่งสร้างตาราง Master GIS Database สำหรับโครงข่ายถนน (digital_infrastructure_roads)
-- รองรับการจัดเก็บข้อมูลพิกัดภูมิสารสนเทศ (GIS) โดยใช้ระบบ PostGIS แบบสมบูรณ์แบบ

-- 1. ตรวจสอบและติดตั้ง Extension PostGIS และ UUID
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. สร้างตารางฐานข้อมูลเชิงพื้นที่หลัก
CREATE TABLE IF NOT EXISTS public.digital_infrastructure_roads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    road_code TEXT UNIQUE NOT NULL,                       -- รหัสสายทาง/รหัสทะเบียนถนน (เช่น SS1001, ถ.ทถ. 1-0001)
    road_name TEXT NOT NULL,                             -- ชื่อถนนหลัก/ซอยหลวงท้องถิ่น
    road_type TEXT NOT NULL,                             -- ประเภทถนน (ถนนขึ้นทะเบียนทางหลวง, ถนนในแผนพัฒนา, ถนนภายในตำบล)
    road_width NUMERIC,                                  -- ความกว้างหน้าตัดของถนน (เมตร)
    road_length NUMERIC,                                 -- ความยาวระยะสายทางทั้งหมด (เมตร)
    village_no INTEGER,                                  -- หมู่ที่ตั้งของทางถนน
    construction_year INTEGER,                           -- ปีที่สร้างสายทาง (พ.ศ.)
    road_status TEXT DEFAULT 'good',                     -- สภาพถนนปัจจุบัน (good:ดี, fair:ปานกลาง, poor:ชำรุดหนัก, repair:ระหว่างซ่อม)
    start_latitude NUMERIC,                              -- จุดพิกัดเส้นละติจูดเริ่มต้น (Y)
    start_longitude NUMERIC,                             -- จุดพิกัดเส้นลองจิจูดเริ่มต้น (X)
    created_by TEXT,                                     -- ชื่อผู้ดูแลระบบหรือผู้กรอกข้อมูล
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    
    -- คอลัมน์ด้านพิกัดและเรขาคณิต (Spatial GIS Fields)
    geometry_geojson JSONB,                             -- เก็บชุดพิกัดรูปแบบ GeoJSON LineString (Primary Raw JSON)
    geom GEOMETRY(LineString, 4326),                    -- ฟิลด์ PostGIS เรขาคณิตเส้นพิกัดสายทางทางหลวงท้องถิ่น

    -- ฟิลด์ส่วนต่อขยายเพื่อสนับสนุน UI/UX ระบบเดิมแบบ 100% ไม่ให้หน้าฟอร์มพัง
    road_cl TEXT,                                        -- ชั้นทางหลวงท้องถิ่น
    surface_type TEXT,                                   -- ประเภทวัสดุผิวจราจร
    budget_source TEXT,                                  -- แหล่งเงินงบประมาณ
    budget_amount NUMERIC,                               -- งบประมาณจัดสรรในแผน (บาท)
    plan_year INTEGER                                    -- ปีตามแผนพัฒนาท้องถิ่น
);

-- 3. สร้างดัชนีเชิงพื้นที่ (Spatial Index) เร่งความเร็วการประมวลผลและการค้นหาพิกัด
CREATE INDEX IF NOT EXISTS idx_roads_geom 
ON public.digital_infrastructure_roads 
USING GIST(geom);

-- 4. เขียนฟังก์ชัน Trigger เพื่อแปลงค่า GeoJSON จากไคลเอนต์เข้าฟิลด์เรขาคณิตอัตโนมัติ
CREATE OR REPLACE FUNCTION public.update_digital_infra_roads_geom()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.geometry_geojson IS NOT NULL THEN
        -- แปลงข้อความ JSONB ของ GeoJSON ไปสร้าง Geometry ของ PostGIS พิกัด EPSG:4326 (WGS 84)
        NEW.geom := ST_SetSRID(ST_GeomFromGeoJSON(NEW.geometry_geojson::text), 4326);
    ELSE
        NEW.geom := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. สลับผูกมัด Trigger เข้ากับตารางหลัก
DROP TRIGGER IF EXISTS trg_update_digital_infra_roads_geom ON public.digital_infrastructure_roads;
CREATE TRIGGER trg_update_digital_infra_roads_geom
BEFORE INSERT OR UPDATE ON public.digital_infrastructure_roads
FOR EACH ROW
EXECUTE FUNCTION public.update_digital_infra_roads_geom();

-- 6. ให้คำอธิบายประกอบโครงสร้างฐานข้อมูล
COMMENT ON TABLE public.digital_infrastructure_roads IS 'ตารางหลักเก็บพิกัด GIS ทะเบียนถนนและโครงข่ายทางหลวงท้องถิ่น';
COMMENT ON COLUMN public.digital_infrastructure_roads.geometry_geojson IS 'ชุดเก็บพิกัดภูมิศาสตร์รูปแบบ GeoJSON (LineString)';
COMMENT ON COLUMN public.digital_infrastructure_roads.geom IS 'เรขาคณิตสปาเชียลของ PostGIS พิกัด EPSG:4326 (LineString)';

-- 7. เปิดใช้งานการเข้าถึงอย่างปลอดภัยและ RLS แบบไม่เสียช่องทางเชื่อมต่อ
ALTER TABLE public.digital_infrastructure_roads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous select on digital_infrastructure_roads" 
ON public.digital_infrastructure_roads FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert on digital_infrastructure_roads" 
ON public.digital_infrastructure_roads FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update on digital_infrastructure_roads" 
ON public.digital_infrastructure_roads FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous delete on digital_infrastructure_roads" 
ON public.digital_infrastructure_roads FOR DELETE USING (true);
