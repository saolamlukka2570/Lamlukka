/**
 * services/publicLandSpatialService.js
 * Public Land Spatial Layer Service — Managing geometries for Public Lands and Treasury Properties in Supabase PostgreSQL
 * Smart Governance Municipality Platform
 */

const PublicLandSpatialService = {
    // === CONFIG & TABLES ===
    targetTable: 'infra_public_lands',

    /**
     * ดึงข้อมูลพิกัดและรายละเอียดของที่ดินสาธารณประโยชน์ทั้งหมด
     * @returns {Promise<Array>} รายการที่ดินพร้อมพิกัด
     */
    async loadPublicLands() {
        console.log(`PublicLandSpatialService: Loading public lands from PostgreSQL master...`);
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            try {
                const { data, error } = await supabaseClient
                    .from(this.targetTable)
                    .select('*')
                    .order('created_at', { ascending: false });
                
                if (error) throw error;
                if (data) {
                    return data.map(item => this._mapDatabaseToUI(item));
                }
            } catch (err) {
                console.error(`PublicLandSpatialService: Fetch failed, falling back to mock:`, err);
            }
        }
        
        // Fallback ไปข้อมูลจำลองหากไม่มีการเชื่อมต่อจริง
        let mockData = [];
        if (typeof DigitalInfraService !== 'undefined') {
            mockData = DigitalInfraService.mockPublicLand;
        }
        return mockData.map(item => this._mapDatabaseToUI(item));
    },

    /**
     * ขึ้นทะเบียนและบันทึกรายละเอียดพิกัดทางภูมิศาสตร์ของที่ดินสาธารณประโยชน์
     * @param {Object} payload ข้อมูลรายละเอียดจากหน้า UI
     * @returns {Promise<Object>} ผลลัพธ์การบันทึก
     */
    async savePublicLand(payload) {
        console.log(`PublicLandSpatialService: Saving public land payload:`, payload);
        const dbPayload = this._mapUIToDatabase(payload);
        
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            try {
                const isNew = !payload.id;
                let resultData;
                
                if (isNew) {
                    delete dbPayload.id; // ให้ Supabase สร้าง UUID อัตโนมัติ
                    const { data, error } = await supabaseClient
                        .from(this.targetTable)
                        .insert([dbPayload])
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
                
                return this._mapDatabaseToUI(resultData);
            } catch (err) {
                console.error(`PublicLandSpatialService: Save to PostgreSQL failed:`, err);
                throw err;
            }
        }
        
        // Mock Fallback
        if (!payload.id) {
            payload.id = 'mock_' + Date.now();
            if (typeof DigitalInfraService !== 'undefined') {
                DigitalInfraService.mockPublicLand.push(payload);
            }
        } else {
            if (typeof DigitalInfraService !== 'undefined') {
                const idx = DigitalInfraService.mockPublicLand.findIndex(item => item.id === payload.id);
                if (idx !== -1) DigitalInfraService.mockPublicLand[idx] = payload;
            }
        }
        return payload;
    },

    /**
     * แก้ไขข้อมูลเฉพาะพิกัดเรขาคณิต (Geometry Data Only)
     * @param {string} id ID
     * @param {Object} geojson ข้อมูลรูปทรง GeoJSON ชุดใหม่
     */
    async updateLandGeometry(id, geojson) {
        console.log(`PublicLandSpatialService: Updating geometry only for public land ID: ${id}`);
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { data, error } = await supabaseClient
                .from(this.targetTable)
                .update({
                    geometry_geojson: geojson,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select();
            
            if (error) throw error;
            return data[0];
        }
        
        // Mock update
        if (typeof DigitalInfraService !== 'undefined') {
            const item = DigitalInfraService.mockPublicLand.find(x => x.id === id);
            if (item) item.geom = geojson;
        }
        return { id, geom: geojson };
    },

    /**
     * ลบรายการทรัพย์สินออกจากระบบ
     * @param {string} id ID ของทรัพย์สิน
     */
    async deletePublicLand(id) {
        console.log(`PublicLandSpatialService: Deleting record ID: ${id}`);
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
            const idx = DigitalInfraService.mockPublicLand.findIndex(item => item.id === id);
            if (idx !== -1) {
                DigitalInfraService.mockPublicLand.splice(idx, 1);
                return true;
            }
        }
        return false;
    },

    /**
     * แปลงพิกัดแผนที่ Leaflet [lat, lng] Array ให้เป็นมาตรฐานสากล GeoJSON Polygon
     * @param {Array} points อาเรย์พิกัดภูมิศาสตร์ [ [lat, lng], ... ]
     * @returns {Object|null} โครงสร้าง GeoJSON
     */
    convertLeafletToGeoJSON(points) {
        if (!points || points.length < 3) return null;
        
        // สำหรับ Polygon ใน GeoJSON พิกัดเริ่มต้นและสิ้นสุดต้องบรรจบกัน
        const coords = points.map(pt => [pt[1], pt[0]]);
        if (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1]) {
            coords.push([coords[0][0], coords[0][1]]);
        }
        return {
            type: "Polygon",
            coordinates: [coords] // Polygon coordinates are nested array
        };
    },

    // === PRIVATE MAPPER HELPERS ===
    
    _mapUIToDatabase(ui) {
        let geom = ui.geom;
        if (typeof geom === 'string') {
            try {
                geom = JSON.parse(geom);
            } catch (e) {
                console.error("PublicLandSpatialService: Failed to parse ui.geom string:", e);
            }
        }

        return {
            id: ui.id,
            land_code: ui.land_code || '',
            land_name: ui.land_name || '',
            land_type: ui.land_type || 'ที่สาธารณะประโยชน์',
            area_rai: parseInt(ui.area_rai) || 0,
            area_ngan: parseInt(ui.area_ngan) || 0,
            area_sqwa: parseFloat(ui.area_sqwa) || 0,
            village_no: String(ui.village_no || '1'),
            status: ui.status || 'used',
            current_use: ui.current_use || '',
            latitude: parseFloat(ui.latitude) || null,
            longitude: parseFloat(ui.longitude) || null,
            geometry_geojson: geom || null,
            updated_at: new Date().toISOString()
        };
    },

    _mapDatabaseToUI(db) {
        if (!db) return null;
        
        let geom = db.geometry_geojson;
        if (typeof geom === 'string') {
            try {
                geom = JSON.parse(geom);
            } catch (e) {
                console.error("PublicLandSpatialService: Failed to parse db.geometry_geojson:", e);
                geom = null;
            }
        }

        return {
            id: db.id,
            land_code: db.land_code,
            land_name: db.land_name,
            land_type: db.land_type,
            area_rai: db.area_rai || 0,
            area_ngan: db.area_ngan || 0,
            area_sqwa: db.area_sqwa || 0,
            village_no: String(db.village_no || '1'),
            status: db.status || 'used',
            current_use: db.current_use || '',
            latitude: db.latitude || null,
            longitude: db.longitude || null,
            geom: geom || db.geom || null, // fallback to geom binary if stored there directly
            created_at: db.created_at,
            updated_at: db.updated_at
        };
    }
};

// ส่งออกบริการไปยังขอบเขตของ Window
window.PublicLandSpatialService = PublicLandSpatialService;
