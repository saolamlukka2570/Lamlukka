-- database/setup_infrastructure_lighting.sql
-- สคริปต์เชื่อมโยงและบริหารจัดการสารสนเทศไฟส่องสว่าง (infra_lighting_poles) ร่วมกับตารางเดิม
-- ช่วยประสานตาราง electric_poles และ electric_repairs ให้ใช้งานร่วมกับระบบ DIIS ได้อย่างราบรื่น

CREATE EXTENSION IF NOT EXISTS postgis;

-- สร้าง VIEW สำหรับดึงสถิติและข้อมูลรวมของไฟฟ้าสาธารณะเชิงพื้นที่ไปใช้งานกับ Master GIS
CREATE OR REPLACE VIEW public.v_infra_lighting_gis AS
SELECT 
    id,
    pole_code AS asset_id,
    'ไฟฟ้าส่องสว่าง'::varchar AS asset_type,
    pole_type AS subtype,
    light_type AS detail,
    lat AS latitude,
    lng AS longitude,
    village_no,
    status,
    -- แปลง lat, lng สดเป็น geometry POINT EPSG:4326 เพื่อรองรับ GIS Spatial mapping
    ST_SetSRID(ST_MakePoint(lng, lat), 4326) AS geom,
    image_url,
    created_at
FROM public.electric_poles;

-- สร้างฟังก์ชันการสืบค้นข้อมูลไฟฟ้าส่องสว่างในรัศมีวงกลมเชิงพื้นที่ (Spatial Radial Query)
CREATE OR REPLACE FUNCTION public.get_lighting_poles_in_radius(
    center_lng DOUBLE PRECISION,
    center_lat DOUBLE PRECISION,
    radius_meters DOUBLE PRECISION
)
RETURNS TABLE (
    id UUID,
    pole_code VARCHAR,
    pole_type VARCHAR,
    light_type VARCHAR,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    status VARCHAR,
    distance_m DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ep.id,
        ep.pole_code,
        ep.pole_type,
        ep.light_type,
        ep.lat,
        ep.lng,
        ep.status,
        ST_Distance(
            ST_Transform(ST_SetSRID(ST_MakePoint(ep.lng, ep.lat), 4326), 3857),
            ST_Transform(ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326), 3857)
        ) AS distance_m
    FROM public.electric_poles ep
    WHERE ST_DWithin(
        ST_Transform(ST_SetSRID(ST_MakePoint(ep.lng, ep.lat), 4326), 3857),
        ST_Transform(ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326), 3857),
        radius_meters
    )
    ORDER BY distance_m;
END;
$$ LANGUAGE plpgsql;

COMMENT ON VIEW public.v_infra_lighting_gis IS 'มุมมองสืบค้นข้อมูลเชิงพื้นที่ของเสาไฟฟ้าส่องสว่างเดิมประสานระบบ GIS';
