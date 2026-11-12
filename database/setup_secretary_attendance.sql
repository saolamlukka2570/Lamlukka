-- =========================================================================
-- สคริปต์สร้างฐานข้อมูลสำหรับระบบบันทึกเวลาทำงานด้วยใบหน้า (Face Attendance logs)
-- =========================================================================

-- 1. สร้างตารางบันทึกการเข้า-ออกงานประจำวัน (staff_attendance)
CREATE TABLE IF NOT EXISTS public.staff_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id TEXT NOT NULL, -- อ้างอิงตาราง Staff.id
    staff_name VARCHAR(255) NOT NULL, -- ชื่อจริง-นามสกุล สะดวกในการแสดงผล
    date DATE NOT NULL DEFAULT CURRENT_DATE, -- วันที่บันทึก
    check_in TIMESTAMP WITH TIME ZONE, -- เวลาเข้างานจริง
    check_out TIMESTAMP WITH TIME ZONE, -- เวลาออกงานจริง
    check_in_photo_url TEXT, -- ลิงก์รูปถ่ายยืนยันตอนสแกนเข้า
    check_out_photo_url TEXT, -- ลิงก์รูปถ่ายยืนยันตอนสแกนออก
    status VARCHAR(50) NOT NULL DEFAULT 'ปกติ', -- ปกติ, สาย, ขาด, ลา
    late_minutes INT DEFAULT 0, -- จำนวนนาทีที่สาย เกินจากเวลา 08:30 น.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ป้องกันข้อมูลวันละหนึ่งเรคคอร์ดต่อบุคลากร
CREATE UNIQUE INDEX IF NOT EXISTS uidx_staff_date ON public.staff_attendance(staff_id, date);

COMMENT ON TABLE public.staff_attendance IS 'บันทึกเวลาเช็คอินและเช็คเอาท์ประจำวันของบุคลากร';

-- 2. เปิดใช้งาน Row Level Security (RLS)
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;

-- 3. ตั้งค่านโยบายความปลอดภัย
CREATE POLICY "Allow public read on staff_attendance" ON public.staff_attendance FOR SELECT USING (true);
CREATE POLICY "Allow write for authenticated on staff_attendance" ON public.staff_attendance FOR ALL USING (true);
