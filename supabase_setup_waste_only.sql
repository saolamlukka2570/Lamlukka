-- ==========================================
-- SQL SETUP FOR WASTE PAYMENT SYSTEM ONLY
-- ==========================================

-- ==========================================
-- SOURCE: supabase-waste-tables.sql
-- ==========================================

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


-- ==========================================
-- SOURCE: supabase-waste-register.sql
-- ==========================================

-- Create the waste_register_requests table
CREATE TABLE IF NOT EXISTS public.waste_register_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    house_no VARCHAR(100) NOT NULL,
    moo VARCHAR(50),
    type VARCHAR(255),
    phone VARCHAR(50),
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    image_url TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    note TEXT,
    line_user_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_waste_register_requests_status ON public.waste_register_requests(status);
CREATE INDEX IF NOT EXISTS idx_waste_register_requests_created_at ON public.waste_register_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_waste_register_requests_line_user_id ON public.waste_register_requests(line_user_id);

-- Set up Row Level Security (RLS)
ALTER TABLE public.waste_register_requests ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access
CREATE POLICY "Allow anonymous read access" ON public.waste_register_requests
    FOR SELECT USING (true);

-- Allow anonymous insert access
CREATE POLICY "Allow anonymous insert access" ON public.waste_register_requests
    FOR INSERT WITH CHECK (true);

-- Allow anonymous update access (e.g., to update status)
CREATE POLICY "Allow anonymous update access" ON public.waste_register_requests
    FOR UPDATE USING (true);


-- ==========================================
-- SOURCE: supabase-waste-payments.sql
-- ==========================================

-- ==========================================
-- DDL for Waste Payment System (Supabase)
-- Smart Connect Municipality Platform
-- ==========================================

-- 1. ตารางบันทึกการรับชำระเงินค่าขยะ (waste_payments)
CREATE TABLE IF NOT EXISTS public.waste_payments (
    id text PRIMARY KEY,
    receipt_no text UNIQUE,
    customer_id text REFERENCES public.waste_customers(id),
    customer_name text NOT NULL,
    house_no text,
    amount numeric NOT NULL DEFAULT 0,
    months_paid text[] DEFAULT '{}',
    fiscal_year text,
    method text DEFAULT 'เงินสด',
    date date DEFAULT CURRENT_DATE,
    time text,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
    staff text,
    source text DEFAULT 'walk-in' CHECK (source IN ('walk-in', 'citizen-portal')),
    reject_reason text,
    created_at timestamp with time zone DEFAULT now()
);

-- Index สำหรับค้นหาเร็วขึ้น
CREATE INDEX IF NOT EXISTS idx_waste_payments_customer ON public.waste_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_waste_payments_date ON public.waste_payments(date DESC);
CREATE INDEX IF NOT EXISTS idx_waste_payments_status ON public.waste_payments(status);
CREATE INDEX IF NOT EXISTS idx_waste_payments_fiscal_year ON public.waste_payments(fiscal_year);

-- 2. ตารางสถานะรายเดือน (waste_monthly_status)
CREATE TABLE IF NOT EXISTS public.waste_monthly_status (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id text NOT NULL REFERENCES public.waste_customers(id) ON DELETE CASCADE,
    fiscal_year text NOT NULL,
    month_key text NOT NULL CHECK (month_key IN ('oct','nov','dec','jan','feb','mar','apr','may','jun','jul','aug','sep')),
    status text DEFAULT 'unpaid' CHECK (status IN ('paid', 'unpaid', 'pending')),
    payment_id text REFERENCES public.waste_payments(id),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(customer_id, fiscal_year, month_key)
);

-- Index สำหรับค้นหาเร็วขึ้น
CREATE INDEX IF NOT EXISTS idx_wms_customer ON public.waste_monthly_status(customer_id);
CREATE INDEX IF NOT EXISTS idx_wms_fiscal_year ON public.waste_monthly_status(fiscal_year);

-- 3. ตารางเจ้าหน้าที่ขยะ (waste_staff)
CREATE TABLE IF NOT EXISTS public.waste_staff (
    id text PRIMARY KEY,
    name text NOT NULL,
    position text,
    username text,
    role text DEFAULT 'Collector',
    phone text,
    status text DEFAULT 'active',
    created_at timestamp with time zone DEFAULT now()
);

-- เพิ่มข้อมูลเจ้าหน้าที่เริ่มต้น
INSERT INTO public.waste_staff (id, name, position, username, role, phone, status)
VALUES
    ('WS001', 'นายอำนวย การเงิน', 'หัวหน้างานจัดเก็บรายได้', 'amnuay', 'Admin', '081-999-0001', 'active'),
    ('WS002', 'นางสาวพรทิพย์ รักษ์เงิน', 'นักวิชาการเงินและบัญชี', 'porntip', 'Finance Officer', '081-999-0002', 'active'),
    ('WS003', 'นายสุริยา เที่ยงธรรม', 'เจ้าพนักงานจัดเก็บรายได้', 'suriya', 'Collector', '081-999-0003', 'active'),
    ('WS004', 'นางสาวนันทนา ยิ้มแย้ม', 'เจ้าพนักงานจัดเก็บรายได้', 'nantana', 'Collector', '081-999-0004', 'active'),
    ('WS005', 'นายประเสริฐ มุ่งมั่น', 'พนักงานจ้าง', 'prasert', 'Collector', '081-999-0005', 'inactive')
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- RLS Policies (Allow all for development)
-- ==========================================
ALTER TABLE public.waste_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all actions for waste_payments" ON public.waste_payments FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.waste_monthly_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all actions for waste_monthly_status" ON public.waste_monthly_status FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.waste_staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all actions for waste_staff" ON public.waste_staff FOR ALL USING (true) WITH CHECK (true);

 - -   4 .   2#28###!
3#0@4"0--D%L  ( g a r b a g e _ p a y m e n t _ t r a n s a c t i o n s ) 
 C R E A T E   T A B L E   I F   N O T   E X I S T S   p u b l i c . g a r b a g e _ p a y m e n t _ t r a n s a c t i o n s   ( 
         i d   u u i d   P R I M A R Y   K E Y   D E F A U L T   g e n _ r a n d o m _ u u i d ( ) , 
         f i s c a l _ y e a r   t e x t   N O T   N U L L , 
         c i t i z e n _ i d   t e x t   N O T   N U L L ,   - -   W C   i d 
         h o u s e _ n o   t e x t   N O T   N U L L , 
         p a y e r _ n a m e   t e x t   N O T   N U L L , 
         p a i d _ m o n t h s   t e x t [ ]   N O T   N U L L ,   - -   k e y s :   [ ' o c t ' ,   ' n o v ' ,   . . . ] 
         a m o u n t   n u m e r i c   N O T   N U L L , 
         p a y m e n t _ m e t h o d   t e x t   N O T   N U L L , 
         s l i p _ i m a g e   t e x t ,   - -   B a s e 6 4   o r   U R L 
         p a y m e n t _ d a t e t i m e   t i m e s t a m p   w i t h   t i m e   z o n e   D E F A U L T   n o w ( ) , 
         s t a t u s   t e x t   D E F A U L T   ' p e n d i n g '   C H E C K   ( s t a t u s   I N   ( ' p e n d i n g ' ,   ' a p p r o v e d ' ,   ' r e j e c t e d ' ) ) , 
         r e j e c t _ r e a s o n   t e x t , 
         c r e a t e d _ a t   t i m e s t a m p   w i t h   t i m e   z o n e   D E F A U L T   n o w ( ) 
 ) ; 
 
 - -   I n d e x 
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ g p t _ c i t i z e n   O N   p u b l i c . g a r b a g e _ p a y m e n t _ t r a n s a c t i o n s ( c i t i z e n _ i d ) ; 
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ g p t _ s t a t u s   O N   p u b l i c . g a r b a g e _ p a y m e n t _ t r a n s a c t i o n s ( s t a t u s ) ; 
 
 - -   R L S 
 A L T E R   T A B L E   p u b l i c . g a r b a g e _ p a y m e n t _ t r a n s a c t i o n s   E N A B L E   R O W   L E V E L   S E C U R I T Y ; 
 C R E A T E   P O L I C Y   \  
 E n a b l e  
 a l l  
 a c t i o n s  
 f o r  
 p u b l i c  
 g a r b a g e _ p a y m e n t _ t r a n s a c t i o n s \   O N   p u b l i c . g a r b a g e _ p a y m e n t _ t r a n s a c t i o n s   F O R   A L L   U S I N G   ( t r u e )   W I T H   C H E C K   ( t r u e ) ; 
  
  
 - -   A d d   s u b d i s t r i c t   c o l u m n   t o   w a s t e _ c u s t o m e r s  
 A L T E R   T A B L E   p u b l i c . w a s t e _ c u s t o m e r s   A D D   C O L U M N   s u b d i s t r i c t   t e x t   D E F A U L T   ' I2@G' ;  
  
 

-- ==========================================
-- SOURCE: setup_waste_import_history.sql
-- ==========================================

-- ==========================================
-- DDL for Waste Import History Table
-- GOOD GOV Waste Fee System
-- ==========================================

CREATE TABLE IF NOT EXISTS public.waste_import_history (
    id text PRIMARY KEY,
    batch_id text NOT NULL,
    filename text NOT NULL,
    import_date timestamptz DEFAULT now(),
    user_name text,
    fiscal_year text,
    village text,
    sheet_name text,
    total_rows integer DEFAULT 0,
    success_count integer DEFAULT 0,
    warning_count integer DEFAULT 0,
    error_count integer DEFAULT 0,
    status text DEFAULT 'completed',
    rollback_status text DEFAULT 'none',
    import_data jsonb,
    error_log jsonb,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.waste_import_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all actions for public" ON public.waste_import_history FOR ALL USING (true) WITH CHECK (true);


-- ==========================================
-- SOURCE: setup_waste_staff.sql
-- ==========================================

-- ==========================================
-- CREATE TABLE: waste_staff
-- Description: เก็บข้อมูลเจ้าหน้าที่รับชำระค่าธรรมเนียมขยะ รวมถึงรูปโปรไฟล์และลายเซ็น
-- ==========================================

CREATE TABLE IF NOT EXISTS public.waste_staff (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    position TEXT,
    username TEXT,
    role TEXT NOT NULL DEFAULT 'Collector',
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    profile_image_url TEXT,
    signature_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE public.waste_staff ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous access (สำหรับการใช้งานทั่วไป ที่ไม่ได้ใช้ Supabase Auth)
-- หากใช้ Supabase Auth แนะนำให้เปลี่ยนเป็น role 'authenticated'
CREATE POLICY "Allow public read access for waste_staff" 
    ON public.waste_staff 
    FOR SELECT 
    USING (true);

CREATE POLICY "Allow public insert access for waste_staff" 
    ON public.waste_staff 
    FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Allow public update access for waste_staff" 
    ON public.waste_staff 
    FOR UPDATE 
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow public delete access for waste_staff" 
    ON public.waste_staff 
    FOR DELETE 
    USING (true);


-- ==========================================
-- SOURCE: supabase-waste-chat.sql
-- ==========================================

-- ==============================================================================
-- Waste Payment Real-time Chat System
-- ==============================================================================

-- 1. Create the waste_chats table
CREATE TABLE IF NOT EXISTS public.waste_chats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id VARCHAR(255) NOT NULL,          -- Identifier for the chat room (usually Citizen's LINE ID or HouseNo+Name)
    sender_type VARCHAR(50) NOT NULL,       -- 'citizen' or 'official'
    sender_name VARCHAR(255) NOT NULL,      -- Name of the sender to display
    message TEXT NOT NULL,                  -- The chat message content
    is_read BOOLEAN DEFAULT FALSE,          -- Read status for notifications
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_waste_chats_room_id ON public.waste_chats(room_id);
CREATE INDEX IF NOT EXISTS idx_waste_chats_created_at ON public.waste_chats(created_at);
CREATE INDEX IF NOT EXISTS idx_waste_chats_is_read ON public.waste_chats(is_read);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.waste_chats ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies (Allowing anon access for simplicity in this frontend-heavy app)
-- Policy: Allow read access to everyone
CREATE POLICY "Allow anonymous read access" ON public.waste_chats
    FOR SELECT USING (true);

-- Policy: Allow insert access to everyone
CREATE POLICY "Allow anonymous insert access" ON public.waste_chats
    FOR INSERT WITH CHECK (true);

-- Policy: Allow update access to everyone (for updating is_read status)
CREATE POLICY "Allow anonymous update access" ON public.waste_chats
    FOR UPDATE USING (true);

-- 5. Enable Realtime for the table
-- Change replica identity to full so that realtime events include previous and new records
ALTER TABLE public.waste_chats REPLICA IDENTITY FULL;

-- Add the table to the supabase_realtime publication
-- Note: If the publication 'supabase_realtime' doesn't exist, this might fail,
-- but Supabase usually has it created by default.
BEGIN;
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'waste_chats'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.waste_chats;
    END IF;
  END
  $$;
COMMIT;


