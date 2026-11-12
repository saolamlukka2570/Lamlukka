-- database/setup_shapefile_upload.sql
-- คำสั่งสร้างตาราง บันทึกผลการจัดทำและนำเข้าข้อมูลภูมิสารสนเทศ (infra_gis_uploads)

CREATE TABLE IF NOT EXISTS public.infra_gis_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(250) NOT NULL, -- ชื่อไฟล์ที่อัปโหลด
    file_type VARCHAR(50) NOT NULL, -- ประเภทไฟล์ (.shp, .geojson, .kml, .zip)
    layer_name VARCHAR(150), -- ชื่อเลเยอร์เป้าหมาย
    crs VARCHAR(50) DEFAULT 'EPSG:4326', -- ระบบพิกัดแผนที่ที่ตรวจจับได้
    geom_type VARCHAR(50), -- รูปแบบพิกัด (Point, LineString, Polygon)
    features_count INTEGER DEFAULT 0, -- จำนวนฟีเจอร์ที่บันทึก
    mapped_fields JSONB, -- แผนภาพจำลองการจับคู่แอตทริบิวต์ (Attribute Mapping JSON)
    status VARCHAR(50) DEFAULT 'success', -- สถานะการนำเข้า (success, validating, error)
    file_url TEXT, -- ลิงก์ URL ของไฟล์ที่อัปโหลดบน Supabase Storage
    error_log TEXT, -- บันทึกความผิดพลาด (ถ้ามี)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.infra_gis_uploads IS 'ตารางบันทึกประวัติการนำเข้าไฟล์แผนที่ภูมิสารสนเทศเชิงแอตทริบิวต์พร้อมลิงก์ดาวน์โหลด';

-- RLS
ALTER TABLE public.infra_gis_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select on gis_uploads" ON public.infra_gis_uploads FOR SELECT USING (true);
CREATE POLICY "Allow insert on gis_uploads" ON public.infra_gis_uploads FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on gis_uploads" ON public.infra_gis_uploads FOR UPDATE USING (true);
CREATE POLICY "Allow delete on gis_uploads" ON public.infra_gis_uploads FOR DELETE USING (true);
