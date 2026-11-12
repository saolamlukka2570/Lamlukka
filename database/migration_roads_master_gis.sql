-- database/migration_roads_master_gis.sql
-- คำสั่งโยกย้ายข้อมูลจากตารางเดิม infra_roads หรือเติมข้อมูลเริ่มต้นเข้าสู่ตาราง Master GIS ตารางใหม่

-- 1. ย้ายข้อมูลจากตารางเก่าไปยังตารางใหม่ถ้ามีข้อมูลและหลีกเลี่ยงเรคคอร์ดชนกัน
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'infra_roads'
    ) THEN
        INSERT INTO public.digital_infrastructure_roads (
            id,
            road_code,
            road_name,
            road_type,
            road_width,
            road_length,
            village_no,
            construction_year,
            road_status,
            start_latitude,
            start_longitude,
            created_at,
            updated_at,
            geometry_geojson,
            geom,
            road_cl,
            surface_type,
            budget_source,
            budget_amount,
            plan_year
        )
        SELECT 
            id,
            COALESCE(road_id, 'SS' || SUBSTRING(id::text, 1, 6)) as road_code,
            road_name,
            road_type,
            width as road_width,
            length_m as road_length,
            CASE 
                WHEN village_no ~ '^[0-9]+$' THEN CAST(village_no AS INTEGER)
                ELSE 1
            END as village_no,
            construction_year,
            status as road_status,
            latitude as start_latitude,
            longitude as start_longitude,
            created_at,
            updated_at,
            CASE 
                WHEN geom IS NOT NULL THEN ST_AsGeoJSON(geom)::jsonb
                ELSE NULL
            END as geometry_geojson,
            geom,
            road_cl,
            surface_type,
            budget_source,
            CASE 
                WHEN road_type = 'ถนนในแผนพัฒนา' THEN 1000000
                ELSE NULL
            END as budget_amount,
            CASE 
                WHEN road_type = 'ถนนในแผนพัฒนา' THEN 2569
                ELSE NULL
            END as plan_year
        FROM public.infra_roads
        ON CONFLICT (road_code) DO NOTHING;
    END IF;
END $$;

-- 2. เติมข้อมูลจำลองเริ่มต้นในกรณีที่ไม่มีข้อมูลในตารางเลย (เพื่อรักษาการจัดหน้าของ UI)
INSERT INTO public.digital_infrastructure_roads (
    id, road_code, road_name, road_type, road_width, road_length, village_no, 
    construction_year, road_status, start_latitude, start_longitude, 
    road_cl, surface_type, budget_source, budget_amount, plan_year, geometry_geojson
) VALUES 
(
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'SS1001',
    'ถนนบูรพาพัฒนา',
    'ถนนขึ้นทะเบียนทางหลวง',
    6.0,
    1250.0,
    2,
    2562,
    'good',
    17.978,
    103.475,
    'ทางหลวงท้องถิ่นชั้น 3',
    'คอนกรีตเสริมเหล็ก',
    'งบอุดหนุนเฉพาะกิจ',
    NULL,
    NULL,
    '{"type": "LineString", "coordinates": [[103.475, 17.978], [103.477, 17.979], [103.479, 17.977]]}'::jsonb
),
(
    'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
    'SS1002',
    'ซอยสุขใจ 4',
    'ถนนภายในตำบล',
    4.0,
    450.0,
    3,
    2565,
    'fair',
    17.973,
    103.468,
    'ทางหลวงท้องถิ่นชั้น 4',
    'แอสฟัลต์ติก/ลาดยาง',
    'เทศบัญญัติงบประมาณ',
    NULL,
    NULL,
    '{"type": "LineString", "coordinates": [[103.468, 17.973], [103.469, 17.971], [103.471, 17.972]]}'::jsonb
),
(
    'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f',
    'SS1003',
    'ถนนนาดี-โคกเจริญ',
    'ถนนในแผนพัฒนา',
    5.0,
    2300.0,
    5,
    NULL,
    'poor',
    17.985,
    103.480,
    'ทางหลวงท้องถิ่นชั้น 4',
    'หินคลุก/ลูกรัง',
    'งบพัฒนาจังหวัด',
    1500000,
    2569,
    '{"type": "LineString", "coordinates": [[103.480, 17.985], [103.482, 17.983], [103.484, 17.984]]}'::jsonb
)
ON CONFLICT (road_code) DO NOTHING;
