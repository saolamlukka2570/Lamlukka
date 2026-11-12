// assets/js/services/news-service.js

const NewsService = {
    // 1. Citizen Alerts (ศูนย์แจ้งเตือนประชาชน)
    async getActiveAlerts() {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            try {
                const { data, error } = await supabaseClient
                    .from('citizen_alerts')
                    .select('*')
                    .eq('status', 'active')
                    .order('severity', { ascending: false }) // Sort DANGER > WARNING > INFO
                    .order('created_at', { ascending: false });
                
                if (error) throw error;
                return data;
            } catch (err) {
                console.error("Supabase error fetching alerts:", err);
                return this.getMockAlerts();
            }
        }
        return this.getMockAlerts();
    },

    getMockAlerts() {
        return [
            {
                id: '1',
                title: 'แจ้งเตือนฝนตกหนัก',
                message: 'มีฝนตกหนักในพื้นที่ โปรดระวังน้ำท่วมขังบริเวณถนนและพื้นที่ลุ่มต่ำ',
                severity: 'WARNING', // INFO, WARNING, DANGER, CRITICAL
                location_name: 'หมู่ 1, หมู่ 3 และหมู่ 5',
                start_at: new Date().toISOString(),
                end_at: new Date(Date.now() + 5 * 3600000).toISOString(),
                source: 'สำนักปลัดเทศบาล'
            },
            {
                id: '2',
                title: 'ปิดปรับปรุงระบบประปาชั่วคราว',
                message: 'การประปาจะทำการตัดต่อท่อเมน ส่งผลให้น้ำไหลอ่อนถึงไม่ไหล',
                severity: 'INFO',
                location_name: 'เขตเทศบาลทั้งหมด',
                start_at: new Date().toISOString(),
                end_at: new Date(Date.now() + 2 * 3600000).toISOString(),
                source: 'กองช่าง'
            }
        ];
    },

    // 2. Municipal News (ข่าวสารและประกาศเทศบาล)
    async getPublishedNews(category = null, limit = 6) {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            try {
                let query = supabaseClient
                    .from('municipal_news')
                    .select('*')
                    .eq('status', 'published')
                    .order('published_at', { ascending: false })
                    .limit(limit);
                
                if (category && category !== 'ทั้งหมด') {
                    query = query.eq('category', category);
                }

                const { data, error } = await query;
                if (error) throw error;
                return data;
            } catch (err) {
                console.error("Supabase error fetching news:", err);
                return this.getMockNews(category);
            }
        }
        return this.getMockNews(category);
    },

    getMockNews(category = null) {
        const allNews = [
            {
                id: '1',
                title: 'เชิญชวนประชาชนร่วมโครงการคัดแยกขยะ',
                category: 'ข่าวโครงการ',
                summary: 'เทศบาลจัดโครงการรณรงค์คัดแยกขยะต้นทาง แลกรับสิทธิประโยชน์มากมาย',
                published_at: new Date(Date.now() - 86400000).toISOString(),
                image_url: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=400&q=80',
                view_count: 125
            },
            {
                id: '2',
                title: 'ประกาศขยายเวลาชำระภาษีที่ดินและสิ่งปลูกสร้าง',
                category: 'ข่าวภาษี',
                summary: 'แจ้งขยายเวลาชำระภาษีที่ดินและสิ่งปลูกสร้าง ประจำปี 2569 ออกไปจนถึงสิ้นเดือนกรกฎาคม',
                published_at: new Date(Date.now() - 2 * 86400000).toISOString(),
                image_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=400&q=80',
                view_count: 432
            },
            {
                id: '3',
                title: 'ตารางฉีดวัคซีนป้องกันไข้หวัดใหญ่ ประจำปี',
                category: 'ข่าวบริการ',
                summary: 'สำหรับกลุ่มเสี่ยงและผู้สูงอายุ สามารถเข้ารับบริการได้ที่ รพ.สต. ในเขตพื้นที่',
                published_at: new Date(Date.now() - 5 * 86400000).toISOString(),
                image_url: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=400&q=80',
                view_count: 210
            }
        ];

        if (category && category !== 'ทั้งหมด') {
            return allNews.filter(n => n.category === category);
        }
        return allNews;
    }
};
