/**
 * services/waterSpatialService.js
 * Water Spatial Layer Service — Managing geometries for Water Resources, Waterways, and Drainage in Supabase PostgreSQL
 * Smart Governance Municipality Platform
 */

const WaterSpatialService = {
    // === CONFIG & TABLES ===
    tables: {
        res: 'infra_water_resources',
        way: 'infra_waterways',
        drain: 'infra_drainage_assets'
    },

    /**
     * ดึงข้อมูลพิกัดและรายละเอียดของทรัพย์สินทั้งหมดแยกตามประเภท
     * @param {string} type ประเภททรัพย์สิน ('res', 'way', 'drain')
     * @returns {Promise<Array>} รายการทรัพย์สินพร้อมพิกัด
     */
    async loadAssets(type) {
        const tableName = this.tables[type];
        if (!tableName) return [];

        console.log(`WaterSpatialService: Loading ${type} assets from PostgreSQL master...`);
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            try {
                const { data, error } = await supabaseClient
                    .from(tableName)
                    .select('*')
                    .order('created_at', { ascending: false });
                
                if (error) throw error;
                if (data) {
                    return data.map(item => this._mapDatabaseToUI(type, item));
                }
            } catch (err) {
                console.error(`WaterSpatialService: Fetch failed for ${type}, falling back to mock:`, err);
            }
        }
        
        // Fallback ไปข้อมูลจำลองหากไม่มีการเชื่อมต่อจริง
        let mockData = [];
        if (typeof DigitalInfraService !== 'undefined') {
            if (type === 'res') mockData = DigitalInfraService.mockWater;
            else if (type === 'way') mockData = DigitalInfraService.mockWaterways;
            else if (type === 'drain') mockData = DigitalInfraService.mockDrainage;
        }
        return mockData.map(item => this._mapDatabaseToUI(type, item));
    },

    /**
     * ขึ้นทะเบียนและบันทึกรายละเอียดพิกัดทางภูมิศาสตร์ของทรัพย์สินระบบน้ำ
     * @param {string} type ประเภททรัพย์สิน ('res', 'way', 'drain')
     * @param {Object} payload ข้อมูลรายละเอียดจากหน้า UI
     * @returns {Promise<Object>} ผลลัพธ์การบันทึก
     */
    async saveAsset(type, payload) {
        const tableName = this.tables[type];
        if (!tableName) return payload;

        console.log(`WaterSpatialService: Saving ${type} payload:`, payload);
        const dbPayload = this._mapUIToDatabase(type, payload);
        
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            try {
                const isNew = !payload.id;
                let resultData;
                
                if (isNew) {
                    delete dbPayload.id; // ให้ Supabase สร้าง UUID อัตโนมัติ
                    const { data, error } = await supabaseClient
                        .from(tableName)
                        .insert([dbPayload])
                        .select();
                    
                    if (error) throw error;
                    resultData = data[0];
                } else {
                    const { data, error } = await supabaseClient
                        .from(tableName)
                        .update(dbPayload)
                        .eq('id', payload.id)
                        .select();
                    
                    if (error) throw error;
                    resultData = data[0];
                }
                
                return this._mapDatabaseToUI(type, resultData);
            } catch (err) {
                console.error(`WaterSpatialService: Save to PostgreSQL failed for ${type}:`, err);
                throw err;
            }
        }
        
        // Mock Fallback
        if (!payload.id) {
            payload.id = 'mock_' + Date.now();
            if (typeof DigitalInfraService !== 'undefined') {
                if (type === 'res') DigitalInfraService.mockWater.push(payload);
                else if (type === 'way') DigitalInfraService.mockWaterways.push(payload);
                else if (type === 'drain') DigitalInfraService.mockDrainage.push(payload);
            }
        } else {
            if (typeof DigitalInfraService !== 'undefined') {
                let list = [];
                if (type === 'res') list = DigitalInfraService.mockWater;
                else if (type === 'way') list = DigitalInfraService.mockWaterways;
                else if (type === 'drain') list = DigitalInfraService.mockDrainage;
                
                const idx = list.findIndex(item => item.id === payload.id);
                if (idx !== -1) list[idx] = payload;
            }
        }
        return payload;
    },

    /**
     * แก้ไขข้อมูลเฉพาะพิกัดเรขาคณิต (Geometry Data Only)
     * @param {string} type ประเภททรัพย์สิน ('res', 'way', 'drain')
     * @param {string} id ID
     * @param {Object} geojson ข้อมูลรูปทรง GeoJSON ชุดใหม่
     */
    async updateAssetGeometry(type, id, geojson) {
        const tableName = this.tables[type];
        if (!tableName) return { id, geom: geojson };

        console.log(`WaterSpatialService: Updating geometry only for ${type} ID: ${id}`);
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { data, error } = await supabaseClient
                .from(tableName)
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
            let list = [];
            if (type === 'res') list = DigitalInfraService.mockWater;
            else if (type === 'way') list = DigitalInfraService.mockWaterways;
            else if (type === 'drain') list = DigitalInfraService.mockDrainage;
            
            const item = list.find(x => x.id === id);
            if (item) item.geom = geojson;
        }
        return { id, geom: geojson };
    },

    /**
     * ลบรายการทรัพย์สินออกจากระบบ
     * @param {string} type ประเภททรัพย์สิน ('res', 'way', 'drain')
     * @param {string} id ID ของทรัพย์สิน
     */
    async deleteAsset(type, id) {
        const tableName = this.tables[type];
        if (!tableName) return false;

        console.log(`WaterSpatialService: Deleting ${type} record ID: ${id}`);
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { error } = await supabaseClient
                .from(tableName)
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return true;
        }
        
        // Mock delete
        if (typeof DigitalInfraService !== 'undefined') {
            let list = [];
            if (type === 'res') list = DigitalInfraService.mockWater;
            else if (type === 'way') list = DigitalInfraService.mockWaterways;
            else if (type === 'drain') list = DigitalInfraService.mockDrainage;
            
            const idx = list.findIndex(item => item.id === id);
            if (idx !== -1) {
                list.splice(idx, 1);
                return true;
            }
        }
        return false;
    },

    /**
     * แปลงพิกัดแผนที่ Leaflet [lat, lng] Array ให้เป็นมาตรฐานสากล GeoJSON ตามประเภท Geometry
     * @param {string} geomType ประเภทเรขาคณิต ('Polygon', 'LineString', 'Point')
     * @param {Array} points อาเรย์พิกัดภูมิศาสตร์ [ [lat, lng], ... ]
     * @returns {Object|null} โครงสร้าง GeoJSON
     */
    convertLeafletToGeoJSON(geomType, points) {
        if (!points || points.length === 0) return null;

        if (geomType === 'Point') {
            const pt = points[0] || points;
            return {
                type: "Point",
                coordinates: [pt[1], pt[0]] // [longitude, latitude]
            };
        } else if (geomType === 'LineString') {
            if (points.length < 2) return null;
            return {
                type: "LineString",
                coordinates: points.map(pt => [pt[1], pt[0]])
            };
        } else if (geomType === 'Polygon') {
            if (points.length < 3) return null;
            // สำหรับ Polygon ใน GeoJSON พิกัดเริ่มต้นและสิ้นสุดต้องบรรจบกัน
            const coords = points.map(pt => [pt[1], pt[0]]);
            if (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1]) {
                coords.push([coords[0][0], coords[0][1]]);
            }
            return {
                type: "Polygon",
                coordinates: [coords] // Polygon coordinates are nested array: Array of LinearRings
            };
        }
        return null;
    },

    // === PRIVATE MAPPER HELPERS ===
    
    _mapUIToDatabase(type, ui) {
        let geom = ui.geom;
        if (typeof geom === 'string') {
            try {
                geom = JSON.parse(geom);
            } catch (e) {
                console.error("WaterSpatialService: Failed to parse ui.geom string:", e);
            }
        }

        const base = {
            id: ui.id,
            village_no: String(ui.village_no || '1'),
            latitude: parseFloat(ui.latitude) || null,
            longitude: parseFloat(ui.longitude) || null,
            status: ui.status || 'normal',
            geometry_geojson: geom || null,
            updated_at: new Date().toISOString()
        };

        if (type === 'res') {
            return {
                ...base,
                water_code: ui.water_code || '',
                water_name: ui.water_name || '',
                water_type: ui.water_type || 'หนอง',
                surface_area_sqm: parseFloat(ui.surface_area_sqm) || null,
                depth_m: parseFloat(ui.depth_m) || null,
                capacity_cum: parseFloat(ui.capacity_cum) || null
            };
        } else if (type === 'way') {
            return {
                ...base,
                waterway_code: ui.waterway_code || '',
                waterway_name: ui.waterway_name || '',
                waterway_type: ui.waterway_type || 'คลองส่งน้ำ',
                width_m: parseFloat(ui.width_m) || null,
                depth_m: parseFloat(ui.depth_m) || null,
                length_m: parseFloat(ui.length_m) || null
            };
        } else if (type === 'drain') {
            return {
                ...base,
                asset_id: ui.asset_id || '',
                drainage_type: ui.drainage_type || 'ฝาท่อระบายน้ำ',
                material: ui.material || 'คอนกรีต',
                width_m: parseFloat(ui.width_m) || null,
                depth_m: parseFloat(ui.depth_m) || null,
                length_m: parseFloat(ui.length_m) || null,
                road_id: ui.road_id || null,
                status: ui.status || 'good' // override base status for drainage specifically
            };
        }
        return ui;
    },

    _mapDatabaseToUI(type, db) {
        if (!db) return null;
        
        let geom = db.geometry_geojson;
        if (typeof geom === 'string') {
            try {
                geom = JSON.parse(geom);
            } catch (e) {
                console.error("WaterSpatialService: Failed to parse db.geometry_geojson:", e);
                geom = null;
            }
        }

        const base = {
            id: db.id,
            village_no: String(db.village_no || '1'),
            latitude: db.latitude || db.start_latitude || null,
            longitude: db.longitude || db.start_longitude || null,
            status: db.status || db.road_status || 'normal',
            geom: geom,
            created_at: db.created_at,
            updated_at: db.updated_at
        };

        if (type === 'res') {
            return {
                ...base,
                water_code: db.water_code,
                water_name: db.water_name,
                water_type: db.water_type,
                surface_area_sqm: db.surface_area_sqm,
                depth_m: db.depth_m,
                capacity_cum: db.capacity_cum
            };
        } else if (type === 'way') {
            return {
                ...base,
                waterway_code: db.waterway_code,
                waterway_name: db.waterway_name,
                waterway_type: db.waterway_type,
                width_m: db.width_m,
                depth_m: db.depth_m,
                length_m: db.length_m
            };
        } else if (type === 'drain') {
            return {
                ...base,
                asset_id: db.asset_id,
                drainage_type: db.drainage_type,
                material: db.material,
                width_m: db.width_m,
                depth_m: db.depth_m,
                length_m: db.length_m,
                road_id: db.road_id,
                status: db.status || 'good'
            };
        }
        return db;
    }
};

// ส่งออกบริการไปยังขอบเขตของ Window
window.WaterSpatialService = WaterSpatialService;
