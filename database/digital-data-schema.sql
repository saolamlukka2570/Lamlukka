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
