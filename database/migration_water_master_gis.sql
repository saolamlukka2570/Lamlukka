-- database/migration_water_master_gis.sql
-- คำสั่งปรับปรุงตาราง แหล่งน้ำ เส้นทางน้ำ และระบบระบายน้ำ ให้รองรับสถาปัตยกรรมเชิงพื้นที่ Master GIS (geometry_geojson & Auto-Trigger)

CREATE EXTENSION IF NOT EXISTS postgis;

-- =======================================================
-- 1. ตารางแหล่งน้ำสาธารณะ (infra_water_resources)
-- =======================================================
ALTER TABLE public.infra_water_resources ADD COLUMN IF NOT EXISTS geometry_geojson JSONB;

-- สร้างฟังก์ชันแปลงพิกัดอัตโนมัติสำหรับ แหล่งน้ำสาธารณะ (Polygon)
CREATE OR REPLACE FUNCTION public.update_infra_water_res_geom()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.geometry_geojson IS NOT NULL THEN
        -- แปลง GeoJSON ไปสร้าง Geometry Polygon พิกัด EPSG:4326 (WGS 84)
        NEW.geom := ST_SetSRID(ST_GeomFromGeoJSON(NEW.geometry_geojson::text), 4326);
    ELSE
        NEW.geom := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ผูกมัด Trigger
DROP TRIGGER IF EXISTS trg_update_infra_water_res_geom ON public.infra_water_resources;
CREATE TRIGGER trg_update_infra_water_res_geom
BEFORE INSERT OR UPDATE ON public.infra_water_resources
FOR EACH ROW
EXECUTE FUNCTION public.update_infra_water_res_geom();

-- =======================================================
-- 2. ตารางเส้นทางน้ำไหล (infra_waterways)
-- =======================================================
ALTER TABLE public.infra_waterways ADD COLUMN IF NOT EXISTS geometry_geojson JSONB;

-- สร้างฟังก์ชันแปลงพิกัดอัตโนมัติสำหรับ เส้นทางน้ำไหล (LineString)
CREATE OR REPLACE FUNCTION public.update_infra_waterways_geom()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.geometry_geojson IS NOT NULL THEN
        -- แปลง GeoJSON ไปสร้าง Geometry LineString พิกัด EPSG:4326 (WGS 84)
        NEW.geom := ST_SetSRID(ST_GeomFromGeoJSON(NEW.geometry_geojson::text), 4326);
    ELSE
        NEW.geom := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ผูกมัด Trigger
DROP TRIGGER IF EXISTS trg_update_infra_waterways_geom ON public.infra_waterways;
CREATE TRIGGER trg_update_infra_waterways_geom
BEFORE INSERT OR UPDATE ON public.infra_waterways
FOR EACH ROW
EXECUTE FUNCTION public.update_infra_waterways_geom();

-- =======================================================
-- 3. ตารางระบบระบายน้ำและฝาท่อ (infra_drainage_assets)
-- =======================================================
ALTER TABLE public.infra_drainage_assets ADD COLUMN IF NOT EXISTS geometry_geojson JSONB;

-- สร้างฟังก์ชันแปลงพิกัดอัตโนมัติสำหรับ ฝาท่อระบายน้ำ/ท่อระบายน้ำ (Geometry/Point)
CREATE OR REPLACE FUNCTION public.update_infra_drainage_geom()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.geometry_geojson IS NOT NULL THEN
        -- แปลง GeoJSON ไปสร้าง Geometry พิกัด EPSG:4326 (WGS 84)
        NEW.geom := ST_SetSRID(ST_GeomFromGeoJSON(NEW.geometry_geojson::text), 4326);
    ELSE
        NEW.geom := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ผูกมัด Trigger
DROP TRIGGER IF EXISTS trg_update_infra_drainage_geom ON public.infra_drainage_assets;
CREATE TRIGGER trg_update_infra_drainage_geom
BEFORE INSERT OR UPDATE ON public.infra_drainage_assets
FOR EACH ROW
EXECUTE FUNCTION public.update_infra_drainage_geom();

-- =======================================================
-- 4. คำอธิบายประกอบเพื่อความชัดเจน
-- =======================================================
COMMENT ON COLUMN public.infra_water_resources.geometry_geojson IS 'เก็บชุดพิกัดขอบเขตแหล่งน้ำในรูปแบบ GeoJSON (Polygon)';
COMMENT ON COLUMN public.infra_waterways.geometry_geojson IS 'เก็บชุดพิกัดเส้นทางน้ำไหลในรูปแบบ GeoJSON (LineString)';
COMMENT ON COLUMN public.infra_drainage_assets.geometry_geojson IS 'เก็บชุดพิกัดจุดหรือเส้นระบบระบายน้ำในรูปแบบ GeoJSON (Point/LineString)';
