-- =========================================================================
-- สคริปต์สร้างฐานข้อมูลสำหรับระบบจองห้องประชุมอัจฉริยะ (Smart Meeting Room Reservation)
-- =========================================================================

-- 1. สร้างตารางเก็บห้องประชุมที่มีในเทศบาล (meeting_rooms)
CREATE TABLE IF NOT EXISTS public.meeting_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL UNIQUE, -- ชื่อห้องประชุม เช่น ห้องประชุมปาล์มทอง, ห้องประชุมเพทาย
    capacity INT NOT NULL DEFAULT 10, -- ความจุที่รองรับได้ (คน)
    location VARCHAR(255), -- สถานที่ตั้ง เช่น อาคาร 1 ชั้น 3
    equipment TEXT[] DEFAULT '{}', -- รายการอุปกรณ์ประจำห้องประชุม เช่น ['โปรเจคเตอร์', 'ไมค์สาย', 'เครื่องปรับอากาศ']
    status VARCHAR(50) NOT NULL DEFAULT 'พร้อมใช้งาน', -- พร้อมใช้งาน, ปิดปรับปรุง
    image_url TEXT, -- ลิงก์รูปภาพห้องประชุม
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.meeting_rooms IS 'ข้อมูลสิ่งอำนวยความสะดวกและห้องประชุมทั้งหมด';

-- 2. สร้างตารางจองห้องประชุม (meetings)
CREATE TABLE IF NOT EXISTS public.meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL, -- หัวเรื่องการประชุม
    meeting_date DATE NOT NULL, -- วันที่ประชุม
    start_time TIME NOT NULL DEFAULT '09:00:00', -- เวลาเริ่มประชุม
    end_time TIME NOT NULL DEFAULT '12:00:00', -- เวลาสิ้นสุด
    room_id UUID REFERENCES public.meeting_rooms(id) ON DELETE SET NULL, -- ห้องที่เลือกจอง
    detail TEXT, -- วาระการประชุมหรือรายละเอียดการเข้าพบ
    file_url TEXT, -- เอกสารประกอบการประชุม/ลิงก์แนบ
    attendees TEXT[] DEFAULT '{}', -- รายชื่อผู้เข้าร่วมประชุม หรือหน่วยงาน
    equipment TEXT[] DEFAULT '{}', -- รายการอุปกรณ์เพิ่มเติมที่ขอจอง
    status VARCHAR(50) NOT NULL DEFAULT 'รออนุมัติ', -- รออนุมัติ, อนุมัติแล้ว, ไม่อนุมัติ, เสร็จสิ้น, ยกเลิก
    minutes_text TEXT, -- รายงานมติการประชุมเบื้องต้น (Meeting Minutes)
    minutes_file_url TEXT, -- ลิงก์แนบรายงานผลการประชุมอย่างเป็นทางการ
    created_by VARCHAR(255) NOT NULL DEFAULT 'เจ้าหน้าที่สารบรรณ', -- ผู้จองในระบบ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.meetings IS 'รายการจองห้องประชุมและประวัติการจัดประชุม';

-- 3. เปิดใช้งาน Row Level Security (RLS)
ALTER TABLE public.meeting_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- 4. ตั้งค่านโยบายความปลอดภัย (Policies)
CREATE POLICY "Allow public read on meeting_rooms" ON public.meeting_rooms FOR SELECT USING (true);
CREATE POLICY "Allow write for authenticated on meeting_rooms" ON public.meeting_rooms FOR ALL USING (true);

CREATE POLICY "Allow public read on meetings" ON public.meetings FOR SELECT USING (true);
CREATE POLICY "Allow write for authenticated on meetings" ON public.meetings FOR ALL USING (true);

-- 5. เพิ่มข้อมูลตัวอย่างของห้องประชุมเทศบาล (Initial Seed)
INSERT INTO public.meeting_rooms (name, capacity, location, equipment, image_url) VALUES
('ห้องประชุมพัชรพรรณ', 60, 'อาคารหลัก ชั้น 3', '{"โปรเจคเตอร์ 4K", "ไมค์ประชุมไร้สาย 12 ตัว", "เครื่องเสียงระดับคอนเสิร์ต", "สมาร์ททีวี 85 นิ้ว"}', 'https://images.unsplash.com/photo-1517502884422-41eaaced0168?q=80&w=600&auto=format&fit=crop'),
('ห้องประชุมแก้วมุกดา', 30, 'อาคาร 2 ชั้น 2', '{"สมาร์ทบอร์ดอินเตอร์แอคทีฟ", "กล้องจับความเคลื่อนไหวอัจฉริยะสำหรับประชุมไฮบริด", "ลำโพงบลูทูธ"}', 'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?q=80&w=600&auto=format&fit=crop'),
('ห้องประชุมสำนักปลัด', 12, 'สำนักงานปลัด ชั้น 1', '{"กระดานไวท์บอร์ด", "โปรเจคเตอร์ธรรมดา", "พอร์ต LAN ไฮสปีด"}', 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=600&auto=format&fit=crop')
ON CONFLICT (name) DO NOTHING;
