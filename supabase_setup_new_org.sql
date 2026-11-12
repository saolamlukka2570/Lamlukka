-- ==========================================
-- SQL SETUP FOR NEW ORGANIZATION
-- Contains: Citizen System, Waste Payment System, Staff System
-- ==========================================

-- ==========================================
-- SOURCE: digital-data-schema.sql
-- ==========================================

-- ==========================================
-- DIGITAL DATA CENTER
-- Population Intelligence + Household GIS
-- Smart Governance Municipality Platform
-- ==========================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ==========================================
-- 1. HOUSEHOLDS (Master Geo Object)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.dd_households (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    house_code TEXT,
    house_number TEXT,
    village_no INTEGER,
    village_name TEXT,
    subdistrict TEXT DEFAULT 'ท่าสะอาด',
    district TEXT DEFAULT 'เซกา',
    province TEXT DEFAULT 'บึงกาฬ',

    -- GIS Coordinates
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    geom GEOMETRY(Point, 4326),

    -- Owner Info
    owner_name TEXT,
    tr14_number TEXT,

    -- Computed Counts (auto-calculated via trigger)
    total_members INTEGER DEFAULT 0,
    male_count INTEGER DEFAULT 0,
    female_count INTEGER DEFAULT 0,
    elderly_count INTEGER DEFAULT 0,
    disabled_count INTEGER DEFAULT 0,
    bedridden_count INTEGER DEFAULT 0,
    newborn_count INTEGER DEFAULT 0,

    -- Status
    poverty_status BOOLEAN DEFAULT FALSE,
    jp2t_failed BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Spatial Index
CREATE INDEX IF NOT EXISTS idx_dd_household_geom
ON public.dd_households USING GIST(geom);

-- Regular Indexes
CREATE INDEX IF NOT EXISTS idx_dd_household_village ON public.dd_households(village_no);
CREATE INDEX IF NOT EXISTS idx_dd_household_house ON public.dd_households(house_number);
CREATE INDEX IF NOT EXISTS idx_dd_household_tr14 ON public.dd_households(tr14_number);

-- ==========================================
-- 2. HOUSEHOLD MEMBERS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.dd_household_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES public.dd_households(id) ON DELETE CASCADE,

    citizen_id VARCHAR(13),
    prefix TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    gender TEXT CHECK (gender IN ('ชาย', 'หญิง', 'อื่นๆ')),
    birth_date DATE,
    age INTEGER,

    relationship TEXT,
    occupation TEXT,
    education TEXT,
    is_head BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dd_member_household ON public.dd_household_members(household_id);
CREATE INDEX IF NOT EXISTS idx_dd_member_citizen ON public.dd_household_members(citizen_id);
CREATE INDEX IF NOT EXISTS idx_dd_member_name ON public.dd_household_members(first_name, last_name);

-- ==========================================
-- 3. ELDERLY
-- ==========================================
CREATE TABLE IF NOT EXISTS public.dd_elderly (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_member_id UUID REFERENCES public.dd_household_members(id) ON DELETE CASCADE,

    welfare_status TEXT,
    dependency_level TEXT CHECK (dependency_level IN ('ติดสังคม', 'ติดบ้าน', 'ติดเตียง')),
    caregiver TEXT,
    gps_verified BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dd_elderly_member ON public.dd_elderly(household_member_id);

-- ==========================================
-- 4. BEDRIDDEN PATIENTS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.dd_bedridden_patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_member_id UUID REFERENCES public.dd_household_members(id) ON DELETE CASCADE,

    disease TEXT,
    condition_level TEXT CHECK (condition_level IN ('เบา', 'ปานกลาง', 'หนัก', 'วิกฤต')),
    caregiver TEXT,
    medical_note TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dd_bedridden_member ON public.dd_bedridden_patients(household_member_id);

-- ==========================================
-- 5. DISABLED PERSONS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.dd_disabled_persons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_member_id UUID REFERENCES public.dd_household_members(id) ON DELETE CASCADE,

    disability_type TEXT,
    severity TEXT CHECK (severity IN ('เล็กน้อย', 'ปานกลาง', 'รุนแรง')),
    rights_status TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dd_disabled_member ON public.dd_disabled_persons(household_member_id);

-- ==========================================
-- 6. NEWBORNS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.dd_newborns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_member_id UUID REFERENCES public.dd_household_members(id) ON DELETE CASCADE,

    birth_weight NUMERIC(5, 2),
    guardian_name TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dd_newborn_member ON public.dd_newborns(household_member_id);

-- ==========================================
-- 7. POOR HOUSEHOLDS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.dd_poor_households (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES public.dd_households(id) ON DELETE CASCADE,

    poverty_type TEXT,
    housing_condition TEXT,
    assistance_required TEXT,
    jp2t_status BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dd_poor_household ON public.dd_poor_households(household_id);

-- ==========================================
-- 8. COMMUNITY SCHOLARS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.dd_community_scholars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_member_id UUID REFERENCES public.dd_household_members(id) ON DELETE CASCADE,

    expertise TEXT,
    contact TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dd_scholar_member ON public.dd_community_scholars(household_member_id);

-- ==========================================
-- 9. LEADERS & VOLUNTEERS
-- ==========================================
CREATE TYPE dd_leader_role AS ENUM (
    'VillageLeader',
    'CommunityLeader',
    'VillageHealthVolunteer',
    'CivilDefenseVolunteer'
);

CREATE TABLE IF NOT EXISTS public.dd_leaders_volunteers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_member_id UUID REFERENCES public.dd_household_members(id) ON DELETE CASCADE,

    role_type dd_leader_role NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dd_leader_member ON public.dd_leaders_volunteers(household_member_id);
CREATE INDEX IF NOT EXISTS idx_dd_leader_role ON public.dd_leaders_volunteers(role_type);

-- ==========================================
-- 10. INTEGRATION LOGS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.dd_integration_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_system TEXT,
    match_method TEXT,
    record_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    message TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- STORED PROCEDURES
-- ==========================================

-- Auto-update geom from lat/lng
CREATE OR REPLACE FUNCTION dd_update_geom()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_dd_household_geom
    BEFORE INSERT OR UPDATE ON public.dd_households
    FOR EACH ROW
    EXECUTE FUNCTION dd_update_geom();

-- Calculate household stats
CREATE OR REPLACE FUNCTION dd_calculate_household_stats(p_household_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total INTEGER;
    v_male INTEGER;
    v_female INTEGER;
    v_elderly INTEGER;
    v_disabled INTEGER;
    v_bedridden INTEGER;
    v_newborn INTEGER;
BEGIN
    -- Total members
    SELECT COUNT(*) INTO v_total
    FROM public.dd_household_members WHERE household_id = p_household_id;

    -- Gender counts
    SELECT COUNT(*) INTO v_male
    FROM public.dd_household_members WHERE household_id = p_household_id AND gender = 'ชาย';

    SELECT COUNT(*) INTO v_female
    FROM public.dd_household_members WHERE household_id = p_household_id AND gender = 'หญิง';

    -- Elderly count (age >= 60)
    SELECT COUNT(*) INTO v_elderly
    FROM public.dd_household_members m
    JOIN public.dd_elderly e ON e.household_member_id = m.id
    WHERE m.household_id = p_household_id;

    -- Disabled count
    SELECT COUNT(*) INTO v_disabled
    FROM public.dd_household_members m
    JOIN public.dd_disabled_persons d ON d.household_member_id = m.id
    WHERE m.household_id = p_household_id;

    -- Bedridden count
    SELECT COUNT(*) INTO v_bedridden
    FROM public.dd_household_members m
    JOIN public.dd_bedridden_patients b ON b.household_member_id = m.id
    WHERE m.household_id = p_household_id;

    -- Newborn count
    SELECT COUNT(*) INTO v_newborn
    FROM public.dd_household_members m
    JOIN public.dd_newborns n ON n.household_member_id = m.id
    WHERE m.household_id = p_household_id;

    -- Update household
    UPDATE public.dd_households
    SET total_members = v_total,
        male_count = v_male,
        female_count = v_female,
        elderly_count = v_elderly,
        disabled_count = v_disabled,
        bedridden_count = v_bedridden,
        newborn_count = v_newborn,
        updated_at = NOW()
    WHERE id = p_household_id;
END;
$$ LANGUAGE plpgsql;

-- Auto-recalculate on member change
CREATE OR REPLACE FUNCTION dd_on_member_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM dd_calculate_household_stats(OLD.household_id);
        RETURN OLD;
    ELSE
        PERFORM dd_calculate_household_stats(NEW.household_id);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_dd_member_stats
    AFTER INSERT OR UPDATE OR DELETE ON public.dd_household_members
    FOR EACH ROW
    EXECUTE FUNCTION dd_on_member_change();

-- Match citizen record (Intelligence Engine)
CREATE OR REPLACE FUNCTION dd_match_citizen(
    p_citizen_id VARCHAR(13) DEFAULT NULL,
    p_tr14 TEXT DEFAULT NULL,
    p_first_name TEXT DEFAULT NULL,
    p_last_name TEXT DEFAULT NULL,
    p_house_number TEXT DEFAULT NULL
)
RETURNS TABLE(
    member_id UUID,
    match_score INTEGER,
    match_method TEXT
) AS $$
BEGIN
    -- Priority 1: Citizen ID (exact)
    RETURN QUERY
    SELECT m.id, 100, 'citizen_id'::TEXT
    FROM public.dd_household_members m
    WHERE p_citizen_id IS NOT NULL AND m.citizen_id = p_citizen_id
    LIMIT 5;

    -- Priority 2: TR14 reference
    RETURN QUERY
    SELECT m.id, 80, 'tr14'::TEXT
    FROM public.dd_household_members m
    JOIN public.dd_households h ON h.id = m.household_id
    WHERE p_tr14 IS NOT NULL AND h.tr14_number = p_tr14
    LIMIT 5;

    -- Priority 3: Full name match
    RETURN QUERY
    SELECT m.id, 60, 'name_match'::TEXT
    FROM public.dd_household_members m
    WHERE p_first_name IS NOT NULL AND p_last_name IS NOT NULL
      AND m.first_name = p_first_name AND m.last_name = p_last_name
    LIMIT 5;

    -- Priority 4: House number match
    RETURN QUERY
    SELECT m.id, 40, 'house_number'::TEXT
    FROM public.dd_household_members m
    JOIN public.dd_households h ON h.id = m.household_id
    WHERE p_house_number IS NOT NULL AND h.house_number = p_house_number
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================
ALTER TABLE public.dd_households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dd_household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dd_elderly ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dd_bedridden_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dd_disabled_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dd_newborns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dd_poor_households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dd_community_scholars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dd_leaders_volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dd_integration_logs ENABLE ROW LEVEL SECURITY;

-- Read policies (authenticated)
CREATE POLICY "dd_households_read" ON public.dd_households FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "dd_members_read" ON public.dd_household_members FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "dd_elderly_read" ON public.dd_elderly FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "dd_bedridden_read" ON public.dd_bedridden_patients FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "dd_disabled_read" ON public.dd_disabled_persons FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "dd_newborns_read" ON public.dd_newborns FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "dd_poor_read" ON public.dd_poor_households FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "dd_scholars_read" ON public.dd_community_scholars FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "dd_leaders_read" ON public.dd_leaders_volunteers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "dd_logs_read" ON public.dd_integration_logs FOR SELECT USING (auth.role() = 'authenticated');

-- Manage policies (officers)
CREATE POLICY "dd_households_manage" ON public.dd_households FOR ALL USING (true);
CREATE POLICY "dd_members_manage" ON public.dd_household_members FOR ALL USING (true);
CREATE POLICY "dd_elderly_manage" ON public.dd_elderly FOR ALL USING (true);
CREATE POLICY "dd_bedridden_manage" ON public.dd_bedridden_patients FOR ALL USING (true);
CREATE POLICY "dd_disabled_manage" ON public.dd_disabled_persons FOR ALL USING (true);
CREATE POLICY "dd_newborns_manage" ON public.dd_newborns FOR ALL USING (true);
CREATE POLICY "dd_poor_manage" ON public.dd_poor_households FOR ALL USING (true);
CREATE POLICY "dd_scholars_manage" ON public.dd_community_scholars FOR ALL USING (true);
CREATE POLICY "dd_leaders_manage" ON public.dd_leaders_volunteers FOR ALL USING (true);
CREATE POLICY "dd_logs_manage" ON public.dd_integration_logs FOR ALL USING (true);

-- ==========================================
-- VIEWS FOR ANALYTICS
-- ==========================================

-- Population overview by village
CREATE OR REPLACE VIEW public.dd_village_summary AS
SELECT
    village_no,
    village_name,
    COUNT(*) AS household_count,
    SUM(total_members) AS total_population,
    SUM(male_count) AS total_male,
    SUM(female_count) AS total_female,
    SUM(elderly_count) AS total_elderly,
    SUM(disabled_count) AS total_disabled,
    SUM(bedridden_count) AS total_bedridden,
    SUM(newborn_count) AS total_newborn,
    COUNT(*) FILTER (WHERE poverty_status = TRUE) AS poor_households,
    COUNT(*) FILTER (WHERE jp2t_failed = TRUE) AS jp2t_failed_households
FROM public.dd_households
GROUP BY village_no, village_name
ORDER BY village_no;

-- Age distribution view
CREATE OR REPLACE VIEW public.dd_age_distribution AS
SELECT
    CASE
        WHEN age < 1 THEN 'แรกเกิด (< 1 ปี)'
        WHEN age BETWEEN 1 AND 5 THEN 'เด็กเล็ก (1-5 ปี)'
        WHEN age BETWEEN 6 AND 14 THEN 'เด็ก (6-14 ปี)'
        WHEN age BETWEEN 15 AND 24 THEN 'เยาวชน (15-24 ปี)'
        WHEN age BETWEEN 25 AND 59 THEN 'วัยทำงาน (25-59 ปี)'
        WHEN age >= 60 THEN 'ผู้สูงอายุ (60+ ปี)'
        ELSE 'ไม่ระบุ'
    END AS age_group,
    gender,
    COUNT(*) AS member_count
FROM public.dd_household_members
WHERE age IS NOT NULL
GROUP BY age_group, gender
ORDER BY age_group;


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


-- ==========================================
-- SOURCE: setup_secretary_hr.sql
-- ==========================================

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


-- ==========================================
-- SOURCE: setup_secretary_leave.sql
-- ==========================================

-- =========================================================================
-- สคริปต์สร้างฐานข้อมูลสำหรับระบบลางานออนไลน์และสมุดบันทึกงานประจำวัน (Online Leave & Daily Work Log System)
-- =========================================================================

-- 1. สร้างตารางบันทึกการลาพักของบุคลากร (staff_leaves)
CREATE TABLE IF NOT EXISTS public.staff_leaves (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id TEXT NOT NULL, -- อ้างอิง ID ในตาราง Staff
    staff_name VARCHAR(255) NOT NULL, -- ชื่อผู้ลา
    leave_type VARCHAR(100) NOT NULL, -- ลาป่วย, ลากิจ, ลาพักผ่อน, ลาคลอด, ลาอุปสมบท
    start_date DATE NOT NULL, -- วันที่เริ่มลา
    end_date DATE NOT NULL, -- วันที่สิ้นสุด
    total_days DECIMAL(5, 2) NOT NULL, -- จำนวนวันลา เช่น 1.5 วัน
    reason TEXT NOT NULL, -- เหตุผลการลา
    contact_address TEXT, -- ที่อยู่หรือข้อมูลติดต่อระหว่างการลา
    file_url TEXT, -- ลิงก์แนบใบรับรองแพทย์ หรือใบมอบงาน
    status VARCHAR(50) NOT NULL DEFAULT 'เสนอปลัด', -- เสนอปลัด, ปลัดเห็นชอบ, นายกอนุมัติ, ไม่อนุมัติ, ยกเลิก
    signature_url TEXT, -- รูปภาพลายเซ็นผู้ยื่นคำขอ
    approver_name VARCHAR(255), -- ชื่อผู้อนุมัติขั้นสุดท้าย
    approval_date DATE, -- วันที่ลงนามอนุมัติ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.staff_leaves IS 'ข้อมูลการขอยื่นลางานออนไลน์พร้อมประวัติการอนุมัติ';

-- 2. สร้างตารางเก็บจำนวนโควตาวันลาสะสมของบุคลากรแต่ละคน (leave_balances)
CREATE TABLE IF NOT EXISTS public.leave_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id TEXT NOT NULL UNIQUE, -- อ้างอิง ID ในตาราง Staff
    year INT NOT NULL DEFAULT 2569, -- ปีงบประมาณราชการ
    sick_taken INT DEFAULT 0, -- ใช้ลาป่วยไปแล้ว (วัน)
    sick_limit INT DEFAULT 30, -- โควตาลาป่วยสูงสุด (วัน)
    personal_taken INT DEFAULT 0, -- ใช้ลากิจไปแล้ว (วัน)
    personal_limit INT DEFAULT 45, -- โควตาลากิจสูงสุด (วัน)
    vacation_taken INT DEFAULT 0, -- ใช้ลาพักผ่อนไปแล้ว (วัน)
    vacation_limit INT DEFAULT 10, -- โควตาลาพักผ่อนสูงสุด (วัน)
    vacation_carried INT DEFAULT 0, -- โควตาลาพักผ่อนสะสมปีก่อน (วัน)
    maternity_taken INT DEFAULT 0,
    maternity_limit INT DEFAULT 90,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.leave_balances IS 'โควตาวันลาคงเหลือของข้าราชการและบุคลากร';

-- 3. สร้างตารางสมุดบันทึกงานประจำวัน สำหรับพนักงานจ้างเหมา (daily_work_logs)
CREATE TABLE IF NOT EXISTS public.daily_work_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id TEXT NOT NULL, -- ผู้จดบันทึก
    staff_name VARCHAR(255) NOT NULL, -- ชื่อผู้ส่งรายงาน
    work_date DATE NOT NULL DEFAULT CURRENT_DATE, -- วันที่ทำบันทึกปฏิบัติงาน
    tasks_performed TEXT NOT NULL, -- รายละเอียดผลการปฏิบัติงานหลัก
    time_spent VARCHAR(50), -- ชั่วโมงการทำงาน เช่น 08:30 - 16:30 น.
    attachment_url TEXT, -- ไฟล์ผลงานแนบ
    photo_url TEXT, -- ภาพถ่ายยืนยันการปฏิบัติภารกิจนอกสถานที่
    supervisor_id TEXT, -- หัวหน้าผู้ตรวจประเมิน
    supervisor_comment TEXT, -- ความเห็นตรวจงาน
    status VARCHAR(50) DEFAULT 'รอตรวจ', -- รอตรวจ, ตรวจเสร็จแล้ว, ให้แก้ไข
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.daily_work_logs IS 'แบบบันทึกผลงานการทำงานประจำวันสำหรับพนักงานจ้างเหมาบริการเพื่อใช้ยื่นเบิกจ่ายเงินเดือน';

-- 4. เปิดใช้งาน Row Level Security (RLS)
ALTER TABLE public.staff_leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_work_logs ENABLE ROW LEVEL SECURITY;

-- 5. ตั้งค่านโยบาย (Policies)
CREATE POLICY "Allow public select for staff_leaves" ON public.staff_leaves FOR SELECT USING (true);
CREATE POLICY "Allow write for authenticated on staff_leaves" ON public.staff_leaves FOR ALL USING (true);

CREATE POLICY "Allow public select for leave_balances" ON public.leave_balances FOR SELECT USING (true);
CREATE POLICY "Allow write for authenticated on leave_balances" ON public.leave_balances FOR ALL USING (true);

CREATE POLICY "Allow public select for daily_work_logs" ON public.daily_work_logs FOR SELECT USING (true);
CREATE POLICY "Allow write for authenticated on daily_work_logs" ON public.daily_work_logs FOR ALL USING (true);


-- ==========================================
-- SOURCE: setup_secretary_attendance.sql
-- ==========================================

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


-- ==========================================
-- SOURCE: setup_secretary_vehicle.sql
-- ==========================================

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


-- ==========================================
-- SOURCE: setup_secretary_meetings.sql
-- ==========================================

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


-- ==========================================
-- SOURCE: setup_secretary_calendar.sql
-- ==========================================

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


-- ==========================================
-- SOURCE: setup_secretary_cctv.sql
-- ==========================================

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


-- ==========================================
-- SOURCE: setup_secretary_documents.sql
-- ==========================================

-- =========================================================================
-- สคริปต์สร้างฐานข้อมูลสำหรับระบบงานสารบรรณอิเล็กทรอนิกส์ (Digital Document System)
-- =========================================================================

-- 1. สร้างตารางหลักสำหรับเก็บข้อมูลหนังสือสารบรรณ (documents)
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reg_no SERIAL, -- เลขทะเบียนรับ/ส่งอัตโนมัติ
    reg_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL, -- วันที่ลงรับในระบบ
    type VARCHAR(50) NOT NULL DEFAULT 'INBOUND', -- INBOUND (หนังสือเข้า), OUTBOUND (หนังสือออก)
    doc_no VARCHAR(100) NOT NULL, -- เลขที่หนังสือจริง เช่น นร 0101/ว123
    doc_date DATE NOT NULL, -- วันที่ลงในเอกสารหนังสือ
    title TEXT NOT NULL, -- หัวข้อ/เรื่อง
    origin VARCHAR(255), -- หน่วยงานต้นทาง
    destination VARCHAR(255), -- หน่วยงานปลายทาง
    attachment_desc TEXT, -- รายละเอียดสิ่งส่งมาด้วย
    file_url TEXT, -- ลิงก์ไฟล์ PDF แนบจาก Google Drive/Supabase Storage
    status VARCHAR(50) NOT NULL DEFAULT 'รับเรื่อง', -- สถานะดำเนินงาน: รับเรื่อง, เสนอปลัด, ปลัดสั่งการ, มอบหมายกอง, กองรับทราบ, เสร็จสิ้น, ยกเลิก
    urgency VARCHAR(50) NOT NULL DEFAULT 'ปกติ', -- ปกติ, ด่วน, ด่วนมาก, ด่วนที่สุด
    assigned_dept VARCHAR(100), -- กองงานที่รับมอบหมาย เช่น กองช่าง, กองคลัง
    assigned_staff_id UUID, -- เจ้าหน้าที่รับผิดชอบหลัก
    assignment_detail TEXT, -- ข้อความมอบหมาย/คำสั่งจากปลัด
    due_date DATE, -- วันครบกำหนดส่งงาน
    remark TEXT, -- หมายเหตุเพิ่มเติม
    created_by VARCHAR(255) DEFAULT 'Admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.documents IS 'ตารางเก็บข้อมูลหนังสือรับเข้าและหนังสือส่งออกของงานสารบรรณกลาง';

-- 2. สร้างตารางสำหรับบันทึกเส้นทางการเดินหนังสือและสถานะ (document_routing)
CREATE TABLE IF NOT EXISTS public.document_routing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    status VARCHAR(100) NOT NULL, -- สถานะในขั้นตอนนั้นๆ
    actor_name VARCHAR(255) NOT NULL, -- ชื่อผู้ดำเนินการ
    actor_role VARCHAR(255), -- บทบาท/ตำแหน่ง
    comment TEXT, -- ความเห็นสั่งการ/บันทึกการส่งต่อ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.document_routing IS 'ตารางบันทึกสถานะการเดินหนังสือและประวัติการสั่งการ (Routing Timeline)';

-- 3. สร้างตารางสำหรับบันทึกการเกษียณหนังสือดิจิทัลและลายมือชื่อ (document_endorsements)
CREATE TABLE IF NOT EXISTS public.document_endorsements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    signer_name VARCHAR(255) NOT NULL, -- ชื่อผู้ลงนามเกษียณหนังสือ (ปลัด/นายก/ผอ.กอง)
    signer_position VARCHAR(255) NOT NULL, -- ตำแหน่งผู้ลงนาม
    endorsement_text TEXT NOT NULL, -- ข้อความเกษียณหนังสือ เช่น 'เห็นควรอนุมัติให้ดำเนินการตามเสนอ'
    signature_svg TEXT, -- ข้อมูลลายเส้นของลายมือชื่อแบบ SVG/Base64
    ip_address VARCHAR(50), -- IP Address ที่บันทึกเพื่อตรวจสอบย้อนกลับ
    audit_hash VARCHAR(255), -- ลายนิ้วมือเข้ารหัสความปลอดภัยเพื่อตรวจสอบความถูกต้องของข้อมูล (Integrity Log)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.document_endorsements IS 'ตารางเก็บบันทึกการเกษียณหนังสือและการลงลายมือชื่อดิจิทัลเพื่อใช้ในการแนบท้ายใบปะหน้า';

-- 4. ตั้งค่าความปลอดภัย Row Level Security (RLS)
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_routing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_endorsements ENABLE ROW LEVEL SECURITY;

-- 5. กำหนดสิทธิ์ให้ผู้ใช้งานทั่วไปและเจ้าหน้าที่ (Policies)
CREATE POLICY "Allow select for authenticated on documents" ON public.documents FOR SELECT USING (true);
CREATE POLICY "Allow insert for authenticated on documents" ON public.documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for authenticated on documents" ON public.documents FOR UPDATE USING (true);
CREATE POLICY "Allow delete for authenticated on documents" ON public.documents FOR DELETE USING (true);

CREATE POLICY "Allow select for authenticated on document_routing" ON public.document_routing FOR SELECT USING (true);
CREATE POLICY "Allow insert for authenticated on document_routing" ON public.document_routing FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow select for authenticated on document_endorsements" ON public.document_endorsements FOR SELECT USING (true);
CREATE POLICY "Allow insert for authenticated on document_endorsements" ON public.document_endorsements FOR INSERT WITH CHECK (true);


