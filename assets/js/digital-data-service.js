/**
 * digital-data-service.js — Core Digital Data Center Service
 * Smart Governance Municipality Platform
 */
const DigitalDataService = {
    /**
     * Fetch all rows from a Supabase table by paging in chunks of 1,000
     * to bypass PostgREST's default 1,000-row limit.
     */
    async _fetchAll(table, selectCols = '*', filterFn = null) {
        const PAGE_SIZE = 1000;
        const buildQuery = (withCount = false) => {
            let q = supabaseClient
                .from(table)
                .select(selectCols, withCount ? { count: 'exact' } : undefined)
                .order('id', { ascending: true });
            if (filterFn) q = filterFn(q);
            return q;
        };

        const firstRes = await buildQuery(true).range(0, PAGE_SIZE - 1);
        if (firstRes.error) throw firstRes.error;

        let allData = firstRes.data || [];
        const totalCount = typeof firstRes.count === 'number' ? firstRes.count : allData.length;

        if (totalCount <= PAGE_SIZE || allData.length < PAGE_SIZE) {
            return allData;
        }

        const totalPages = Math.ceil(totalCount / PAGE_SIZE);
        const pageIndices = [];
        for (let p = 1; p < totalPages; p++) {
            pageIndices.push(p);
        }

        const BATCH_SIZE = 6;
        for (let i = 0; i < pageIndices.length; i += BATCH_SIZE) {
            const batch = pageIndices.slice(i, i + BATCH_SIZE);
            const results = await Promise.all(
                batch.map(p => {
                    const from = p * PAGE_SIZE;
                    const to = from + PAGE_SIZE - 1;
                    return buildQuery(false).range(from, to);
                })
            );
            results.forEach(r => {
                if (r.error) throw r.error;
                if (r.data && r.data.length) {
                    allData = allData.concat(r.data);
                }
            });
        }

        return allData;
    },

    async getDashboardStats() {
        if (!supabaseClient) return this._getMockStats();
        try {
            const [
                households,
                members,
                poorList,
                elderlyList,
                disabledList,
                bedriddenList,
                newbornList
            ] = await Promise.all([
                this._fetchAll('dd_households', 'id, poverty_status, jp2t_failed, village_no, village_name'),
                this._fetchAll('dd_household_members', 'id, household_id, gender, age, birth_date'),
                this._fetchAll('dd_poor_households', 'id, household_id, jp2t_status'),
                this._fetchAll('dd_elderly', 'id, household_member_id'),
                this._fetchAll('dd_disabled_persons', 'id, household_member_id'),
                this._fetchAll('dd_bedridden_patients', 'id, household_member_id'),
                this._fetchAll('dd_newborns', 'id, household_member_id')
            ]);

            const elderlySet = new Set((elderlyList || []).map(x => x.household_member_id));
            const disabledSet = new Set((disabledList || []).map(x => x.household_member_id));
            const bedriddenSet = new Set((bedriddenList || []).map(x => x.household_member_id));
            const newbornSet = new Set((newbornList || []).map(x => x.household_member_id));

            const poorByHouse = {};
            (poorList || []).forEach(p => {
                if (!poorByHouse[p.household_id]) poorByHouse[p.household_id] = [];
                poorByHouse[p.household_id].push(p);
            });

            const s = { 
                totalHouseholds: households.length, 
                totalPopulation: members.length, 
                totalMale: 0, 
                totalFemale: 0, 
                totalElderly: 0, 
                totalDisabled: 0, 
                totalBedridden: 0, 
                totalNewborn: 0, 
                totalPoor: 0, 
                totalJP2TFailed: 0, 
                villageBreakdown: {} 
            };
            
            const currentYear = new Date().getFullYear();
            const membersByHouse = {};
            members.forEach(m => {
                if (m.gender === 'ชาย') s.totalMale++;
                else if (m.gender === 'หญิง') s.totalFemale++;
                
                let effAge = (m.age !== null && m.age !== undefined) ? Number(m.age) : null;
                if (effAge === null && m.birth_date) {
                    const by = parseInt(String(m.birth_date).split('-')[0], 10);
                    if (!isNaN(by) && by > 1850 && by <= currentYear) effAge = currentYear - by;
                }

                if (newbornSet.has(m.id)) s.totalNewborn++;
                if ((effAge !== null && effAge >= 60) || elderlySet.has(m.id)) s.totalElderly++;
                if (disabledSet.has(m.id)) s.totalDisabled++;
                if (bedriddenSet.has(m.id)) s.totalBedridden++;
                
                if (!membersByHouse[m.household_id]) membersByHouse[m.household_id] = { pop: 0, m: 0, f: 0 };
                membersByHouse[m.household_id].pop++;
                if (m.gender === 'ชาย') membersByHouse[m.household_id].m++;
                else if (m.gender === 'หญิง') membersByHouse[m.household_id].f++;
            });
            
            households.forEach(h => {
                const pRecords = poorByHouse[h.id];
                if (pRecords && pRecords.length > 0) {
                    s.totalPoor++; 
                    if (pRecords.some(p => p.jp2t_status)) {
                        s.totalJP2TFailed++;
                    }
                } else {
                    if (h.poverty_status) s.totalPoor++;
                    if (h.jp2t_failed) s.totalJP2TFailed++;
                }
                
                const k = `หมู่ ${h.village_no||'?'} ${h.village_name||''}`.trim();
                if (!s.villageBreakdown[k]) s.villageBreakdown[k] = {households:0, population:0, male:0, female:0};
                
                s.villageBreakdown[k].households++; 
                const mStats = membersByHouse[h.id] || { pop:0, m:0, f:0 };
                s.villageBreakdown[k].population += mStats.pop;
                s.villageBreakdown[k].male += mStats.m;
                s.villageBreakdown[k].female += mStats.f;
            });
            
            return s;
        } catch(e) { console.error('getDashboardStats:',e); return this._getMockStats(); }
    },

    async getHouseholdMap(filters={}) {
        if (!supabaseClient) return this._getMockMapData();
        try {
            const [
                households,
                members,
                poorList,
                elderlyList,
                disabledList,
                bedriddenList,
                newbornList
            ] = await Promise.all([
                this._fetchAll(
                    'dd_households',
                    'id,house_code,tr14_number,house_number,village_no,village_name,latitude,longitude,owner_name,poverty_status,total_members',
                    q => filters.village_no ? q.eq('village_no', filters.village_no) : q
                ),
                this._fetchAll('dd_household_members', 'id,household_id,prefix,first_name,last_name,is_head,age'),
                this._fetchAll('dd_poor_households', 'id,household_id'),
                this._fetchAll('dd_elderly', 'id,household_member_id'),
                this._fetchAll('dd_disabled_persons', 'id,household_member_id'),
                this._fetchAll('dd_bedridden_patients', 'id,household_member_id'),
                this._fetchAll('dd_newborns', 'id,household_member_id')
            ]);

            const poorHouseSet = new Set((poorList || []).map(p => p.household_id));
            const elderlySet = new Set((elderlyList || []).map(x => x.household_member_id));
            const disabledSet = new Set((disabledList || []).map(x => x.household_member_id));
            const bedriddenSet = new Set((bedriddenList || []).map(x => x.household_member_id));
            const newbornSet = new Set((newbornList || []).map(x => x.household_member_id));

            const membersByHouse = {};
            (members || []).forEach(m => {
                if (!m.household_id) return;
                if (!membersByHouse[m.household_id]) membersByHouse[m.household_id] = [];
                membersByHouse[m.household_id].push(m);
            });

            let result = households || [];
            result.forEach(h => {
                const hMembers = membersByHouse[h.id] || [];
                h.total_members = hMembers.length;
                h.elderly_count = 0;
                h.disabled_count = 0;
                h.bedridden_count = 0;
                h.newborn_count = 0;
                h.elderly_names = [];
                h.disabled_names = [];
                h.bedridden_names = [];
                h.newborn_names = [];
                if (poorHouseSet.has(h.id)) {
                    h.poverty_status = 'ยากจน';
                }
                if (hMembers.length > 0) {
                    let head = hMembers.find(m => m.is_head);
                    if (!head) head = hMembers[0];
                    if (!h.owner_name && head) {
                        h.owner_name = `${head.prefix || ''} ${head.first_name || ''} ${head.last_name || ''}`.trim();
                    }
                    hMembers.forEach(m => {
                        const fullName = `${m.prefix || ''}${m.first_name || ''} ${m.last_name || ''}`.trim();
                        if (elderlySet.has(m.id) || (m.age !== null && m.age !== undefined && Number(m.age) >= 60)) {
                            h.elderly_count++;
                            h.elderly_names.push(fullName);
                        }
                        if (disabledSet.has(m.id)) { h.disabled_count++; h.disabled_names.push(fullName); }
                        if (bedriddenSet.has(m.id)) { h.bedridden_count++; h.bedridden_names.push(fullName); }
                        if (newbornSet.has(m.id)) { h.newborn_count++; h.newborn_names.push(fullName); }
                    });
                }
            });

            result.sort((a, b) => {
                if (a.village_no !== b.village_no) return (a.village_no || 0) - (b.village_no || 0);
                const parseHouseNo = (hn) => {
                    if (!hn) return [0, 0];
                    const parts = String(hn).split('/');
                    return [parseInt(parts[0]) || 0, parseInt(parts[1]) || 0];
                };
                const [a1, a2] = parseHouseNo(a.house_number);
                const [b1, b2] = parseHouseNo(b.house_number);
                if (a1 !== b1) return a1 - b1;
                return a2 - b2;
            });
            return result;
        } catch(e) { console.error('getHouseholdMap:',e); return this._getMockMapData(); }
    },

    async getAllPopulation(filters={}) {
        if (!supabaseClient) {
            return this._getMockProfile().members.map(m => {
                return { ...m, dd_households: { house_number: '45/3', village_no: 2, poverty_status: true } };
            });
        }
        try {
            const [membersData, householdsData, elderlyData, disabledData] = await Promise.all([
                this._fetchAll('dd_household_members', 'id, prefix, first_name, last_name, age, gender, citizen_id, household_id'),
                this._fetchAll('dd_households', 'id, house_number, village_no, poverty_status'),
                this._fetchAll('dd_elderly', 'id, household_member_id, dependency_level'),
                this._fetchAll('dd_disabled_persons', 'id, household_member_id')
            ]);
            
            const householdMap = {};
            (householdsData || []).forEach(h => { householdMap[h.id] = h; });

            const elderlyMap = {};
            (elderlyData || []).forEach(e => { elderlyMap[e.household_member_id] = e; });
            
            const disabledMap = {};
            (disabledData || []).forEach(d => { disabledMap[d.household_member_id] = d; });
            
            let result = (membersData || []).map(m => {
                return {
                    ...m,
                    dd_households: householdMap[m.household_id] || null,
                    dd_elderly: elderlyMap[m.id] ? [elderlyMap[m.id]] : [],
                    dd_disabled_persons: disabledMap[m.id] ? [disabledMap[m.id]] : []
                };
            });
            
            if (filters.village_no) {
                result = result.filter(m => m.dd_households && String(m.dd_households.village_no) === String(filters.village_no));
            }
            
            result.sort((a, b) => {
                const ha = a.dd_households || {};
                const hb = b.dd_households || {};
                if (ha.village_no !== hb.village_no) return (ha.village_no || 0) - (hb.village_no || 0);
                const parseHouseNo = (hn) => {
                    if (!hn) return [0, 0];
                    const parts = String(hn).split('/');
                    return [parseInt(parts[0]) || 0, parseInt(parts[1]) || 0];
                };
                const [a1, a2] = parseHouseNo(ha.house_number);
                const [b1, b2] = parseHouseNo(hb.house_number);
                if (a1 !== b1) return a1 - b1;
                return a2 - b2;
            });
            return result;
        } catch(e) { console.error('getAllPopulation:',e); return []; }
    },

    async getHouseholdProfile(id) {
        if (!supabaseClient) return this._getMockProfile();
        try {
            const {data:h} = await supabaseClient.from('dd_households').select('*').eq('id',id).single();
            const {data:m} = await supabaseClient.from('dd_household_members').select(`
                *, 
                dd_elderly(*), 
                dd_disabled_persons(*),
                dd_bedridden_patients(*),
                dd_newborns(*)
            `).eq('household_id',id).order('is_head',{ascending:false});
            
            h.members = (m || []).map(mem => {
                return {
                    ...mem,
                    elderly: mem.dd_elderly && mem.dd_elderly.length > 0 ? mem.dd_elderly[0] : null,
                    disabled: mem.dd_disabled_persons && mem.dd_disabled_persons.length > 0 ? mem.dd_disabled_persons[0] : null,
                    bedridden: mem.dd_bedridden_patients && mem.dd_bedridden_patients.length > 0 ? mem.dd_bedridden_patients[0] : null,
                    newborn: mem.dd_newborns && mem.dd_newborns.length > 0 ? mem.dd_newborns[0] : null
                };
            });
            
            // Dynamically calculate stats to ensure they are always accurate
            h.total_members = h.members.length;
            h.male_count = h.members.filter(mem => mem.gender === 'ชาย').length;
            h.female_count = h.members.filter(mem => mem.gender === 'หญิง').length;
            h.elderly_count = h.members.filter(mem => mem.age >= 60 || mem.elderly).length;
            h.disabled_count = h.members.filter(mem => mem.disabled).length;
            h.bedridden_count = h.members.filter(mem => mem.bedridden).length;
            h.newborn_count = h.members.filter(mem => mem.age !== null && mem.age <= 3).length; // 0-3 years
            
            return h;
        } catch(e) { console.error('getHouseholdProfile:',e); return this._getMockProfile(); }
    },

    async getPopulationAnalytics() {
        if (!supabaseClient) return this._getMockAnalytics();
        try {
            const members = await this._fetchAll('dd_household_members', 'id, age, birth_date, gender');
            const currentYear = new Date().getFullYear();
            const ag={'0-5':{m:0,f:0},'6-14':{m:0,f:0},'15-24':{m:0,f:0},'25-59':{m:0,f:0},'60+':{m:0,f:0}};
            (members||[]).forEach(r => {
                let effAge = (r.age !== null && r.age !== undefined) ? Number(r.age) : null;
                if (effAge === null && r.birth_date) {
                    const by = parseInt(String(r.birth_date).split('-')[0], 10);
                    if (!isNaN(by) && by > 1850 && by <= currentYear) effAge = currentYear - by;
                }
                if (effAge === null || isNaN(effAge)) return;
                let g='25-59'; if(effAge<6)g='0-5'; else if(effAge<15)g='6-14'; else if(effAge<25)g='15-24'; else if(effAge>=60)g='60+';
                if(r.gender==='ชาย') ag[g].m++; else if(r.gender==='หญิง') ag[g].f++;
            });
            return { ageDistribution:ag, totalMembers:members?.length||0 };
        } catch(e) { console.error('getPopulationAnalytics:',e); return this._getMockAnalytics(); }
    },

    async searchCitizen(query) {
        if(!supabaseClient) {
            // Mock data for search
            const q = query.toLowerCase();
            const mockDb = [
                { id:'m1', prefix:'นาย', first_name:'สมชาย', last_name:'ใจดี', citizen_id:'1390100123456', gender:'ชาย', age:65, dd_households:{house_number:'45/3', village_no:2, village_name:'บ้านหนองบัว'} },
                { id:'m2', prefix:'นาง', first_name:'สมหญิง', last_name:'ใจดี', citizen_id:'1390100234567', gender:'หญิง', age:62, dd_households:{house_number:'45/3', village_no:2, village_name:'บ้านหนองบัว'} },
                { id:'m3', prefix:'นาย', first_name:'บุญมี', last_name:'สุขสวัสดิ์', citizen_id:'1390100345678', gender:'ชาย', age:85, dd_households:{house_number:'78/1', village_no:5, village_name:'บ้านโคกกลาง'} },
                { id:'m4', prefix:'นาง', first_name:'ทองดี', last_name:'ศรีสุข', citizen_id:'1390100456789', gender:'หญิง', age:65, dd_households:{house_number:'23', village_no:1, village_name:'บ้านท่าสะอาด'} },
                { id:'m5', prefix:'นาย', first_name:'สมพร', last_name:'ทองดี', citizen_id:'1390100567890', gender:'ชาย', age:55, dd_households:{house_number:'34', village_no:4, village_name:'บ้านโนนสวาท'} },
            ];
            return mockDb.filter(m => 
                (m.first_name||'').toLowerCase().includes(q) || 
                (m.last_name||'').toLowerCase().includes(q) || 
                (m.citizen_id||'').includes(q) ||
                (m.dd_households.house_number||'').includes(q)
            );
        }
        const {data}=await supabaseClient.from('dd_household_members').select('*,dd_households(house_number,village_no,village_name)')
            .or(`citizen_id.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`).limit(20);
        return data||[];
    },

    async searchHousehold(query) {
        if(!supabaseClient) return [];
        const {data}=await supabaseClient.from('dd_households').select('*')
            .or(`house_number.ilike.%${query}%,owner_name.ilike.%${query}%,tr14_number.ilike.%${query}%`).limit(20);
        return data||[];
    },

    // Future AI stubs
    async getAIPredictions() { return {status:'stub',predictions:[]}; },
    async getRiskDetection() { return {status:'stub',risks:[]}; },
    async getWelfareRecommendation() { return {status:'stub',recommendations:[]}; },

    // Sync placeholder
    async syncExternalSources() { return {status:'ready',message:'Integration engine ready'}; },

    _getMockStats() {
        return { totalHouseholds:2847, totalPopulation:11238, totalMale:5621, totalFemale:5617, totalElderly:1842, totalDisabled:298, totalBedridden:67, totalNewborn:124, totalPoor:423, totalJP2TFailed:156,
            villageBreakdown:{'หมู่ 1 บ้านท่าสะอาด':{households:312,population:1245},'หมู่ 2 บ้านหนองบัว':{households:287,population:1134},'หมู่ 3 บ้านดอนสวรรค์':{households:256,population:1023},'หมู่ 4 บ้านโนนสวาท':{households:298,population:1187},'หมู่ 5 บ้านโคกกลาง':{households:234,population:932},'หมู่ 6 บ้านหนองผือ':{households:267,population:1068},'หมู่ 7 บ้านโนนสมบูรณ์':{households:245,population:978},'หมู่ 8 บ้านศรีสว่าง':{households:223,population:892},'หมู่ 9 บ้านท่าดอกคำ':{households:198,population:789},'หมู่ 10 บ้านหนองแก้ว':{households:212,population:845},'หมู่ 11 บ้านดงสวรรค์':{households:315,population:1145}} };
    },
    _getMockMapData() {
        const d=[],bLat=17.975,bLng=103.472;
        const mockNames = ['นายสมชาย ใจดี','นางสมศรี ใจดี','นายบุญมี รักชาติ','นางมาลี รักชาติ','นายทองดี มีทรัพย์','นางทองคำ มีทรัพย์'];
        for(let i=0;i<50;i++) {
            let elderly_c = Math.floor(Math.random()*3);
            let disabled_c = Math.random()>0.8?1:0;
            let bedridden_c = Math.random()>0.9?1:0;
            let newborn_c = Math.random()>0.85?1:0;
            
            d.push({
                id:`m${i}`, house_number:`${Math.floor(Math.random()*300)+1}`, village_no:Math.floor(Math.random()*11)+1, village_name:`บ้านตัวอย่าง`, 
                latitude:bLat+(Math.random()-0.5)*0.05, longitude:bLng+(Math.random()-0.5)*0.05, owner_name:`เจ้าของบ้าน ${i+1}`, 
                total_members:Math.floor(Math.random()*6)+1, 
                elderly_count: elderly_c,
                elderly_names: elderly_c > 0 ? Array.from({length:elderly_c}, (_,idx)=>`ผู้สูงอายุ ${idx+1} (ทดสอบ)`) : [],
                disabled_count: disabled_c,
                disabled_names: disabled_c > 0 ? ['ผู้พิการ (ทดสอบ)'] : [],
                bedridden_count: bedridden_c,
                bedridden_names: bedridden_c > 0 ? ['ผู้ป่วยติดเตียง (ทดสอบ)'] : [],
                newborn_count: newborn_c,
                newborn_names: newborn_c > 0 ? ['เด็กแรกเกิด (ทดสอบ)'] : [],
                poverty_status:Math.random()>0.85
            });
        }
        return d;
    },
    _getMockProfile() {
        return {id:'demo',house_number:'45/3',village_no:2,village_name:'บ้านหนองบัว',owner_name:'นายสมชาย ใจดี',total_members:4,male_count:2,female_count:2,elderly_count:1,disabled_count:0,bedridden_count:1,newborn_count:1,latitude:17.975,longitude:103.472,poverty_status:true,jp2t_failed:true,
            poorRecords:[{poverty_type:'รายได้น้อยกว่าเกณฑ์',housing_condition:'ทรุดโทรม',jp2t_status:true,assistance_required:'เงินอุดหนุนและซ่อมแซมบ้าน'}],
            members:[
                {id:'m1',prefix:'นาย',first_name:'สมชาย',last_name:'ใจดี',gender:'ชาย',age:45,is_head:true,relationship:'เจ้าบ้าน',citizen_id:'1390100123456'},
                {id:'m2',prefix:'นาง',first_name:'สมหญิง',last_name:'ใจดี',gender:'หญิง',age:42,is_head:false,relationship:'คู่สมรส',citizen_id:'1390100234567'},
                {id:'m3',prefix:'นาย',first_name:'สมศักดิ์',last_name:'ใจดี',gender:'ชาย',age:75,is_head:false,relationship:'บิดา',citizen_id:'1390100345678',elderly:{dependency_level:'ติดเตียง',welfare_status:'รับเบี้ย 700 บ.',caregiver:'สมหญิง ใจดี'},bedridden:{disease:'อัมพฤกษ์',condition_level:'หนัก',caregiver:'สมหญิง ใจดี',medical_note:'พลิกตัวทุก 2 ชม.'}},
                {id:'m4',prefix:'เด็กหญิง',first_name:'สมฤดี',last_name:'ใจดี',gender:'หญิง',age:0,is_head:false,relationship:'บุตร',newborn:{birth_weight:2.2,guardian_name:'สมหญิง ใจดี'}}
            ]};
    },
    _getMockAnalytics() {
        return { ageDistribution:{'0-5':{m:423,f:412},'6-14':{m:756,f:734},'15-24':{m:834,f:821},'25-59':{m:2687,f:2712},'60+':{m:921,f:938}}, totalMembers:11238 };
    }
};
