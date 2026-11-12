-- ==========================================
-- SMART GOVERNANCE MUNICIPALITY PLATFORM
-- DATABASE SCHEMA (Phase 1)
-- ==========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ROLES
CREATE TABLE public.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. USERS (Extends Supabase Auth)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.roles(id),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    position VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CITIZENS (Master Data)
CREATE TABLE public.citizens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    national_id VARCHAR(13) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(20),
    mobile_number VARCHAR(20),
    line_id VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. HOUSEHOLDS
CREATE TABLE public.households (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_number VARCHAR(50) UNIQUE NOT NULL,
    address TEXT NOT NULL,
    zone VARCHAR(50),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    head_of_household UUID REFERENCES public.citizens(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. PROPERTIES (GIS Ready)
CREATE TABLE public.properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id VARCHAR(100) UNIQUE,
    property_type VARCHAR(50), -- Land, Building, Condominium
    owner_id UUID REFERENCES public.citizens(id),
    area_sq_meters DECIMAL(10, 2),
    assessed_value DECIMAL(15, 2),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TAX RECORDS (Finance Module)
CREATE TABLE public.tax_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES public.properties(id),
    tax_year INT NOT NULL,
    amount_due DECIMAL(10, 2) NOT NULL,
    amount_paid DECIMAL(10, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'Pending', -- Pending, Paid, Overdue
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. WASTE ACCOUNTS (Public Health / Finance)
CREATE TABLE public.waste_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES public.households(id),
    category VARCHAR(50), -- Household, Commercial, Factory
    monthly_fee DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'Active',
    last_collection_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. WATER ACCOUNTS & READINGS (Finance Module)
CREATE TABLE public.water_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES public.households(id),
    meter_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.meter_readings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    water_account_id UUID REFERENCES public.water_accounts(id),
    reading_date DATE NOT NULL,
    previous_reading DECIMAL(10, 2) NOT NULL,
    current_reading DECIMAL(10, 2) NOT NULL,
    usage_amount DECIMAL(10, 2) GENERATED ALWAYS AS (current_reading - previous_reading) STORED,
    billed_amount DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'Unpaid',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. PAYMENTS (Centralized)
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference_id VARCHAR(100), -- Can link to Tax, Waste, Water
    payment_type VARCHAR(50), -- Tax, Waste, Water
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50), -- Cash, PromptPay, Transfer
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    received_by UUID REFERENCES public.users(id),
    status VARCHAR(20) DEFAULT 'Completed'
);

-- RLS (Row Level Security) Setup - Example for Citizens
ALTER TABLE public.citizens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access for authenticated users" ON public.citizens
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow insert/update for officers" ON public.citizens
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users u 
            JOIN public.roles r ON u.role_id = r.id 
            WHERE u.id = auth.uid() AND r.name IN ('Super Admin', 'Officer')
        )
    );

-- ==========================================
-- ELECTRIC MAINTENANCE SYSTEM (กองช่าง - ไฟฟ้า)
-- ==========================================

-- 10. ELECTRIC POLES (เสาไฟฟ้า)
CREATE TABLE public.electric_poles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pole_code VARCHAR(50) UNIQUE NOT NULL,
    pole_type VARCHAR(50) NOT NULL DEFAULT 'คอนกรีต', -- คอนกรีต, เหล็ก, ไม้
    light_type VARCHAR(50) NOT NULL DEFAULT 'LED', -- LED, หลอดไส้, โซล่าเซลล์
    lat DECIMAL(10, 8) NOT NULL,
    lng DECIMAL(11, 8) NOT NULL,
    location_detail TEXT,
    village_no VARCHAR(20),
    status VARCHAR(20) DEFAULT 'normal', -- normal, broken
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. ELECTRIC STAFF (เจ้าหน้าที่ไฟฟ้า)
CREATE TABLE public.electric_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    position VARCHAR(100),
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. ELECTRIC REPAIRS (บันทึกการซ่อม)
CREATE TABLE public.electric_repairs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id VARCHAR(100), -- เชื่อมกับ repair_electric หรือ citizen complaints
    pole_id UUID REFERENCES public.electric_poles(id),
    repair_date DATE NOT NULL DEFAULT CURRENT_DATE,
    detail TEXT,
    image_url TEXT,
    staff_id UUID REFERENCES public.electric_staff(id),
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, in_progress, completed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. ELECTRIC ITEMS (คลังอุปกรณ์ไฟฟ้า)
CREATE TABLE public.electric_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    unit VARCHAR(50) NOT NULL DEFAULT 'ชิ้น',
    qty INTEGER NOT NULL DEFAULT 0,
    min_qty INTEGER DEFAULT 5,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. REPAIR ITEMS (อุปกรณ์ที่ใช้ในแต่ละงานซ่อม)
CREATE TABLE public.repair_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repair_id UUID REFERENCES public.electric_repairs(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.electric_items(id),
    qty INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TRIGGER: ตัด stock อัตโนมัติเมื่อ insert repair_items
CREATE OR REPLACE FUNCTION deduct_electric_stock()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.electric_items 
    SET qty = qty - NEW.qty, updated_at = NOW()
    WHERE id = NEW.item_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_deduct_stock
    AFTER INSERT ON public.repair_items
    FOR EACH ROW
    EXECUTE FUNCTION deduct_electric_stock();

-- Enable RLS on new tables
ALTER TABLE public.electric_poles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.electric_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.electric_repairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.electric_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_items ENABLE ROW LEVEL SECURITY;

-- Allow read for authenticated users
CREATE POLICY "electric_poles_read" ON public.electric_poles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "electric_staff_read" ON public.electric_staff FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "electric_repairs_read" ON public.electric_repairs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "electric_items_read" ON public.electric_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "repair_items_read" ON public.repair_items FOR SELECT USING (auth.role() = 'authenticated');

-- Allow all for officers
CREATE POLICY "electric_poles_manage" ON public.electric_poles FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u JOIN public.roles r ON u.role_id = r.id WHERE u.id = auth.uid() AND r.name IN ('Super Admin', 'Officer'))
);
CREATE POLICY "electric_staff_manage" ON public.electric_staff FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u JOIN public.roles r ON u.role_id = r.id WHERE u.id = auth.uid() AND r.name IN ('Super Admin', 'Officer'))
);
CREATE POLICY "electric_repairs_manage" ON public.electric_repairs FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u JOIN public.roles r ON u.role_id = r.id WHERE u.id = auth.uid() AND r.name IN ('Super Admin', 'Officer'))
);
CREATE POLICY "electric_items_manage" ON public.electric_items FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u JOIN public.roles r ON u.role_id = r.id WHERE u.id = auth.uid() AND r.name IN ('Super Admin', 'Officer'))
);
CREATE POLICY "repair_items_manage" ON public.repair_items FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u JOIN public.roles r ON u.role_id = r.id WHERE u.id = auth.uid() AND r.name IN ('Super Admin', 'Officer'))
);

