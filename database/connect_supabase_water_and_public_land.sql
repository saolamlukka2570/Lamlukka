-- database/connect_supabase_water_and_public_land.sql
-- คำสั่งสร้างโครงสร้างตารางระบบฐานข้อมูลเชิงพื้นที่ (DDL & PostGIS Spatial Core)
-- สำหรับ แหล่งน้ำ, เส้นทางน้ำ, ระบบระบายน้ำ และ ที่สาธารณประโยชน์
-- --------------------------------------------------------------------------------------
-- นำสคริปต์นี้ไปคัดลอกและรันในหน้า SQL Editor ของ Supabase Dashboard เพื่อเชื่อมระบบแผนที่เข้าสู่ฐานข้อมูลคลาวด์ทันที!
-- --------------------------------------------------------------------------------------

-- 0. เปิดใช้งาน Extension ที่จำเป็น
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ======================================================================================
-- 1. ทะเบียนแหล่งน้ำนิ่งสาธารณะ (infra_water_resources) - Polygon Geometry
-- ======================================================================================
CREATE TABLE IF NOT EXISTS public.infra_water_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    water_code VARCHAR(50) UNIQUE NOT NULL, -- รหัสแหล่งน้ำ
    water_name VARCHAR(150) NOT NULL, -- ชื่อแหล่งน้ำ
    water_type VARCHAR(50) NOT NULL, -- ประเภทแหล่งน้ำ (หนอง, คลอง, บึง, สระน้ำชุมชน, อ่างเก็บน้ำ)
    surface_area_sqm DOUBLE PRECISION, -- ขนาดเนื้อที่ผิวน้ำ (ตารางเมตร)
    depth_m DOUBLE PRECISION, -- ความลึกเฉลี่ย (เมตร)
    capacity_cum DOUBLE PRECISION, -- ปริมาตรความจุน้ำ (ลูกบาศก์เมตร)
    village_no VARCHAR(10), -- หมู่ที่
    status VARCHAR(50) DEFAULT 'normal', -- สถานภาพแหล่งน้ำ
    latitude DOUBLE PRECISION, -- จุดศูนย์กลางภูมิศาสตร์ Centroid (Y)
    longitude DOUBLE PRECISION, -- จุดศูนย์กลางภูมิศาสตร์ Centroid (X)
    geom GEOMETRY(Polygon, 4326), -- แผนที่ขอบเขตแหล่งน้ำ (Polygon EPSG:4326)
    geometry_geojson JSONB, -- พิกัดชุดรูปแปลง GeoJSON สำหรับ Digitize บราวเซอร์
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- สร้าง Spatial Index สำหรับวิเคราะห์เชิงพื้นที่ของแหล่งน้ำ
CREATE INDEX IF NOT EXISTS infra_water_res_geom_idx ON public.infra_water_resources USING GIST(geom);

-- ทริกเกอร์ฟังก์ชันแปลง GeoJSON -> PostGIS Geometry อัตโนมัติ (Polygon)
CREATE OR REPLACE FUNCTION public.update_infra_water_res_geom()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.geometry_geojson IS NOT NULL THEN
        NEW.geom := ST_SetSRID(ST_GeomFromGeoJSON(NEW.geometry_geojson::text), 4326);
    ELSE
        NEW.geom := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_infra_water_res_geom ON public.infra_water_resources;
CREATE TRIGGER trg_update_infra_water_res_geom
BEFORE INSERT OR UPDATE ON public.infra_water_resources
FOR EACH ROW EXECUTE FUNCTION public.update_infra_water_res_geom();


-- ======================================================================================
-- 2. ทะเบียนเส้นทางน้ำธรรมชาติและลำธาร (infra_waterways) - LineString Geometry
-- ======================================================================================
CREATE TABLE IF NOT EXISTS public.infra_waterways (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    waterway_code VARCHAR(50) UNIQUE NOT NULL, -- รหัสเส้นทางน้ำ
    waterway_name VARCHAR(150) NOT NULL, -- ชื่อเส้นทางน้ำ
    waterway_type VARCHAR(50) NOT NULL, -- ประเภทเส้นทางน้ำ (คลองส่งน้ำ, ลำรางระบายน้ำ, ลำห้วยธรรมชาติ, ลำธาร)
    width_m DOUBLE PRECISION, -- ความกว้างสายน้ำ (เมตร)
    depth_m DOUBLE PRECISION, -- ความลึกเฉลี่ย (เมตร)
    length_m DOUBLE PRECISION, -- ความยาวสายน้ำ (เมตร)
    village_no VARCHAR(10), -- หมู่ที่
    status VARCHAR(50) DEFAULT 'normal', -- สภาพทางน้ำ
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    geom GEOMETRY(LineString, 4326), -- พิกัดเส้นแนวลำคลอง (LineString EPSG:4326)
    geometry_geojson JSONB, -- พิกัดชุดเส้นตรง GeoJSON
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS infra_waterways_geom_idx ON public.infra_waterways USING GIST(geom);

-- ทริกเกอร์ฟังก์ชันแปลง GeoJSON -> PostGIS Geometry อัตโนมัติ (LineString)
CREATE OR REPLACE FUNCTION public.update_infra_waterways_geom()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.geometry_geojson IS NOT NULL THEN
        NEW.geom := ST_SetSRID(ST_GeomFromGeoJSON(NEW.geometry_geojson::text), 4326);
    ELSE
        NEW.geom := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_infra_waterways_geom ON public.infra_waterways;
CREATE TRIGGER trg_update_infra_waterways_geom
BEFORE INSERT OR UPDATE ON public.infra_waterways
FOR EACH ROW EXECUTE FUNCTION public.update_infra_waterways_geom();


-- ======================================================================================
-- 3. ทะเบียนระบบระบายน้ำและฝาท่อ (infra_drainage_assets) - Point Geometry
-- ======================================================================================
CREATE TABLE IF NOT EXISTS public.infra_drainage_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id VARCHAR(50) UNIQUE NOT NULL, -- รหัสฝาท่อระบายน้ำ
    drainage_type VARCHAR(50) NOT NULL, -- ประเภท (ฝาท่อระบายน้ำ, รางระบายน้ำ, ท่อระบายน้ำ)
    material VARCHAR(50), -- วัสดุ (คอนกรีต, เหล็กหล่อ, พลาสติก HDPE)
    width_m DOUBLE PRECISION, -- ขนาดความกว้าง
    depth_m DOUBLE PRECISION, -- ความลึก
    length_m DOUBLE PRECISION, -- ความยาว
    road_id VARCHAR(50), -- เชื่อมโยงรหัสถนน
    village_no VARCHAR(10), -- หมู่ที่
    status VARCHAR(50) DEFAULT 'good', -- สภาพทางกายภาพ
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    geom GEOMETRY(Geometry, 4326), -- พิกัดแผนที่ (Point/LineString)
    geometry_geojson JSONB, -- พิกัดจุด GeoJSON
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS infra_drainage_geom_idx ON public.infra_drainage_assets USING GIST(geom);

-- ทริกเกอร์ฟังก์ชันแปลง GeoJSON -> PostGIS Geometry อัตโนมัติ (Point)
CREATE OR REPLACE FUNCTION public.update_infra_drainage_geom()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.geometry_geojson IS NOT NULL THEN
        NEW.geom := ST_SetSRID(ST_GeomFromGeoJSON(NEW.geometry_geojson::text), 4326);
    ELSE
        NEW.geom := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_infra_drainage_geom ON public.infra_drainage_assets;
CREATE TRIGGER trg_update_infra_drainage_geom
BEFORE INSERT OR UPDATE ON public.infra_drainage_assets
FOR EACH ROW EXECUTE FUNCTION public.update_infra_drainage_geom();


-- ======================================================================================
-- 4. ทะเบียนที่ดินสาธารณประโยชน์และราชพัสดุ (infra_public_lands) - Polygon Geometry
-- ======================================================================================
CREATE TABLE IF NOT EXISTS public.infra_public_lands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    land_code VARCHAR(50) UNIQUE NOT NULL, -- รหัสเลขสารบบ นสล.
    land_name VARCHAR(150) NOT NULL, -- ชื่อเรียกที่ดินสาธารณะ
    land_type VARCHAR(50) NOT NULL, -- ประเภทพื้นที่
    area_rai INTEGER DEFAULT 0, -- ขนาดพื้นที่ (ไร่)
    area_ngan INTEGER DEFAULT 0, -- ขนาดพื้นที่ (งาน)
    area_sqwa DOUBLE PRECISION DEFAULT 0, -- ขนาดพื้นที่ (ตารางวา)
    village_no VARCHAR(10), -- หมู่ที่ตั้ง
    status VARCHAR(50) DEFAULT 'used', -- สภาพการครอบครอง
    current_use TEXT, -- ประโยชน์ ณ ปัจจุบัน
    latitude DOUBLE PRECISION, -- จุด centroid Y
    longitude DOUBLE PRECISION, -- จุด centroid X
    geom GEOMETRY(Polygon, 4326), -- แผนที่ขอบเขตแปลง (Polygon EPSG:4326)
    geometry_geojson JSONB, -- พิกัดรูปแปลง GeoJSON สำหรับแก้ไขบน Leaflet
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS infra_public_lands_geom_idx ON public.infra_public_lands USING GIST(geom);

-- ทริกเกอร์ฟังก์ชันแปลง GeoJSON -> PostGIS Geometry อัตโนมัติ (Polygon)
CREATE OR REPLACE FUNCTION public.update_infra_public_lands_geom()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.geometry_geojson IS NOT NULL THEN
        NEW.geom := ST_SetSRID(ST_GeomFromGeoJSON(NEW.geometry_geojson::text), 4326);
    ELSE
        NEW.geom := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_infra_public_lands_geom ON public.infra_public_lands;
CREATE TRIGGER trg_update_infra_public_lands_geom
BEFORE INSERT OR UPDATE ON public.infra_public_lands
FOR EACH ROW EXECUTE FUNCTION public.update_infra_public_lands_geom();


-- ======================================================================================
-- 5. เปิดใช้งานความปลอดภัยระดับแถวข้อมูล (Row-Level Security)
-- ======================================================================================
ALTER TABLE public.infra_water_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.infra_waterways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.infra_drainage_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.infra_public_lands ENABLE ROW LEVEL SECURITY;

-- 6. การสร้างนโยบายเข้าถึงและทำรายการข้อมูล 100% (RLS Bypass for Open Operations)
DROP POLICY IF EXISTS "Allow select on infra_water_res" ON public.infra_water_resources;
DROP POLICY IF EXISTS "Allow insert on infra_water_res" ON public.infra_water_resources;
DROP POLICY IF EXISTS "Allow update on infra_water_res" ON public.infra_water_resources;
DROP POLICY IF EXISTS "Allow delete on infra_water_res" ON public.infra_water_resources;

CREATE POLICY "Allow select on infra_water_res" ON public.infra_water_resources FOR SELECT USING (true);
CREATE POLICY "Allow insert on infra_water_res" ON public.infra_water_resources FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on infra_water_res" ON public.infra_water_resources FOR UPDATE USING (true);
CREATE POLICY "Allow delete on infra_water_res" ON public.infra_water_resources FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow select on infra_waterways" ON public.infra_waterways;
DROP POLICY IF EXISTS "Allow insert on infra_waterways" ON public.infra_waterways;
DROP POLICY IF EXISTS "Allow update on infra_waterways" ON public.infra_waterways;
DROP POLICY IF EXISTS "Allow delete on infra_waterways" ON public.infra_waterways;

CREATE POLICY "Allow select on infra_waterways" ON public.infra_waterways FOR SELECT USING (true);
CREATE POLICY "Allow insert on infra_waterways" ON public.infra_waterways FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on infra_waterways" ON public.infra_waterways FOR UPDATE USING (true);
CREATE POLICY "Allow delete on infra_waterways" ON public.infra_waterways FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow select on infra_drainage" ON public.infra_drainage_assets;
DROP POLICY IF EXISTS "Allow insert on infra_drainage" ON public.infra_drainage_assets;
DROP POLICY IF EXISTS "Allow update on infra_drainage" ON public.infra_drainage_assets;
DROP POLICY IF EXISTS "Allow delete on infra_drainage" ON public.infra_drainage_assets;

CREATE POLICY "Allow select on infra_drainage" ON public.infra_drainage_assets FOR SELECT USING (true);
CREATE POLICY "Allow insert on infra_drainage" ON public.infra_drainage_assets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on infra_drainage" ON public.infra_drainage_assets FOR UPDATE USING (true);
CREATE POLICY "Allow delete on infra_drainage" ON public.infra_drainage_assets FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow select on infra_public_lands" ON public.infra_public_lands;
DROP POLICY IF EXISTS "Allow insert on infra_public_lands" ON public.infra_public_lands;
DROP POLICY IF EXISTS "Allow update on infra_public_lands" ON public.infra_public_lands;
DROP POLICY IF EXISTS "Allow delete on infra_public_lands" ON public.infra_public_lands;

CREATE POLICY "Allow select on infra_public_lands" ON public.infra_public_lands FOR SELECT USING (true);
CREATE POLICY "Allow insert on infra_public_lands" ON public.infra_public_lands FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on infra_public_lands" ON public.infra_public_lands FOR UPDATE USING (true);
CREATE POLICY "Allow delete on infra_public_lands" ON public.infra_public_lands FOR DELETE USING (true);

-- ======================================================================================
-- 7. ตารางบันทึกผลการจัดทำและนำเข้าข้อมูลภูมิสารสนเทศ (infra_gis_uploads)
-- ======================================================================================
CREATE TABLE IF NOT EXISTS public.infra_gis_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(250) NOT NULL, -- ชื่อไฟล์ที่อัปโหลด
    file_type VARCHAR(50) NOT NULL, -- ประเภทไฟล์ (.shp, .geojson, .kml, .zip)
    layer_name VARCHAR(150), -- ชื่อเลเยอร์เป้าหมาย
    crs VARCHAR(50) DEFAULT 'EPSG:4326', -- ระบบพิกัดแผนที่ที่ตรวจจับได้
    geom_type VARCHAR(50), -- รูปแบบพิกัด (Point, LineString, Polygon)
    features_count INTEGER DEFAULT 0, -- จำนวนฟีเจอร์ที่บันทึก
    mapped_fields JSONB, -- แผนภาพจำลองการจับคู่แอตทริบิวต์
    status VARCHAR(50) DEFAULT 'success', -- สถานะการนำเข้า
    file_url TEXT, -- ลิงก์ URL ของไฟล์ที่อัปโหลดบน Supabase Storage
    error_log TEXT, -- บันทึกความผิดพลาด (ถ้ามี)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.infra_gis_uploads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select on gis_uploads" ON public.infra_gis_uploads;
DROP POLICY IF EXISTS "Allow insert on gis_uploads" ON public.infra_gis_uploads;
DROP POLICY IF EXISTS "Allow update on gis_uploads" ON public.infra_gis_uploads;
DROP POLICY IF EXISTS "Allow delete on gis_uploads" ON public.infra_gis_uploads;

CREATE POLICY "Allow select on gis_uploads" ON public.infra_gis_uploads FOR SELECT USING (true);
CREATE POLICY "Allow insert on gis_uploads" ON public.infra_gis_uploads FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on gis_uploads" ON public.infra_gis_uploads FOR UPDATE USING (true);
CREATE POLICY "Allow delete on gis_uploads" ON public.infra_gis_uploads FOR DELETE USING (true);
