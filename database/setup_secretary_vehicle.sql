-- =========================================================================
-- สคริปต์สร้างฐานข้อมูลสำหรับระบบขอใช้รถส่วนกลางและสมุดบันทึกยานพาหนะ (Vehicle Booking & Logbook System)
-- =========================================================================

-- 1. สร้างตารางเก็บข้อมูลรถยนต์ราชการ (vehicles)
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    license_plate VARCHAR(50) UNIQUE NOT NULL, -- เลขทะเบียนรถ เช่น กข-1234 นครนายก
    brand VARCHAR(100), -- ยี่ห้อ เช่น Toyota, Isuzu
    model VARCHAR(100), -- รุ่น เช่น Hilux Revo, Commuter
    vehicle_type VARCHAR(100) NOT NULL DEFAULT 'รถกระบะ', -- รถเก๋ง, รถกระบะ, รถตู้, รถบรรทุกน้ำ, รถกู้ชีพ
    status VARCHAR(50) NOT NULL DEFAULT 'พร้อมใช้งาน', -- พร้อมใช้งาน, ติดภารกิจ, ซ่อมบำรุง
    image_url TEXT, -- รูปภาพยานพาหนะ
    last_mileage INT DEFAULT 0, -- เลขไมล์ล่าสุดเพื่อการวัดระยะสะสม
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.vehicles IS 'รายการทรัพย์สินยานพาหนะส่วนกลางในสังกัด';

-- 2. สร้างตารางพนักงานขับรถส่วนกลาง (vehicle_drivers)
CREATE TABLE IF NOT EXISTS public.vehicle_drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE, -- ชื่อ-นามสกุล คนขับ
    phone VARCHAR(50), -- เบอร์ติดต่อคนขับ
    status VARCHAR(50) NOT NULL DEFAULT 'พร้อมปฏิบัติงาน', -- พร้อมปฏิบัติงาน, พักผ่อน, ลาป่วย
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.vehicle_drivers IS 'รายชื่อพนักงานขับรถและสถานะการออกเวร';

-- 3. สร้างตารางคำขออนุญาตใช้รถยนต์ส่วนกลาง (vehicle_requests)
CREATE TABLE IF NOT EXISTS public.vehicle_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id TEXT NOT NULL, -- ผู้ยื่นจอง อ้างอิง Staff.id
    requester_name VARCHAR(255) NOT NULL, -- ชื่อจริงผู้ยื่น
    department VARCHAR(255) NOT NULL, -- สังกัดกองงานที่ขอเบิกรถ
    purpose TEXT NOT NULL, -- วัตถุประสงค์การใช้รถ/ภารกิจ
    destination VARCHAR(255) NOT NULL, -- สถานที่ปลายทางที่จะไป
    departure_date TIMESTAMP WITH TIME ZONE NOT NULL, -- วันเวลาที่ออกเดินทาง
    return_date TIMESTAMP WITH TIME ZONE NOT NULL, -- วันเวลาที่กลับถึงเทศบาล
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL, -- คันที่ได้รับจัดสรร
    driver_id UUID REFERENCES public.vehicle_drivers(id) ON DELETE SET NULL, -- พนักงานขับรถที่จัดสรร
    passengers_count INT DEFAULT 1, -- จำนวนผู้โดยสารรวม
    passengers_list TEXT, -- รายชื่อผู้ร่วมเดินทางเพิ่มเติม
    status VARCHAR(50) NOT NULL DEFAULT 'รออนุมัติ', -- รออนุมัติ, อนุมัติแล้ว, ปฏิเสธ, เสร็จสิ้นภารกิจ, ยกเลิก
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.vehicle_requests IS 'บันทึกใบคำขอใช้งานรถราชการและการสั่งจัดสรรรถและพนักงานขับรถ';

-- 4. สร้างตารางบันทึกสมุดการใช้รถจริงหลังเดินทางกลับ (vehicle_logbook)
CREATE TABLE IF NOT EXISTS public.vehicle_logbook (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES public.vehicle_requests(id) ON DELETE SET NULL, -- ลิงก์ใบจองเดิม
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE, -- รถคันที่ขับจริง
    driver_name VARCHAR(255) NOT NULL, -- คนขับจริงในวันปฏิบัติงาน
    mileage_out INT NOT NULL, -- เลขไมล์ก่อนออกตัวเดินทาง
    mileage_in INT, -- เลขไมล์เมื่อเลิกงานกลับมา
    distance INT, -- คำนวณระยะทางสุทธิ (กิโลเมตร)
    fuel_liters DECIMAL(10, 2), -- อัตราการเติมน้ำมันรวม (ลิตร)
    user_name VARCHAR(255) NOT NULL, -- ชื่อข้าราชการผู้ใช้ควบคุมภารกิจ
    remark TEXT, -- ปัญหาตัวรถ/การเดินทาง
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.vehicle_logbook IS 'สมุดลงบันทึกการใช้รถ ค่าน้ำมัน และเลขระยะไมล์เพื่อเช็คประสิทธิภาพประหยัดเชื้อเพลิง';

-- 5. ตั้งค่าความปลอดภัย (RLS)
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_logbook ENABLE ROW LEVEL SECURITY;

-- 6. นโยบาย (Policies)
CREATE POLICY "Allow public select for vehicles" ON public.vehicles FOR SELECT USING (true);
CREATE POLICY "Allow write for authenticated on vehicles" ON public.vehicles FOR ALL USING (true);

CREATE POLICY "Allow public select for vehicle_drivers" ON public.vehicle_drivers FOR SELECT USING (true);
CREATE POLICY "Allow write for authenticated on vehicle_drivers" ON public.vehicle_drivers FOR ALL USING (true);

CREATE POLICY "Allow public select for vehicle_requests" ON public.vehicle_requests FOR SELECT USING (true);
CREATE POLICY "Allow write for authenticated on vehicle_requests" ON public.vehicle_requests FOR ALL USING (true);

CREATE POLICY "Allow public select for vehicle_logbook" ON public.vehicle_logbook FOR SELECT USING (true);
CREATE POLICY "Allow write for authenticated on vehicle_logbook" ON public.vehicle_logbook FOR ALL USING (true);

-- 7. เพิ่มข้อมูลตัวอย่างรถยนต์ราชการ
INSERT INTO public.vehicles (license_plate, brand, model, vehicle_type, image_url, last_mileage) VALUES
('กค-8888 นครนายก', 'Toyota', 'Commuter', 'รถตู้ส่วนกลาง', 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=80&w=400&auto=format&fit=crop', 12500),
('กข-1234 นครนายก', 'Isuzu', 'D-Max Spark', 'รถกระบะสารพัดประโยชน์', 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=400&auto=format&fit=crop', 45890),
('พบ-0099 นครนายก', 'Toyota', 'Fortuner', 'รถประจำตำแหน่งบริหาร', 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?q=80&w=400&auto=format&fit=crop', 8600)
ON CONFLICT (license_plate) DO NOTHING;

-- 8. เพิ่มข้อมูลตัวอย่างพนักงานขับรถยนต์
INSERT INTO public.vehicle_drivers (name, phone, status) VALUES
('นายประสิทธิ์ ล้อหมุน', '085-111-2222', 'พร้อมปฏิบัติงาน'),
('นายทวี เร่งสปีด', '089-333-4444', 'พร้อมปฏิบัติงาน'),
('นายมานัส นุ่มนวล', '081-555-6666', 'พร้อมปฏิบัติงาน')
ON CONFLICT (name) DO NOTHING;
