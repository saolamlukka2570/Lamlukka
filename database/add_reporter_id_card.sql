ALTER TABLE public.electric_repairs ADD COLUMN IF NOT EXISTS reporter_id_card VARCHAR(20);
COMMENT ON COLUMN public.electric_repairs.reporter_id_card IS 'เลขประจำตัวประชาชน 13 หลักของผู้แจ้ง';
