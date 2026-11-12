/**
 * digital-infrastructure.js — Core DIIS Management Service
 * Smart Governance Municipality Platform
 */

const DigitalInfraService = {
    // === MOCK DATA STORE ===
    mockRoads: [],
    mockWater: [],
    mockWaterways: [],
    mockDrainage: [],
    mockPublicLand: [],
    mockBoundaryMarkers: [],
    mockRepairs: [],
    mockPermits: [],
    mockProposals: [],
    mockWaterMeters: [],

    // === LAYER COLORS ===
    LAYER_STYLES: {
        roads: { color: '#dc2626', weight: 4, opacity: 0.8 },
        water: { color: '#0284c7', fillColor: '#38bdf8', fillOpacity: 0.6, weight: 1.5 },
        waterways: { color: '#0ea5e9', weight: 3, opacity: 0.8 },
        drainage: { color: '#22c55e', weight: 2.5, opacity: 0.7 },
        lighting: { color: '#eab308', radius: 6, fillOpacity: 0.9, weight: 1 },
        publicLand: { color: '#16a34a', fillColor: '#4ade80', fillOpacity: 0.5, weight: 1.5 },
        boundary: { color: '#8b5cf6', weight: 2, dashArray: '6, 6', fill: false },
        markers: { color: '#7c3aed', radius: 5, fillOpacity: 1, weight: 1.5 }
    },

    /**
     * คืนค่าสไตล์ของแนวเส้นทางถนนแบบไดนามิก จำแนกตามประเภทผิวจราจรและแผนพัฒนา
     * @param {Object} road ข้อมูลถนน
     */
    cachedRoadSurfaces: null,

    async loadRoadSurfaceTypesFromDB() {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            try {
                const { data, error } = await supabaseClient
                    .from('sys_settings')
                    .select('setting_value')
                    .eq('setting_key', 'diis_road_surfaces')
                    .maybeSingle();
                
                if (!error && data && data.setting_value) {
                    this.cachedRoadSurfaces = data.setting_value;
                    return this.cachedRoadSurfaces;
                }
            } catch(e) {
                console.error("Failed to load road surfaces from Supabase", e);
            }
        }
        
        // Fallback or initialization if DB fetch fails or not configured
        const stored = localStorage.getItem('diis_road_surfaces');
        if (stored) {
            try {
                this.cachedRoadSurfaces = JSON.parse(stored);
                return this.cachedRoadSurfaces;
            } catch (e) {}
        }
        
        this.cachedRoadSurfaces = [
            { name: 'คอนกรีตเสริมเหล็ก', color: '#0ea5e9' },
            { name: 'แอสฟัลต์ติก/ลาดยาง', color: '#10b981' },
            { name: 'หินคลุก/ลูกรัง', color: '#f97316' },
            { name: 'อื่นๆ', color: '#8b5cf6' },
            { name: 'ถนนดิน', color: '#78350f' }
        ];
        return this.cachedRoadSurfaces;
    },

    getRoadSurfaceTypes() {
        if (this.cachedRoadSurfaces) return this.cachedRoadSurfaces;
        return [
            { name: 'คอนกรีตเสริมเหล็ก', color: '#0ea5e9' },
            { name: 'แอสฟัลต์ติก/ลาดยาง', color: '#10b981' },
            { name: 'หินคลุก/ลูกรัง', color: '#f97316' },
            { name: 'อื่นๆ', color: '#8b5cf6' }
        ];
    },

    async saveRoadSurfaceTypes(types) {
        this.cachedRoadSurfaces = types;
        localStorage.setItem('diis_road_surfaces', JSON.stringify(types)); // fallback
        
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            try {
                const { data, error } = await supabaseClient
                    .from('sys_settings')
                    .select('id')
                    .eq('setting_key', 'diis_road_surfaces')
                    .maybeSingle();
                
                if (data) {
                    const { error: updateError } = await supabaseClient.from('sys_settings')
                        .update({ setting_value: types, updated_at: new Date().toISOString() })
                        .eq('setting_key', 'diis_road_surfaces');
                    if (updateError) console.error("Failed to update road surfaces in Supabase", updateError);
                } else {
                    const { error: insertError } = await supabaseClient.from('sys_settings')
                        .insert([{ setting_key: 'diis_road_surfaces', setting_value: types }]);
                    if (insertError) console.error("Failed to insert road surfaces to Supabase", insertError);
                }
            } catch(e) {
                console.error("Failed to save road surfaces to Supabase exception", e);
            }
        }
    },

    getRoadStyle(road) {
        let color = '#3b82f6'; // สีน้ำเงินมาตรฐาน
        
        if (road.road_type === 'ถนนในแผนพัฒนา') {
            color = '#eab308'; // สีเหลืองสว่างพรีเมียม (Vibrant Golden Yellow)
        } else {
            const surface = road.surface_type || '';
            const surfaceTypes = this.getRoadSurfaceTypes();
            const matchedSurface = surfaceTypes.find(t => surface.includes(t.name) || t.name.includes(surface));
            if (matchedSurface) {
                color = matchedSurface.color;
            } else {
                // Fallback for unmapped custom names, try to find 'อื่นๆ'
                const otherSurface = surfaceTypes.find(t => t.name === 'อื่นๆ');
                color = otherSurface ? otherSurface.color : '#8b5cf6'; 
            }
        }
        
        return {
            color: color,
            weight: 10,
            opacity: 0.9,
            lineCap: 'round',
            lineJoin: 'round'
        };
    },

    // === INITS & LOADERS (Supabase Wrapper with Mock Fallbacks) ===
    async getRoads() {
        if (typeof GISSpatialService !== 'undefined') {
            return await GISSpatialService.loadRoads();
        }
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { data, error } = await supabaseClient.from('infra_roads').select('*').order('created_at', { ascending: false });
            if (!error && data) return data;
        }
        return this.mockRoads;
    },

    async getWater() {
        if (typeof WaterSpatialService !== 'undefined') {
            return await WaterSpatialService.loadAssets('res');
        }
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { data, error } = await supabaseClient.from('infra_water_resources').select('*').order('created_at', { ascending: false });
            if (!error && data) return data;
        }
        return this.mockWater;
    },

    async getWaterways() {
        if (typeof WaterSpatialService !== 'undefined') {
            return await WaterSpatialService.loadAssets('way');
        }
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { data, error } = await supabaseClient.from('infra_waterways').select('*').order('created_at', { ascending: false });
            if (!error && data) return data;
        }
        return this.mockWaterways;
    },

    async getDrainage() {
        if (typeof WaterSpatialService !== 'undefined') {
            return await WaterSpatialService.loadAssets('drain');
        }
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { data, error } = await supabaseClient.from('infra_drainage_assets').select('*').order('created_at', { ascending: false });
            if (!error && data) return data;
        }
        return this.mockDrainage;
    },

    async getPublicLand() {
        if (typeof PublicLandSpatialService !== 'undefined') {
            return await PublicLandSpatialService.loadPublicLands();
        }
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { data, error } = await supabaseClient.from('infra_public_lands').select('*').order('created_at', { ascending: false });
            if (!error && data) return data;
        }
        return this.mockPublicLand;
    },

    async getBoundaryMarkers() {
        if (typeof BoundarySpatialService !== 'undefined') {
            return await BoundarySpatialService.loadMarkers();
        }
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { data, error } = await supabaseClient.from('infra_boundary_markers').select('*').order('created_at', { ascending: false });
            if (!error && data) return data;
        }
        return this.mockBoundaryMarkers;
    },

    async getRepairs() {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { data, error } = await supabaseClient.from('infra_repairs').select('*').order('created_at', { ascending: false });
            if (!error && data) return data;
        }
        return this.mockRepairs;
    },

    async getWaterMeters() {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { data, error } = await supabaseClient.from('infra_water_meters').select('*').order('created_at', { ascending: false });
            if (!error && data) return data;
        }
        return this.mockWaterMeters;
    },

    async getPermits() {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { data, error } = await supabaseClient.from('infra_permits').select('*').order('created_at', { ascending: false });
            if (!error && data) return data;
        }
        return this.mockPermits;
    },

    async getProposals() {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { data, error } = await supabaseClient.from('infra_grant_proposals').select('*').order('created_at', { ascending: false });
            if (!error && data) return data;
        }
        return this.mockProposals;
    },

    // === SAVE METHODS ===
    async saveRoad(road) {
        if (typeof GISSpatialService !== 'undefined') {
            return await GISSpatialService.saveGeometry(road);
        }
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const isNew = !road.id;
            const action = isNew 
                ? supabaseClient.from('infra_roads').insert([road])
                : supabaseClient.from('infra_roads').update(road).eq('id', road.id);
            const { data, error } = await action.select();
            if (error) throw error;
            return data[0];
        } else {
            if (!road.id) {
                road.id = String(this.mockRoads.length + 1);
                this.mockRoads.push(road);
            } else {
                const idx = this.mockRoads.findIndex(r => r.id === road.id);
                if (idx !== -1) this.mockRoads[idx] = road;
            }
            return road;
        }
    },

    async saveWaterMeter(meter) {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const isNew = !meter.id;
            if (isNew) delete meter.id;
            const action = isNew 
                ? supabaseClient.from('infra_water_meters').insert([meter])
                : supabaseClient.from('infra_water_meters').update(meter).eq('id', meter.id);
            const { data, error } = await action.select();
            if (error) throw error;
            return data[0];
        } else {
            if (!meter.id) {
                meter.id = String(this.mockWaterMeters.length + 1);
                this.mockWaterMeters.push(meter);
            } else {
                const idx = this.mockWaterMeters.findIndex(m => m.id === meter.id);
                if (idx !== -1) this.mockWaterMeters[idx] = meter;
            }
            return meter;
        }
    },

    async deleteWaterMeter(id) {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { error } = await supabaseClient.from('infra_water_meters').delete().eq('id', id);
            if (error) throw error;
            return true;
        } else {
            const idx = this.mockWaterMeters.findIndex(m => m.id === id);
            if (idx !== -1) {
                this.mockWaterMeters.splice(idx, 1);
            }
            return true;
        }
    },

    async saveRepair(rep) {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const isNew = !rep.id;
            if (isNew) delete rep.repair_code;
            const action = isNew 
                ? supabaseClient.from('infra_repairs').insert([rep])
                : supabaseClient.from('infra_repairs').update(rep).eq('id', rep.id);
            const { data, error } = await action.select();
            if (error) throw error;
            return data[0];
        } else {
            if (!rep.id) {
                rep.id = String(this.mockRepairs.length + 1);
                rep.repair_code = `INF-REP-${String(this.mockRepairs.length+1).padStart(4,'0')}/2569`;
                rep.created_at = new Date().toISOString();
                this.mockRepairs.push(rep);
            } else {
                const idx = this.mockRepairs.findIndex(r => r.id === rep.id);
                if (idx !== -1) this.mockRepairs[idx] = { ...this.mockRepairs[idx], ...rep };
            }
            return rep;
        }
    },

    async savePermit(pmt) {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const isNew = !pmt.id;
            if (isNew) delete pmt.permit_code;
            const action = isNew 
                ? supabaseClient.from('infra_permits').insert([pmt])
                : supabaseClient.from('infra_permits').update(pmt).eq('id', pmt.id);
            const { data, error } = await action.select();
            if (error) throw error;
            return data[0];
        } else {
            if (!pmt.id) {
                pmt.id = String(this.mockPermits.length + 1);
                pmt.permit_code = `EP-INF-${String(this.mockPermits.length+1).padStart(4,'0')}/2569`;
                pmt.created_at = new Date().toISOString();
                this.mockPermits.push(pmt);
            } else {
                const idx = this.mockPermits.findIndex(p => p.id === pmt.id);
                if (idx !== -1) this.mockPermits[idx] = { ...this.mockPermits[idx], ...pmt };
            }
            return pmt;
        }
    },

    async saveProposal(prop) {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const isNew = !prop.id;
            const action = isNew 
                ? supabaseClient.from('infra_grant_proposals').insert([prop])
                : supabaseClient.from('infra_grant_proposals').update(prop).eq('id', prop.id);
            const { data, error } = await action.select();
            if (error) throw error;
            return data[0];
        } else {
            if (!prop.id) {
                prop.id = String(this.mockProposals.length + 1);
                prop.created_at = new Date().toISOString();
                this.mockProposals.push(prop);
            } else {
                const idx = this.mockProposals.findIndex(p => p.id === prop.id);
                if (idx !== -1) this.mockProposals[idx] = { ...this.mockProposals[idx], ...prop };
            }
            return prop;
        }
    },

    // === AI ENGINEERING ASSISTANT INTEGRATION ===
    aiAnalyze(requestType, payload) {
        // กฎการจำลองสมองกลวิศวกรส่วนท้องถิ่น (Local Engineering Expert Rules)
        const timestamp = new Date().toLocaleTimeString('th-TH');
        
        switch (requestType) {
            case 'road_scoring':
                // ประเมินคะแนนสภาพถนน
                const r = payload;
                let score = 95;
                let remarks = [];
                if (r.status === 'poor') { score -= 40; remarks.push('ผิวทางชำรุดหนักเป็นหลุมบ่อ'); }
                if (r.status === 'fair') { score -= 15; remarks.push('ผิวทางชำรุดเล็กน้อยหรือแตกลายงา'); }
                if (r.surface_type === 'หินคลุก/ลูกรัง') { score -= 20; remarks.push('สภาพทางไม่มีการก่อสร้างรองรับแรงเฉือนสูง'); }
                if (r.length_m > 2000 && r.width < 5) { score -= 10; remarks.push('รูปทรงแคบและยาว ความหนาแน่นจราจรอาจล้นไหล่ทาง'); }
                
                return {
                    success: true,
                    timestamp,
                    result: {
                        score: Math.max(10, score),
                        grade: score >= 80 ? 'A (ดีเยี่ยม)' : score >= 60 ? 'B (ดี)' : score >= 40 ? 'C (ปานกลาง)' : 'D (ชำรุดควรซ่อมด่วน)',
                        recommendation: score < 50 
                            ? '🚨 แนะนำจัดทำบรรจุเข้าแผนพัฒนา 3 ปี และเสนอขอ "งบอุดหนุนเฉพาะกิจ" เพื่อยกระดับผิวทางเป็นคอนกรีตเสริมเหล็ก คสล. โดยทันที'
                            : '🟢 อยู่ในสภาพใช้งานได้ดี แนะนำวางระบบตรวจสอบการอุดตันของรางระบายน้ำสองข้างทางตามรอบ 6 เดือน',
                        reasons: remarks
                    }
                };
                
            case 'maintenance_predict':
                // พยากรณ์รอบการซ่อมแซมและบำรุงล่วงหน้า
                const age = payload.construction_year ? (2569 - payload.construction_year) : 5;
                const roadType = payload.surface_type || 'คอนกรีตเสริมเหล็ก';
                let decayRate = 3.5; // เปอร์เซ็นต์ความเสื่อมต่อปี
                if (roadType === 'หินคลุก/ลูกรัง') decayRate = 15;
                else if (roadType === 'แอสฟัลต์ติก/ลาดยาง') decayRate = 6.5;

                const expectedLife = roadType === 'คอนกรีตเสริมเหล็ก' ? 20 : roadType === 'แอสฟัลต์ติก/ลาดยาง' ? 10 : 3;
                const remainingLife = Math.max(0, expectedLife - age);
                const threatIndex = Math.min(100, Math.round((age / expectedLife) * 100));

                return {
                    success: true,
                    timestamp,
                    result: {
                        age_years: age,
                        expected_lifespan: expectedLife,
                        remaining_years: remainingLife,
                        threat_index: `${threatIndex}%`,
                        next_action_year: 2569 + Math.round(remainingLife),
                        risk_level: threatIndex >= 80 ? 'วิกฤต (High Risk)' : threatIndex >= 50 ? 'ปานกลาง (Medium Risk)' : 'ต่ำ (Low Risk)',
                        forecast_text: threatIndex >= 80
                            ? `⚠️ คาดการณ์ว่าถนน ${payload.road_name} มีอายุงานใกล้เคียงขีดจำกัดสูงสุดแล้ว สภาพทางจะเสื่อมโทรมทวีคูณในช่วงฤดูมรสุมที่จะถึงนี้ ควรซ่อมแซมใหญ่ภายในปีนี้`
                            : `✅ ถนนยังคงอยู่ในระยะการรักษาเสถียรภาพ คาดการณ์กำหนดการขูดลอกปูผิวหน้าใหม่ (Overlay) ในปี พ.ศ. ${2569 + Math.round(remainingLife)}`
                    }
                };

            case 'budget_optimization':
                // แนะนำความเร่งด่วนในการกระจายงบประมาณ
                const proposals = payload || [];
                if (!proposals.length) return { success: false, text: 'ไม่พบรายการคำเสนอโครงการเพื่อทำการคำนวณสัดส่วนงบประมาณ' };
                
                const analyzedProposals = proposals.map(p => {
                    let priorityScore = 50;
                    let desc = '';
                    if (p.project_name.includes('ระบายน้ำ') || p.project_name.includes('น้ำท่วม')) {
                        priorityScore += 30;
                        desc += '+30 (ป้องกันอุทกภัยชุมชน/ความเดือดร้อนฉับพลัน) ';
                    }
                    if (p.budget_amount < 500000) {
                        priorityScore += 10;
                        desc += '+10 (ขนาดงบประมาณเหมาะสมอนุมัติเร็ว) ';
                    } else if (p.budget_amount > 2000000) {
                        priorityScore -= 10;
                        desc += '-10 (วงเงินขนาดใหญ่ควรแบ่งเฟส) ';
                    }
                    if (p.project_justification && p.project_justification.length > 50) {
                        priorityScore += 10;
                        desc += '+10 (ข้อมูลหลักการความคุ้มค่าครบถ้วน)';
                    }
                    return {
                        id: p.id,
                        project_name: p.project_name,
                        budget: p.budget_amount,
                        score: priorityScore,
                        score_reasons: desc,
                        priority_rank: priorityScore >= 80 ? 'เร่งด่วนสูงสุด (Rank A)' : priorityScore >= 65 ? 'เร่งด่วนปานกลาง (Rank B)' : 'ลำดับรอง (Rank C)'
                    };
                });
                
                // จัดอันดับตามคะแนนความเร่งด่วน
                analyzedProposals.sort((a,b) => b.score - a.score);

                return {
                    success: true,
                    timestamp,
                    result: {
                        total_budget_requested: proposals.reduce((acc,curr) => acc + curr.budget_amount, 0),
                        prioritized_list: analyzedProposals,
                        policy_recommendation: '💡 ข้อเสนอเชิงนโยบาย: งบประมาณเงินอุดหนุนเฉพาะกิจในปีนี้ควรเน้นจัดสรรไปที่ระบบระบายน้ำและการยกระดับเส้นทางสัญจรในหมู่บ้านที่มีประชากรหนาแน่นสูงก่อน เพื่อให้สอดคล้องกับดัชนีร้องเรียนสะสมในระบบร้องทุกข์ของสำนักปลัด'
                    }
                };

            default:
                return { success: false, text: 'คำขอประมวลผลระบบไม่ถูกต้อง' };
        }
    }
};

// ส่งออกเข้า Window Context สำหรับการเรียกใช้นอกโมดูล
window.DigitalInfraService = DigitalInfraService;
console.log("DIIS Core Service Loaded with Mock Database & AI Module.");
