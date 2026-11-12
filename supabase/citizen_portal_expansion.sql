-- =================================================================================
-- Schema for Smart Governance Citizen Portal Expansion
-- Tables: municipal_news, citizen_alerts, external_data_cache
-- =================================================================================

-- 1. Municipal News (ข่าวสารและประกาศจากเทศบาล)
CREATE TABLE IF NOT EXISTS public.municipal_news (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    category TEXT NOT NULL, -- เช่น 'ข่าวประชาสัมพันธ์', 'ประกาศเทศบาล', 'ข่าวบริการประชาชน', ฯลฯ
    summary TEXT,
    content TEXT NOT NULL,
    image_url TEXT,
    published_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    view_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for searching and filtering news
CREATE INDEX IF NOT EXISTS idx_municipal_news_status ON public.municipal_news(status);
CREATE INDEX IF NOT EXISTS idx_municipal_news_category ON public.municipal_news(category);
CREATE INDEX IF NOT EXISTS idx_municipal_news_published_at ON public.municipal_news(published_at DESC);

-- 2. Citizen Alerts (ศูนย์แจ้งเตือนประชาชน)
CREATE TABLE IF NOT EXISTS public.citizen_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    alert_type TEXT NOT NULL, -- เช่น 'ภัยพิบัติ', 'ฝนตกหนัก', 'น้ำท่วม', ฯลฯ
    severity TEXT NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'DANGER', 'CRITICAL')),
    location_name TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    start_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_at TIMESTAMPTZ,
    source TEXT,
    source_url TEXT,
    image_url TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'resolved')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying active alerts
CREATE INDEX IF NOT EXISTS idx_citizen_alerts_status ON public.citizen_alerts(status);
CREATE INDEX IF NOT EXISTS idx_citizen_alerts_severity ON public.citizen_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_citizen_alerts_active_time ON public.citizen_alerts(start_at, end_at);

-- 3. External Data Cache (สำหรับเก็บข้อมูล API เพื่อป้องกัน Rate Limit)
CREATE TABLE IF NOT EXISTS public.external_data_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data_type TEXT NOT NULL UNIQUE, -- เช่น 'weather', 'air_quality', 'flood', 'storms'
    source TEXT NOT NULL,
    data_json JSONB NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'success' CHECK (status IN ('success', 'error')),
    error_message TEXT
);

-- Index for quick lookup of valid cache
CREATE INDEX IF NOT EXISTS idx_external_data_cache_type ON public.external_data_cache(data_type);
CREATE INDEX IF NOT EXISTS idx_external_data_cache_expires ON public.external_data_cache(expires_at);

-- =================================================================================
-- Security Policies (Row Level Security)
-- =================================================================================

ALTER TABLE public.municipal_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citizen_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_data_cache ENABLE ROW LEVEL SECURITY;

-- Municipal News RLS
-- Public can only read published news
CREATE POLICY "Public can read published news" ON public.municipal_news
    FOR SELECT USING (status = 'published');

-- Authenticated (Staff/Admin) can do all
CREATE POLICY "Auth users can do all on news" ON public.municipal_news
    FOR ALL USING (auth.role() = 'authenticated');

-- Citizen Alerts RLS
-- Public can read active alerts
CREATE POLICY "Public can read active alerts" ON public.citizen_alerts
    FOR SELECT USING (status = 'active');

-- Authenticated (Staff/Admin) can do all
CREATE POLICY "Auth users can do all on alerts" ON public.citizen_alerts
    FOR ALL USING (auth.role() = 'authenticated');

-- External Data Cache RLS
-- Public can read successful cache
CREATE POLICY "Public can read cache" ON public.external_data_cache
    FOR SELECT USING (status = 'success');

-- Authenticated (Staff/Admin/Edge Functions) can do all
CREATE POLICY "Auth users can do all on cache" ON public.external_data_cache
    FOR ALL USING (auth.role() = 'authenticated');

-- Note: Edge functions usually bypass RLS if using service_role key, 
-- but this allows frontend admin tools to inspect cache if needed.

-- Functions & Triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_municipal_news_updated_at
BEFORE UPDATE ON public.municipal_news
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_citizen_alerts_updated_at
BEFORE UPDATE ON public.citizen_alerts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
