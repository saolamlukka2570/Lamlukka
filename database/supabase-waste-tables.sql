-- ==========================================
-- DDL for GOOD GOV Waste Fee System
-- ==========================================

-- 1. สร้างตารางประเภทค่าธรรมเนียม (waste_fee_types)
CREATE TABLE IF NOT EXISTS public.waste_fee_types (
    id text PRIMARY KEY,
    type text NOT NULL,
    fee numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- เพิ่มข้อมูลเริ่มต้น (Mock Data)
INSERT INTO public.waste_fee_types (id, type, fee)
VALUES
    ('FT01', 'บ้านพัก', 40),
    ('FT02', 'ร้านค้า', 120),
    ('FT03', 'อาคาร', 300),
    ('FT04', 'โรงงาน', 2500)
ON CONFLICT (id) DO NOTHING;


-- 2. สร้างตารางทะเบียนลูกค้าขยะ (waste_customers)
CREATE TABLE IF NOT EXISTS public.waste_customers (
    id text PRIMARY KEY,
    house_no text NOT NULL,
    moo text NOT NULL,
    name text NOT NULL,
    id_card text,
    phone text,
    type text NOT NULL,
    fee numeric NOT NULL,
    start_date date,
    status text DEFAULT 'active',
    lat numeric,
    lng numeric,
    note text,
    created_at timestamp with time zone DEFAULT now()
);

-- เพิ่มข้อมูลเริ่มต้นบางส่วนเพื่อการทดสอบ (Mock Data 10 รายการแรก)
INSERT INTO public.waste_customers (id, house_no, moo, name, id_card, phone, type, fee, start_date, status, lat, lng, note)
VALUES
    ('WC001', '12/1', '1', 'นายสมควร ขยัน', '1100700123456', '081-234-5601', 'บ้านพัก', 40, '2023-10-01', 'active', 14.8820, 102.0150, ''),
    ('WC002', '12/2', '1', 'นางสมหญิง รักสะอาด', '1100700123457', '081-234-5602', 'ร้านค้า', 120, '2023-10-01', 'active', 14.8825, 102.0155, ''),
    ('WC003', '15/5', '2', 'บจก. เจริญพาณิชย์', '0105549000001', '044-256-789', 'โรงงาน', 2500, '2023-10-01', 'active', 14.8830, 102.0160, 'โรงงานผลิตน้ำดื่ม'),
    ('WC004', '33/1', '3', 'นางประนอม ใจบุญ', '1100700123458', '081-234-5604', 'บ้านพัก', 40, '2023-10-01', 'active', 14.8835, 102.0165, ''),
    ('WC005', '45/2', '1', 'นายชัยวัฒน์ มั่นคง', '1100700123459', '081-234-5605', 'บ้านพัก', 40, '2023-10-01', 'active', 14.8840, 102.0170, ''),
    ('WC006', '50/1', '2', 'นางวิไลวรรณ งามตา', '1100700123460', '081-234-5606', 'บ้านพัก', 40, '2024-01-01', 'active', 14.8845, 102.0175, ''),
    ('WC007', '55/3', '1', 'นายชูชาติ มั่งมี', '1100700123461', '081-234-5607', 'ร้านค้า', 150, '2023-10-01', 'active', 14.8850, 102.0180, 'ร้านชำ'),
    ('WC008', '60/1', '3', 'นายสมพงษ์ ยินดี', '1100700123462', '081-234-5608', 'บ้านพัก', 40, '2023-10-01', 'active', 14.8855, 102.0185, ''),
    ('WC009', '62/4', '2', 'นางสุภาพร ดีใจ', '1100700123463', '081-234-5609', 'บ้านพัก', 40, '2023-10-01', 'active', 14.8860, 102.0190, ''),
    ('WC010', '70/2', '1', 'นายวิชัย เก่งกล้า', '1100700123464', '081-234-5610', 'อาคาร', 300, '2023-10-01', 'active', 14.8865, 102.0195, 'อาคารพาณิชย์')
ON CONFLICT (id) DO NOTHING;

-- ตั้งค่าความปลอดภัยเบื้องต้น (Allow all for development)
ALTER TABLE public.waste_fee_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all actions for public" ON public.waste_fee_types FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.waste_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all actions for public" ON public.waste_customers FOR ALL USING (true) WITH CHECK (true);
