-- =========================================================================
-- สคริปต์สร้างฐานข้อมูลสำหรับบันทึกทะเบียนใบหน้าและการลงทะเบียนใบหน้าบุคลากร (Face Attendance Enrollment)
-- =========================================================================

-- 1. สร้างตารางสำหรับเก็บค่า Vector ลายนิ้วใบหน้า (staff_face_registrations)
CREATE TABLE IF NOT EXISTS public.staff_face_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id TEXT NOT NULL, -- ลิงก์กับ ID ของตาราง Staff (ซึ่งเก็บแบบ TEXT หรือ UUID)
    face_descriptor DECIMAL[] NOT NULL, -- อาเรย์จัดเก็บพิกัดใบหน้า 128 จุด (Facial Vector Matrix) สำหรับตรวจใบหน้าเทียบค่า
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    enrollment_photo_url TEXT, -- รูปถ่ายยืนยันตัวตนตอนลงทะเบียนครั้งแรก
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.staff_face_registrations IS 'ตารางจัดเก็บเวกเตอร์จุดใบหน้า (Face Embeddings) เพื่อวิเคราะห์เปรียบเทียบในระบบเช็คชื่อใบหน้า';

-- 2. เปิดใช้งาน Row Level Security (RLS)
ALTER TABLE public.staff_face_registrations ENABLE ROW LEVEL SECURITY;

-- 3. ตั้งค่านโยบาย (Policies)
CREATE POLICY "Allow public select for face registrations" ON public.staff_face_registrations FOR SELECT USING (true);
CREATE POLICY "Allow write access for authenticated on face registrations" ON public.staff_face_registrations FOR ALL USING (true);
