-- database/migration_boundary_master_gis.sql
-- อัปเกรดตารางขอบเขตการปกครองและหมุดหลักเขตเป็น Master GIS Database บน Supabase
-- --------------------------------------------------------------------------------------
-- นำสคริปต์นี้ไปรันในหน้า SQL Editor ของ Supabase Dashboard เพื่อเปิดระบบทันที!
-- --------------------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ตารางขอบเขตการปกครอง (infra_boundaries)
CREATE TABLE IF NOT EXISTS public.infra_boundaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    boundary_name VARCHAR(150) NOT NULL,
    boundary_type VARCHAR(50) NOT NULL,
    village_no VARCHAR(10),
    area_sqm DOUBLE PRECISION,
    area_sqkm DOUBLE PRECISION,
    area_rai DOUBLE PRECISION,
    gazette_announcement_text TEXT,
    map_reference VARCHAR(150),
    gazette_pdf_url TEXT,
    map_annex_url TEXT,
    geom GEOMETRY(MultiPolygon, 4326),
    geometry_geojson JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- เพิ่มคอลัมน์หากมีตารางอยู่แล้ว
ALTER TABLE public.infra_boundaries ADD COLUMN IF NOT EXISTS village_no VARCHAR(10);
ALTER TABLE public.infra_boundaries ADD COLUMN IF NOT EXISTS area_sqm DOUBLE PRECISION;
ALTER TABLE public.infra_boundaries ADD COLUMN IF NOT EXISTS area_sqkm DOUBLE PRECISION;
ALTER TABLE public.infra_boundaries ADD COLUMN IF NOT EXISTS area_rai DOUBLE PRECISION;
ALTER TABLE public.infra_boundaries ADD COLUMN IF NOT EXISTS geometry_geojson JSONB;
ALTER TABLE public.infra_boundaries ADD COLUMN IF NOT EXISTS gazette_pdf_url TEXT;
ALTER TABLE public.infra_boundaries ADD COLUMN IF NOT EXISTS map_annex_url TEXT;

-- สร้างดัชนีเชิงพื้นที่
CREATE INDEX IF NOT EXISTS infra_boundaries_geom_idx ON public.infra_boundaries USING GIST(geom);

-- ทริกเกอร์ฟังก์ชันแปลง GeoJSON -> PostGIS Geometry อัตโนมัติ (MultiPolygon)
CREATE OR REPLACE FUNCTION public.update_infra_boundaries_geom()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.geometry_geojson IS NOT NULL THEN
        NEW.geom := ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(NEW.geometry_geojson::text), 4326));
    ELSE
        NEW.geom := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_infra_boundaries_geom ON public.infra_boundaries;
CREATE TRIGGER trg_update_infra_boundaries_geom
BEFORE INSERT OR UPDATE ON public.infra_boundaries
FOR EACH ROW EXECUTE FUNCTION public.update_infra_boundaries_geom();


-- 2. ตารางหลักเขตการปกครอง (infra_boundary_markers)
CREATE TABLE IF NOT EXISTS public.infra_boundary_markers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    marker_code VARCHAR(50) UNIQUE NOT NULL,
    marker_type VARCHAR(50) NOT NULL,
    description TEXT,
    village_no VARCHAR(10),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    mgrs VARCHAR(100),
    coord_x DOUBLE PRECISION,
    coord_y DOUBLE PRECISION,
    marker_condition VARCHAR(50) DEFAULT 'perfect',
    image_url TEXT,
    document_url TEXT,
    geom GEOMETRY(Point, 4326),
    geometry_geojson JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- เพิ่มคอลัมน์หากมีตารางอยู่แล้ว
ALTER TABLE public.infra_boundary_markers ADD COLUMN IF NOT EXISTS mgrs VARCHAR(100);
ALTER TABLE public.infra_boundary_markers ADD COLUMN IF NOT EXISTS coord_x DOUBLE PRECISION;
ALTER TABLE public.infra_boundary_markers ADD COLUMN IF NOT EXISTS coord_y DOUBLE PRECISION;
ALTER TABLE public.infra_boundary_markers ADD COLUMN IF NOT EXISTS geometry_geojson JSONB;

CREATE INDEX IF NOT EXISTS infra_boundary_markers_geom_idx ON public.infra_boundary_markers USING GIST(geom);

-- ทริกเกอร์ฟังก์ชันแปลง GeoJSON -> PostGIS Geometry อัตโนมัติ (Point)
CREATE OR REPLACE FUNCTION public.update_infra_boundary_markers_geom()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.geometry_geojson IS NOT NULL THEN
        NEW.geom := ST_SetSRID(ST_GeomFromGeoJSON(NEW.geometry_geojson::text), 4326);
    ELSE
        -- หากไม่มี geometry_geojson แต่มี lat/lng ให้สร้าง Point จาก lat/lng
        IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
            NEW.geom := ST_SetSRID(ST_Point(NEW.longitude, NEW.latitude), 4326);
        ELSE
            NEW.geom := NULL;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_infra_boundary_markers_geom ON public.infra_boundary_markers;
CREATE TRIGGER trg_update_infra_boundary_markers_geom
BEFORE INSERT OR UPDATE ON public.infra_boundary_markers
FOR EACH ROW EXECUTE FUNCTION public.update_infra_boundary_markers_geom();

-- เปิดใช้งาน RLS
ALTER TABLE public.infra_boundaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.infra_boundary_markers ENABLE ROW LEVEL SECURITY;

-- สร้างนโยบายความปลอดภัยหากยังไม่มี
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow select on infra_boundaries') THEN
        CREATE POLICY "Allow select on infra_boundaries" ON public.infra_boundaries FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow insert on infra_boundaries') THEN
        CREATE POLICY "Allow insert on infra_boundaries" ON public.infra_boundaries FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow update on infra_boundaries') THEN
        CREATE POLICY "Allow update on infra_boundaries" ON public.infra_boundaries FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow delete on infra_boundaries') THEN
        CREATE POLICY "Allow delete on infra_boundaries" ON public.infra_boundaries FOR DELETE USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow select on boundary_markers') THEN
        CREATE POLICY "Allow select on infra_boundary_markers" ON public.infra_boundary_markers FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow insert on boundary_markers') THEN
        CREATE POLICY "Allow insert on infra_boundary_markers" ON public.infra_boundary_markers FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow update on boundary_markers') THEN
        CREATE POLICY "Allow update on infra_boundary_markers" ON public.infra_boundary_markers FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow delete on boundary_markers') THEN
        CREATE POLICY "Allow delete on infra_boundary_markers" ON public.infra_boundary_markers FOR DELETE USING (true);
    END IF;
END
$$;
