-- database/setup_qgis_connector.sql
-- คำสั่งสร้างตาราง และ ฟังก์ชันรองรับการทำงานร่วมกันระหว่างโปรแกรม QGIS และ Supabase (PostGIS Live Sync)

CREATE TABLE IF NOT EXISTS public.infra_qgis_sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(150) NOT NULL, -- ชื่อตารางที่มีการซิงก์ข้อมูล (เช่น infra_roads)
    action_type VARCHAR(50) NOT NULL, -- ประเภทเหตุการณ์ (INSERT, UPDATE, DELETE)
    record_id UUID NOT NULL, -- UUID ของฟิลด์ที่ถูกเปลี่ยนแปลง
    performed_by VARCHAR(150) DEFAULT 'QGIS Desktop User', -- ผู้แก้ไข
    sync_status VARCHAR(50) DEFAULT 'synced', -- สถานะการประสานข้อมูล
    client_ip VARCHAR(50), -- IP เครื่องคอมพิวเตอร์ผู้เชื่อมต่อ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Trigger ฟังก์ชันสำหรับบันทึกประวัติการเปลี่ยนสัญวิทยาแผนที่ผ่าน QGIS แบบอัตโนมัติ
CREATE OR REPLACE FUNCTION log_qgis_sync_change()
RETURNS TRIGGER AS $$
DECLARE
    rec_id UUID;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        rec_id := OLD.id;
    ELSE
        rec_id := NEW.id;
    END IF;
    
    INSERT INTO public.infra_qgis_sync_logs (table_name, action_type, record_id, performed_by)
    VALUES (TG_TABLE_NAME, TG_OP, rec_id, 'QGIS Live Sync');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- เชื่อม Trigger อัตโนมัติกับการเพิ่มลบแก้ไขบนถนน
DROP TRIGGER IF EXISTS trg_log_qgis_sync_roads ON public.infra_roads;
CREATE TRIGGER trg_log_qgis_sync_roads
AFTER INSERT OR UPDATE OR DELETE ON public.infra_roads
FOR EACH ROW EXECUTE FUNCTION log_qgis_sync_change();

COMMENT ON TABLE public.infra_qgis_sync_logs IS 'ตารางบันทึกประวัติความเคลื่อนไหวการซิงก์พิกัด GIS จากโปรแกรม QGIS desktop';

-- RLS
ALTER TABLE public.infra_qgis_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select on qgis_sync_logs" ON public.infra_qgis_sync_logs FOR SELECT USING (true);
CREATE POLICY "Allow insert on qgis_sync_logs" ON public.infra_qgis_sync_logs FOR INSERT WITH CHECK (true);
