-- =========================================================================
-- สคริปต์สร้างฐานข้อมูลสำหรับระบบปฏิทินปฏิบัติงานส่วนกลาง (Organization Integrated Calendar)
-- =========================================================================

-- 1. สร้างตารางปฏิทินภารกิจและกิจกรรม (org_calendar_events)
CREATE TABLE IF NOT EXISTS public.org_calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL, -- ชื่อกิจกรรม/การจอง
    description TEXT, -- วาระ/คำชี้แจงย่อ
    start_date TIMESTAMP WITH TIME ZONE NOT NULL, -- เริ่มต้น (วันและเวลา)
    end_date TIMESTAMP WITH TIME ZONE NOT NULL, -- สิ้นสุด (วันและเวลา)
    event_type VARCHAR(100) NOT NULL DEFAULT 'กิจกรรมองค์กร', -- ประชุม, วันลา, ภารกิจภาคสนาม, วันหยุดราชการ, กิจกรรมองค์กร
    source_id UUID, -- เชื่อมกลับไปยัง ID ต้นทาง เช่น meetings.id, staff_leaves.id, vehicle_requests.id
    source_table VARCHAR(100), -- ตารางต้นทาง เช่น 'meetings', 'staff_leaves', 'vehicle_requests'
    color_hex VARCHAR(10) NOT NULL DEFAULT '#3b82f6', -- สีแสดงผลบนปฏิทิน
    responsible_officer VARCHAR(255), -- ผู้รับผิดชอบหลัก
    is_public BOOLEAN NOT NULL DEFAULT TRUE, -- แสดงแก่บุคคลภายนอก/ประชาชนได้หรือไม่
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.org_calendar_events IS 'ข้อมูลปฏิทินรวมเพื่อใช้ดึงแสดงกิจกรรมและการจองทรัพยากรทุกตัวในหน้าต่างเดียว';

-- 2. เปิดใช้งาน Row Level Security (RLS)
ALTER TABLE public.org_calendar_events ENABLE ROW LEVEL SECURITY;

-- 3. นโยบาย (Policies)
CREATE POLICY "Allow public select for calendar" ON public.org_calendar_events FOR SELECT USING (true);
CREATE POLICY "Allow write for authenticated on calendar" ON public.org_calendar_events FOR ALL USING (true);
