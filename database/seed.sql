-- ==========================================
-- SMART GOVERNANCE MUNICIPALITY PLATFORM
-- SEED DATA (For Testing)
-- ==========================================

-- Insert Roles
INSERT INTO public.roles (name, description) VALUES
('Super Admin', 'Full access to all modules and settings'),
('Executive', 'View only access to all dashboards'),
('Department Head', 'Full access to specific department'),
('Officer', 'Standard access to specific department'),
('Field Staff', 'Mobile access for specific tasks (e.g. meter reading)'),
('Citizen', 'Public portal access');

-- Note: In a real Supabase environment, users must be created via the Auth API first.
-- We are skipping public.users direct inserts here because they require valid auth.users(id).

-- Insert Mock Citizens
INSERT INTO public.citizens (national_id, first_name, last_name, date_of_birth, gender, mobile_number) VALUES
('1100200300400', 'สมชาย', 'ใจดี', '1980-05-15', 'Male', '0812345678'),
('2200300400500', 'สมหญิง', 'รักสะอาด', '1985-08-20', 'Female', '0898765432');

-- Insert Mock Households
-- Assuming citizen IDs will be retrieved and linked correctly in application code.
-- Using subqueries for demonstration to link the first citizen as head of household.
INSERT INTO public.households (household_number, address, zone) VALUES
('12/1', 'หมู่ 1 ต.หน้าเมือง', 'โซน 1'),
('15/5', 'หมู่ 1 ต.หน้าเมือง', 'โซน 1');

-- Insert Mock Properties (For Tax Map)
INSERT INTO public.properties (parcel_id, property_type, area_sq_meters, assessed_value, latitude, longitude) VALUES
('04E001', 'Land', 1600.00, 2500000.00, 13.737, 100.523),
('04E002', 'Building', 200.00, 1500000.00, 13.736, 100.524);

-- Insert Mock Tax Records
-- Linking to property 04E001
INSERT INTO public.tax_records (property_id, tax_year, amount_due, status)
SELECT id, 2026, 7500.00, 'Pending' FROM public.properties WHERE parcel_id = '04E001';

-- Insert Mock Waste Accounts
-- Linking to household 12/1
INSERT INTO public.waste_accounts (household_id, category, monthly_fee, status)
SELECT id, 'Household', 40.00, 'Active' FROM public.households WHERE household_number = '12/1';
