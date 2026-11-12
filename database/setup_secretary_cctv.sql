-- =========================================================================
-- สคริปต์สร้างฐานข้อมูลสำหรับระบบทะเบียนและการเฝ้าระวังกล้องวงจรปิด (Smart CCTV Registry & GIS)
-- =========================================================================

-- 1. สร้างตารางกล้องวงจรปิด (cctv_registry)
CREATE TABLE IF NOT EXISTS public.cctv_registry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE, -- ชื่อกล้อง เช่น CCTV ทางแยกตลาดสดกล้อง 1
    location_name VARCHAR(255) NOT NULL, -- สถานที่ตั้งทางภูมิศาสตร์ เช่น บริเวณหน้าตลาดสดเทศบาล
    latitude DECIMAL(10, 8) NOT NULL, -- พิกัด GIS ละติจูด
    longitude DECIMAL(11, 8) NOT NULL, -- พิกัด GIS ลองจิจูด
    ip_address VARCHAR(50), -- หมายเลข IP กล้องภายในเครือข่าย VPN
    stream_url TEXT, -- ลิงก์ RTSP/HLS เพื่อเรียกดูภาพสด
    department VARCHAR(100) DEFAULT 'สำนักปลัด', -- กองที่ดูแล
    status VARCHAR(50) NOT NULL DEFAULT 'Online', -- Online, Offline, Maintenance
    responsible_officer VARCHAR(255), -- ผู้รับผิดชอบดูแลกล้อง
    maintenance_history JSONB DEFAULT '[]'::jsonb, -- ประวัติการตรวจซ่อมและบำรุง
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.cctv_registry IS 'ข้อมูลทะเบียนกล้องวงจรปิดพร้อมพิกัดตำแหน่งภูมิศาสตร์ GIS สำหรับงานป้องกันและบรรเทาสาธารณภัย';

-- 2. เปิดใช้งาน Row Level Security (RLS)
ALTER TABLE public.cctv_registry ENABLE ROW LEVEL SECURITY;

-- 3. ตั้งค่านโยบาย (Policies)
CREATE POLICY "Allow public select for cctv" ON public.cctv_registry FOR SELECT USING (true);
CREATE POLICY "Allow write for authenticated on cctv" ON public.cctv_registry FOR ALL USING (true);

-- 4. เพิ่มข้อมูลตัวอย่างกล้อง CCTV
INSERT INTO public.cctv_registry (name, location_name, latitude, longitude, ip_address, stream_url, status, responsible_officer) VALUES
('กล้องแยกตลาดเทศบาล 01', 'หน้าประตูตลาดสดเทศบาล', 13.736000, 100.523000, '192.168.10.201', 'https://demo.unified-streaming.com/kaltura/cast/hevc/master.m3u8', 'Online', 'นายประพันธ์ กล้องส่อง'),
('กล้องหน้าสำนักงานเทศบาล 02', 'หน้าเสาธงอาคารหลัก', 13.737500, 100.524200, '192.168.10.202', 'https://demo.unified-streaming.com/kaltura/cast/hevc/master.m3u8', 'Online', 'นายประพันธ์ กล้องส่อง'),
('กล้องสามแยกโรงเรียนเทศบาล 03', 'หน้าสามแยกโรงเรียนเทศบาลวัดมหาธาตุ', 13.735100, 100.521800, '192.168.10.203', 'https://demo.unified-streaming.com/kaltura/cast/hevc/master.m3u8', 'Offline', 'นายสุทิน เลนส์ใส')
ON CONFLICT (name) DO NOTHING;
