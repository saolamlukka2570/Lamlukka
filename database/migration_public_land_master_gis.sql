-- database/migration_public_land_master_gis.sql
-- คำสั่งปรับปรุงตาราง ที่สาธารณประโยชน์ ให้รองรับสถาปัตยกรรมเชิงพื้นที่ Master GIS (geometry_geojson & Auto-Trigger)

CREATE EXTENSION IF NOT EXISTS postgis;

-- =======================================================
-- 1. ปรับปรุงโครงสร้างตารางหลัก (infra_public_lands)
-- =======================================================
ALTER TABLE public.infra_public_lands ADD COLUMN IF NOT EXISTS geometry_geojson JSONB;

-- สร้างฟังก์ชันแปลงพิกัดอัตโนมัติสำหรับ ขอบเขตที่ดินสาธารณประโยชน์ (Polygon)
CREATE OR REPLACE FUNCTION public.update_infra_public_lands_geom()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.geometry_geojson IS NOT NULL THEN
        -- แปลง GeoJSON ไปสร้าง Geometry Polygon พิกัด EPSG:4326 (WGS 84)
        NEW.geom := ST_SetSRID(ST_GeomFromGeoJSON(NEW.geometry_geojson::text), 4326);
    ELSE
        -- หากไม่มี geometry_geojson แต่มีพิกัด centroid (lat, lng) สามารถคงค่า geom หรือปล่อยว่างตามพิกัดวาด
        -- (เราจะตั้งค่า geom ตาม GeoJSON เป็นหลัก)
        NEW.geom := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ผูกมัด Trigger
DROP TRIGGER IF EXISTS trg_update_infra_public_lands_geom ON public.infra_public_lands;
CREATE TRIGGER trg_update_infra_public_lands_geom
BEFORE INSERT OR UPDATE ON public.infra_public_lands
FOR EACH ROW
EXECUTE FUNCTION public.update_infra_public_lands_geom();

-- =======================================================
-- 2. คำอธิบายประกอบคอลัมน์ (Comments)
-- =======================================================
COMMENT ON COLUMN public.infra_public_lands.geometry_geojson IS 'เก็บชุดพิกัดแปลงขอบเขตที่ดินสาธารณประโยชน์ในรูปแบบ GeoJSON (Polygon)';
