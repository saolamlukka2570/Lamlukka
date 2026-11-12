/**
 * services/gisSpatialService.js
 * GIS Spatial Layer Service — Managing geometries in Supabase PostgreSQL master database
 * Smart Governance Municipality Platform
 */

const GISSpatialService = {
    // === CONFIG & FALLBACKS ===
    targetTable: 'infra_roads',
    
    /**
     * ดึงข้อมูลพิกัดและถนนหลวงท้องถิ่นทั้งหมดจาก Master GIS Database
     * @returns {Promise<Array>} รายการถนนพร้อมพิกัด
     */
    async loadRoads() {
        console.log("GISSpatialService: Loading roads from PostgreSQL master GIS...");
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            try {
                const { data, error } = await supabaseClient
                    .from(this.targetTable)
                    .select('*')
                    .order('created_at', { ascending: false });
                
                if (error) throw error;
                if (data) {
                    return data;
                }
            } catch (err) {
                console.error("GISSpatialService: Fetch failed, falling back to mock storage:", err);
            }
        }
        
        // Fallback ไปข้อมูลจำลองหากไม่มีการเชื่อมต่อจริง
        return typeof DigitalInfraService !== 'undefined' ? DigitalInfraService.mockRoads : [];
    },

    /**
     * ขึ้นทะเบียนและบันทึกรายละเอียดพิกัดทางภูมิศาสตร์ถนน
     * @param {Object} payload ข้อมูลรายละเอียดถนนจากหน้า UI
     * @returns {Promise<Object>} ผลลัพธ์การบันทึก
     */
    async saveGeometry(payload) {
        console.log("GISSpatialService: Saving master GIS data road payload:", payload);
        
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            try {
                const isNew = !payload.id;
                let geomToSave = payload.geom;
                
                // ตรวจสอบและแปลง MultiLineString เป็น LineString เพื่อให้เข้ากับชนิดคอลัมน์ใน Supabase
                if (geomToSave && geomToSave.type === 'MultiLineString' && geomToSave.coordinates) {
                    let flattenedCoords = [];
                    geomToSave.coordinates.forEach(line => {
                        if (Array.isArray(line)) {
                            flattenedCoords = flattenedCoords.concat(line);
                        }
                    });
                    
                    geomToSave = {
                        type: 'LineString',
                        coordinates: flattenedCoords
                    };
                }

                // ฟังก์ชันตัดคำ (Truncate) เพื่อป้องกันข้อผิดพลาด "value too long for type character varying"
                const truncate = (str, len) => str && typeof str === 'string' ? str.substring(0, len) : str;

                const dbPayload = {
                    road_id: truncate(payload.road_id, 50),
                    road_cl: truncate(payload.road_cl, 50),
                    road_name: truncate(payload.road_name, 150),
                    road_type: truncate(payload.road_type, 50),
                    surface_type: truncate(payload.surface_type, 50),
                    width: payload.width,
                    length_m: payload.length_m,
                    village_no: payload.village_no ? truncate(String(payload.village_no), 10) : null,
                    status: truncate(payload.status, 50),
                    construction_year: payload.construction_year,
                    budget_source: truncate(payload.budget_source, 150),
                    latitude: payload.latitude,
                    longitude: payload.longitude,
                    geom: geomToSave
                };
                
                if (isNew) {
                    delete dbPayload.id; // ให้ Supabase สร้าง UUID อัตโนมัติ
                    
                    // ใช้ upsert แทน insert และระบุ onConflict: 'road_id' 
                    // เพื่อแก้ปัญหา duplicate key value violates unique constraint "infra_roads_road_id_key"
                    const { data, error } = await supabaseClient
                        .from(this.targetTable)
                        .upsert([dbPayload], { onConflict: 'road_id' })
                        .select();
                    
                    if (error) throw error;
                    resultData = data[0];
                } else {
                    const { data, error } = await supabaseClient
                        .from(this.targetTable)
                        .update(dbPayload)
                        .eq('id', payload.id)
                        .select();
                    
                    if (error) throw error;
                    resultData = data[0];
                }
                
                return resultData;
            } catch (err) {
                console.error("GISSpatialService: Save to PostgreSQL failed, using memory sync:", err);
                if (typeof showToast !== 'undefined') showToast(`DB Error: ${err.message}`, 'danger');
                // ไม่ต้อง throw err เพื่อให้ตกมาที่ Mock Fallback ด้านล่าง
            }
        }
        
        // Mock Fallback
        if (!payload.id) {
            payload.id = 'mock_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
            if (typeof DigitalInfraService !== 'undefined') DigitalInfraService.mockRoads.push(payload);
        } else {
            if (typeof DigitalInfraService !== 'undefined') {
                const idx = DigitalInfraService.mockRoads.findIndex(r => r.id === payload.id);
                if (idx !== -1) DigitalInfraService.mockRoads[idx] = payload;
            }
        }
        return payload;
    },

    /**
     * ทำการแก้ไขข้อมูลเฉพาะพิกัดเรขาคณิต (Geometry Data Only)
     * @param {string} id ID ของแนวเส้นทางถนน
     * @param {Object} geojson ข้อมูลรูปทรง GeoJSON ชุดใหม่
     */
    async updateGeometry(id, geojson) {
        console.log(`GISSpatialService: Updating geometry only for road ID: ${id}`);
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { data, error } = await supabaseClient
                .from(this.targetTable)
                .update({
                    geom: geojson,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select();
            
            if (error) throw error;
            return data[0];
        }
        
        // Mock update
        if (typeof DigitalInfraService !== 'undefined') {
            const road = DigitalInfraService.mockRoads.find(r => r.id === id);
            if (road) road.geom = geojson;
        }
        return { id, geom: geojson };
    },

    /**
     * ลบแนวพิกัดและรายละเอียดของถนนออกสถาปัตยกรรมเชิงพื้นที่
     * @param {string} id ID ของถนน
     */
    async deleteGeometry(id) {
        console.log(`GISSpatialService: Removing GIS database records for ID: ${id}`);
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { error } = await supabaseClient
                .from(this.targetTable)
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return true;
        }
        
        // Mock delete
        if (typeof DigitalInfraService !== 'undefined') {
            const idx = DigitalInfraService.mockRoads.findIndex(r => r.id === id);
            if (idx !== -1) DigitalInfraService.mockRoads.splice(idx, 1);
        }
        return true;
    },

    /**
     * แปลงพิกัด Leaflet [lat, lng] Array ให้เป็นมาตรฐานสากล GeoJSON LineString
     * @param {Array} points อาเรย์พิกัดภูมิศาสตร์ Leaflet [ [lat, lng], [lat, lng], ... ]
     * @returns {Object|null} โครงสร้าง GeoJSON LineString
     */
    convertLeafletToGeoJSON(points) {
        if (!points || points.length < 2) return null;
        return {
            type: "LineString",
            coordinates: points.map(pt => [pt[1], pt[0]]) // แปลงกลับเป็น [longitude, latitude] ตามมาตรฐาน GeoJSON
        };
    }
};

// ส่งออกบริการไปยังขอบเขตของ Window
window.GISSpatialService = GISSpatialService;
