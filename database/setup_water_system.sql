-- ==========================================
-- SQL SETUP FOR WATER SUPPLY MANAGEMENT SYSTEM
-- ระบบจัดการน้ำประปา - Smart Governance Platform
-- ==========================================
-- WARNING: ห้ามแก้ไขตารางระบบขยะ (waste_*) ใดๆ
-- ==========================================

-- ==========================================
-- 1. ตารางทะเบียนผู้ใช้น้ำ (water_customers)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.water_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    id_card TEXT,
    phone TEXT,
    house_no TEXT NOT NULL,
    moo TEXT,
    village TEXT,
    subdistrict TEXT,
    district TEXT,
    province TEXT,
    customer_type TEXT NOT NULL DEFAULT 'บ้านพักอาศัย',
    start_date DATE DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','cancelled','overdue')),
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    line_user_id TEXT,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_water_customers_code ON public.water_customers(customer_code);
CREATE INDEX IF NOT EXISTS idx_water_customers_house ON public.water_customers(house_no, moo);
CREATE INDEX IF NOT EXISTS idx_water_customers_status ON public.water_customers(status);
CREATE INDEX IF NOT EXISTS idx_water_customers_type ON public.water_customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_water_customers_id_card ON public.water_customers(id_card);

-- ==========================================
-- 2. ตารางทะเบียนมาตรวัดน้ำ (water_meters)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.water_meters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.water_customers(id) ON DELETE CASCADE,
    meter_code TEXT NOT NULL UNIQUE,
    serial_no TEXT,
    brand TEXT,
    model TEXT,
    size TEXT DEFAULT '1/2 นิ้ว',
    install_date DATE DEFAULT CURRENT_DATE,
    initial_reading NUMERIC DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','removed','faulty')),
    removed_date DATE,
    removed_reading NUMERIC,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_water_meters_customer ON public.water_meters(customer_id);
CREATE INDEX IF NOT EXISTS idx_water_meters_code ON public.water_meters(meter_code);
CREATE INDEX IF NOT EXISTS idx_water_meters_status ON public.water_meters(status);

-- ==========================================
-- 3. ตารางบันทึกการจดเลขมาตร (water_meter_readings)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.water_meter_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meter_id UUID NOT NULL REFERENCES public.water_meters(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.water_customers(id) ON DELETE CASCADE,
    fiscal_year TEXT NOT NULL,
    billing_month TEXT NOT NULL,
    reading_date DATE DEFAULT CURRENT_DATE,
    previous_reading NUMERIC NOT NULL DEFAULT 0,
    current_reading NUMERIC NOT NULL DEFAULT 0,
    usage_units NUMERIC GENERATED ALWAYS AS (GREATEST(current_reading - previous_reading, 0)) STORED,
    reader_user_id TEXT,
    reader_name TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    photo_url TEXT,
    note TEXT,
    status TEXT DEFAULT 'completed' CHECK (status IN ('completed','pending','cancelled','anomaly')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(meter_id, fiscal_year, billing_month)
);

CREATE INDEX IF NOT EXISTS idx_water_readings_meter ON public.water_meter_readings(meter_id);
CREATE INDEX IF NOT EXISTS idx_water_readings_customer ON public.water_meter_readings(customer_id);
CREATE INDEX IF NOT EXISTS idx_water_readings_period ON public.water_meter_readings(fiscal_year, billing_month);
CREATE INDEX IF NOT EXISTS idx_water_readings_date ON public.water_meter_readings(reading_date DESC);

-- ==========================================
-- 4. ตารางอัตราค่าน้ำ (water_tariffs) - Version Control
-- ==========================================
CREATE TABLE IF NOT EXISTS public.water_tariffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    customer_type TEXT NOT NULL DEFAULT 'บ้านพักอาศัย',
    minimum_charge NUMERIC DEFAULT 50,
    service_charge NUMERIC DEFAULT 30,
    late_fee_percent NUMERIC DEFAULT 0,
    late_fee_fixed NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive')),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_water_tariffs_type ON public.water_tariffs(customer_type);
CREATE INDEX IF NOT EXISTS idx_water_tariffs_status ON public.water_tariffs(status);

-- ==========================================
-- 5. ตารางอัตราขั้นบันได (water_tariff_rates)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.water_tariff_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tariff_id UUID NOT NULL REFERENCES public.water_tariffs(id) ON DELETE CASCADE,
    min_unit NUMERIC NOT NULL DEFAULT 0,
    max_unit NUMERIC,
    price_per_unit NUMERIC NOT NULL DEFAULT 0,
    sort_order INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_water_tariff_rates_tariff ON public.water_tariff_rates(tariff_id);

-- ==========================================
-- 6. ตารางใบแจ้งค่าน้ำ (water_bills)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.water_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_no TEXT NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES public.water_customers(id) ON DELETE CASCADE,
    meter_id UUID REFERENCES public.water_meters(id),
    reading_id UUID REFERENCES public.water_meter_readings(id),
    fiscal_year TEXT NOT NULL,
    billing_month TEXT NOT NULL,
    previous_reading NUMERIC DEFAULT 0,
    current_reading NUMERIC DEFAULT 0,
    usage_units NUMERIC DEFAULT 0,
    water_charge NUMERIC DEFAULT 0,
    service_charge NUMERIC DEFAULT 0,
    fine NUMERIC DEFAULT 0,
    other_charge NUMERIC DEFAULT 0,
    total_amount NUMERIC DEFAULT 0,
    due_date DATE,
    tariff_id UUID REFERENCES public.water_tariffs(id),
    status TEXT DEFAULT 'unpaid' CHECK (status IN ('unpaid','pending','paid','overdue','cancelled')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_water_bills_customer ON public.water_bills(customer_id);
CREATE INDEX IF NOT EXISTS idx_water_bills_period ON public.water_bills(fiscal_year, billing_month);
CREATE INDEX IF NOT EXISTS idx_water_bills_status ON public.water_bills(status);
CREATE INDEX IF NOT EXISTS idx_water_bills_no ON public.water_bills(bill_no);
CREATE INDEX IF NOT EXISTS idx_water_bills_due ON public.water_bills(due_date);

-- ==========================================
-- 7. ตารางการชำระเงิน (water_payments)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.water_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_no TEXT UNIQUE,
    customer_id UUID NOT NULL REFERENCES public.water_customers(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL DEFAULT 0,
    payment_method TEXT DEFAULT 'เงินสด' CHECK (payment_method IN ('เงินสด','โอนเงิน','QR Code','อื่นๆ')),
    payment_date DATE DEFAULT CURRENT_DATE,
    payment_time TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','completed','rejected','cancelled')),
    slip_url TEXT,
    source TEXT DEFAULT 'walk-in' CHECK (source IN ('walk-in','citizen-portal')),
    verified_by TEXT,
    verified_at TIMESTAMPTZ,
    reject_reason TEXT,
    staff_name TEXT,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_water_payments_customer ON public.water_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_water_payments_date ON public.water_payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_water_payments_status ON public.water_payments(status);

-- ==========================================
-- 8. ตารางรายละเอียดการชำระ (water_payment_items)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.water_payment_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES public.water_payments(id) ON DELETE CASCADE,
    bill_id UUID NOT NULL REFERENCES public.water_bills(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_water_payment_items_payment ON public.water_payment_items(payment_id);
CREATE INDEX IF NOT EXISTS idx_water_payment_items_bill ON public.water_payment_items(bill_id);

-- ==========================================
-- 9. ตารางใบเสร็จ (water_receipts)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.water_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_no TEXT NOT NULL UNIQUE,
    payment_id UUID NOT NULL REFERENCES public.water_payments(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.water_customers(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL DEFAULT 0,
    receipt_date DATE DEFAULT CURRENT_DATE,
    issued_by TEXT,
    pdf_url TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active','cancelled')),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_water_receipts_payment ON public.water_receipts(payment_id);
CREATE INDEX IF NOT EXISTS idx_water_receipts_customer ON public.water_receipts(customer_id);
CREATE INDEX IF NOT EXISTS idx_water_receipts_no ON public.water_receipts(receipt_no);

-- ==========================================
-- 10. ตารางการแจ้งเตือน (water_notifications)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.water_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.water_customers(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('new_bill','due_reminder','overdue','payment_success','anomaly')),
    title TEXT NOT NULL,
    message TEXT,
    channel TEXT DEFAULT 'system' CHECK (channel IN ('system','line','sms','email')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','read')),
    sent_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_water_notifications_customer ON public.water_notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_water_notifications_type ON public.water_notifications(type);
CREATE INDEX IF NOT EXISTS idx_water_notifications_status ON public.water_notifications(status);

-- ==========================================
-- 11. ตาราง Notification Log ป้องกันส่งซ้ำ (water_notification_logs)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.water_notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID REFERENCES public.water_notifications(id),
    customer_id UUID NOT NULL REFERENCES public.water_customers(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    reference_id TEXT,
    channel TEXT,
    sent_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(customer_id, type, reference_id, channel)
);

-- ==========================================
-- 12. ตารางตั้งค่าระบบ (water_settings)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.water_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value TEXT,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 13. ตาราง Audit Log (water_audit_logs)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.water_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
    old_data JSONB,
    new_data JSONB,
    changed_by TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_water_audit_table ON public.water_audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_water_audit_record ON public.water_audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_water_audit_date ON public.water_audit_logs(created_at DESC);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE public.water_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_meter_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_tariffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_tariff_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_payment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_audit_logs ENABLE ROW LEVEL SECURITY;

-- Development policies (Allow all - ปรับเป็น role-based สำหรับ production)
CREATE POLICY "water_customers_all" ON public.water_customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "water_meters_all" ON public.water_meters FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "water_meter_readings_all" ON public.water_meter_readings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "water_tariffs_all" ON public.water_tariffs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "water_tariff_rates_all" ON public.water_tariff_rates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "water_bills_all" ON public.water_bills FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "water_payments_all" ON public.water_payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "water_payment_items_all" ON public.water_payment_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "water_receipts_all" ON public.water_receipts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "water_notifications_all" ON public.water_notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "water_notification_logs_all" ON public.water_notification_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "water_settings_all" ON public.water_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "water_audit_logs_all" ON public.water_audit_logs FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- SEED DATA: ตั้งค่าเริ่มต้น
-- ==========================================

-- ตั้งค่าระบบ
INSERT INTO public.water_settings (key, value, description) VALUES
    ('receipt_prefix', 'WTR', 'Prefix สำหรับเลขที่ใบเสร็จ'),
    ('bill_prefix', 'WB', 'Prefix สำหรับเลขที่ใบแจ้ง'),
    ('current_fiscal_year', '2569', 'ปีงบประมาณปัจจุบัน'),
    ('due_days', '30', 'จำนวนวันครบกำหนดชำระ'),
    ('org_name', 'เทศบาลตำบล', 'ชื่อหน่วยงาน'),
    ('org_address', '', 'ที่อยู่หน่วยงาน'),
    ('bank_name', 'ธนาคารกรุงไทย', 'ชื่อธนาคารสำหรับโอนเงิน'),
    ('bank_account', '', 'เลขที่บัญชี'),
    ('bank_account_name', '', 'ชื่อบัญชี'),
    ('anomaly_threshold_percent', '200', 'เปอร์เซ็นต์การใช้น้ำสูงผิดปกติ (เทียบกับค่าเฉลี่ย)'),
    ('zero_usage_months', '3', 'จำนวนเดือนต่อเนื่องที่ใช้น้ำ 0 หน่วยถือเป็นผิดปกติ'),
    ('last_receipt_no', '0', 'เลขใบเสร็จล่าสุด'),
    ('last_bill_no', '0', 'เลขใบแจ้งล่าสุด')
ON CONFLICT (key) DO NOTHING;

-- อัตราค่าน้ำเริ่มต้น - บ้านพักอาศัย
INSERT INTO public.water_tariffs (id, name, effective_from, customer_type, minimum_charge, service_charge, status)
VALUES 
    ('a0000001-0000-0000-0000-000000000001', 'อัตราค่าน้ำ ปี 2569 - บ้านพักอาศัย', '2025-10-01', 'บ้านพักอาศัย', 50, 30, 'active'),
    ('a0000001-0000-0000-0000-000000000002', 'อัตราค่าน้ำ ปี 2569 - ร้านค้า', '2025-10-01', 'ร้านค้า', 100, 50, 'active'),
    ('a0000001-0000-0000-0000-000000000003', 'อัตราค่าน้ำ ปี 2569 - หน่วยงานราชการ', '2025-10-01', 'หน่วยงานราชการ', 80, 40, 'active'),
    ('a0000001-0000-0000-0000-000000000004', 'อัตราค่าน้ำ ปี 2569 - ธุรกิจ', '2025-10-01', 'ธุรกิจ', 150, 60, 'active')
ON CONFLICT DO NOTHING;

-- อัตราขั้นบันได - บ้านพักอาศัย
INSERT INTO public.water_tariff_rates (tariff_id, min_unit, max_unit, price_per_unit, sort_order) VALUES
    ('a0000001-0000-0000-0000-000000000001', 0, 10, 8, 1),
    ('a0000001-0000-0000-0000-000000000001', 11, 20, 10, 2),
    ('a0000001-0000-0000-0000-000000000001', 21, 30, 12, 3),
    ('a0000001-0000-0000-0000-000000000001', 31, NULL, 15, 4)
ON CONFLICT DO NOTHING;

-- อัตราขั้นบันได - ร้านค้า
INSERT INTO public.water_tariff_rates (tariff_id, min_unit, max_unit, price_per_unit, sort_order) VALUES
    ('a0000001-0000-0000-0000-000000000002', 0, 10, 12, 1),
    ('a0000001-0000-0000-0000-000000000002', 11, 20, 15, 2),
    ('a0000001-0000-0000-0000-000000000002', 21, 30, 18, 3),
    ('a0000001-0000-0000-0000-000000000002', 31, NULL, 22, 4)
ON CONFLICT DO NOTHING;

-- อัตราขั้นบันได - หน่วยงานราชการ
INSERT INTO public.water_tariff_rates (tariff_id, min_unit, max_unit, price_per_unit, sort_order) VALUES
    ('a0000001-0000-0000-0000-000000000003', 0, 10, 10, 1),
    ('a0000001-0000-0000-0000-000000000003', 11, 20, 12, 2),
    ('a0000001-0000-0000-0000-000000000003', 21, 30, 14, 3),
    ('a0000001-0000-0000-0000-000000000003', 31, NULL, 17, 4)
ON CONFLICT DO NOTHING;

-- อัตราขั้นบันได - ธุรกิจ
INSERT INTO public.water_tariff_rates (tariff_id, min_unit, max_unit, price_per_unit, sort_order) VALUES
    ('a0000001-0000-0000-0000-000000000004', 0, 10, 15, 1),
    ('a0000001-0000-0000-0000-000000000004', 11, 20, 18, 2),
    ('a0000001-0000-0000-0000-000000000004', 21, 30, 22, 3),
    ('a0000001-0000-0000-0000-000000000004', 31, NULL, 28, 4)
ON CONFLICT DO NOTHING;

-- ==========================================
-- END OF WATER SUPPLY MANAGEMENT SYSTEM SQL
-- ==========================================
