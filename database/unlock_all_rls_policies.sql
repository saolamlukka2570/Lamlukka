-- =========================================================================
-- ปลดล็อกสิทธิ์ Row-Level Security (RLS) สำหรับทุกตารางใน Schema public
-- วิธีใช้: คัดลอกโค้ดทั้งหมดนี้ไปวางใน Supabase Dashboard -> SQL Editor แล้วกด Run
-- =========================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename NOT IN ('spatial_ref_sys', 'geometry_columns', 'geography_columns')
    ) LOOP
        -- เปิดใช้งาน RLS และสร้าง Policy อนุญาตทุกการทำงาน (SELECT, INSERT, UPDATE, DELETE) สำหรับ anon และ authenticated
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS "allow_all_public_access" ON public.%I;', r.tablename);
        EXECUTE format(
            'CREATE POLICY "allow_all_public_access" ON public.%I FOR ALL TO public USING (true) WITH CHECK (true);',
            r.tablename
        );
        EXECUTE format('GRANT ALL ON TABLE public.%I TO anon, authenticated, service_role;', r.tablename);
    END LOOP;
END $$;

-- อนุญาตสิทธิ์การใช้งาน Sequences ทั้งหมด (สำหรับคอลัมน์ SERIAL / Auto-increment)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
