/**
 * services/boundarySpatialService.js
 * Boundary Spatial Layer Service — Managing administrative boundaries (subdistricts/villages) and markers in Supabase PostGIS
 * Smart Governance Municipality Platform
 */

const BoundarySpatialService = {
    // === CONFIG & TABLES ===
    tables: {
        boundary: 'infra_boundaries',
        marker: 'infra_boundary_markers'
    },

    /**
     * ดึงข้อมูลแนวเขตการปกครองทั้งหมด
     * @returns {Promise<Array>} รายการแนวเขตการปกครอง (ตำบล/หมู่บ้าน)
     */
    async loadBoundaries() {
        console.log("BoundarySpatialService: Loading boundaries from PostgreSQL master...");
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            try {
                const { data, error } = await supabaseClient
                    .from(this.tables.boundary)
                    .select('*')
                    .order('created_at', { ascending: false });
                
                if (error) throw error;
                if (data) {
                    return data.map(item => this._mapBoundaryDatabaseToUI(item));
                }
            } catch (err) {
                console.error("BoundarySpatialService: Fetch boundaries failed, falling back to mock:", err);
            }
        }
        
        // Fallback ไปข้อมูลจำลองหากไม่มีการเชื่อมต่อจริง
        if (!DigitalInfraService.mockBoundaries) {
            DigitalInfraService.mockBoundaries = [
                {
                    id: '1',
                    boundary_name: 'แนวเขตตำบลบูรพา',
                    boundary_type: 'แนวเขตตำบล',
                    village_no: '',
                    area_sqm: 12500000,
                    gazette_announcement_text: 'แนวเขตตำบลบูรพา เริ่มต้นตั้งแต่หลักเขตที่ 1 บริเวณจุดตัดลำห้วยคลองใหญ่ พิกัด UTM Zone 47N 456789 E 1987654 N วิ่งเลียบขอบคลองไปทางทิศตะวันออกเฉียงเหนือ บรรจบหลักหมุดโครงข่ายกรมที่ดิน...',
                    map_reference: 'ประกาศกระทรวงมหาดไทย เล่ม 114 ตอนพิเศษ 56 ง',
                    geom: null
                },
                {
                    id: '2',
                    boundary_name: 'หมู่บ้านพาสุข',
                    boundary_type: 'แนวเขตหมู่บ้าน',
                    village_no: '1',
                    area_sqm: 2400000,
                    gazette_announcement_text: 'แนวเขตหมู่ที่ 1 ทิศเหนือจดห้วยทราย ทิศใต้จดแนวป่าขอบอ่างเก็บน้ำโขงพัฒนา ทิศตะวันออกจดทางหลวงแผ่นดิน...',
                    map_reference: 'ระวางวาดมือแผนที่ฝ่ายทะเบียนท้องถิ่น',
                    geom: null
                },
                {
                    id: '3',
                    boundary_name: 'หมู่บ้านนาดี',
                    boundary_type: 'แนวเขตหมู่บ้าน',
                    village_no: '2',
                    area_sqm: 1850000,
                    gazette_announcement_text: 'แนวเขตหมู่ที่ 2 ทิศเหนือจดแนวสันเขารัง ทิศใต้จดคลองส่งน้ำเขื่อนพระปรง ทิศตะวันตกจดถนน อบจ. โคกนาดี...',
                    map_reference: 'ระวางสปาเชียลเชิงโครงสร้าง',
                    geom: null
                }
            ];
        }
        return DigitalInfraService.mockBoundaries.map(item => this._mapBoundaryDatabaseToUI(item));
    },

    /**
     * ดึงข้อมูลหมุดหลักเขตทั้งหมด
     * @returns {Promise<Array>} รายการหมุดหลักเขต
     */
    async loadMarkers() {
        console.log("BoundarySpatialService: Loading markers from PostgreSQL master...");
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            try {
                const { data, error } = await supabaseClient
                    .from(this.tables.marker)
                    .select('*')
                    .order('created_at', { ascending: false });
                
                if (error) throw error;
                if (data) {
                    return data.map(item => this._mapMarkerDatabaseToUI(item));
                }
            } catch (err) {
                console.error("BoundarySpatialService: Fetch markers failed, falling back to mock:", err);
            }
        }
        
        // Fallback ไปข้อมูลจำลองหากไม่มีการเชื่อมต่อจริง
        return (DigitalInfraService.mockBoundaryMarkers || []).map(item => this._mapMarkerDatabaseToUI(item));
    },

    /**
     * บันทึกข้อมูลแนวเขตการปกครอง
     * @param {Object} payload ข้อมูลจาก UI
     */
    async saveBoundary(payload) {
        console.log("BoundarySpatialService: Saving boundary payload:", payload);
        const dbPayload = this._mapBoundaryUIToDatabase(payload);
        
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            try {
                const isNew = !payload.id;
                let resultData;
                
                if (isNew) {
                    delete dbPayload.id;
                    const { data, error } = await supabaseClient
                        .from(this.tables.boundary)
                        .insert([dbPayload])
                        .select();
                    
                    if (error) throw error;
                    resultData = data[0];
                } else {
                    const { data, error } = await supabaseClient
                        .from(this.tables.boundary)
                        .update(dbPayload)
                        .eq('id', payload.id)
                        .select();
                    
                    if (error) throw error;
                    resultData = data[0];
                }
                
                return this._mapBoundaryDatabaseToUI(resultData);
            } catch (err) {
                console.error("BoundarySpatialService: Save boundary to PostgreSQL failed:", err);
                throw err;
            }
        }
        
        // Mock Fallback
        if (!payload.id) {
            payload.id = 'mock_b_' + Date.now();
            if (!DigitalInfraService.mockBoundaries) DigitalInfraService.mockBoundaries = [];
            DigitalInfraService.mockBoundaries.push(payload);
        } else {
            if (DigitalInfraService.mockBoundaries) {
                const idx = DigitalInfraService.mockBoundaries.findIndex(item => item.id === payload.id);
                if (idx !== -1) DigitalInfraService.mockBoundaries[idx] = payload;
            }
        }
        return payload;
    },

    /**
     * บันทึกข้อมูลหลักเขต
     * @param {Object} payload ข้อมูลจาก UI
     */
    async saveMarker(payload) {
        console.log("BoundarySpatialService: Saving marker payload:", payload);
        const dbPayload = this._mapMarkerUIToDatabase(payload);
        
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            try {
                const isNew = !payload.id;
                let resultData;
                
                if (isNew) {
                    delete dbPayload.id;
                    const { data, error } = await supabaseClient
                        .from(this.tables.marker)
                        .insert([dbPayload])
                        .select();
                    
                    if (error) throw error;
                    resultData = data[0];
                } else {
                    const { data, error } = await supabaseClient
                        .from(this.tables.marker)
                        .update(dbPayload)
                        .eq('id', payload.id)
                        .select();
                    
                    if (error) throw error;
                    resultData = data[0];
                }
                
                return this._mapMarkerDatabaseToUI(resultData);
            } catch (err) {
                console.error("BoundarySpatialService: Save marker to PostgreSQL failed:", err);
                throw err;
            }
        }
        
        // Mock Fallback
        if (!payload.id) {
            payload.id = 'mock_m_' + Date.now();
            if (!DigitalInfraService.mockBoundaryMarkers) DigitalInfraService.mockBoundaryMarkers = [];
            DigitalInfraService.mockBoundaryMarkers.push(payload);
        } else {
            if (DigitalInfraService.mockBoundaryMarkers) {
                const idx = DigitalInfraService.mockBoundaryMarkers.findIndex(item => item.id === payload.id);
                if (idx !== -1) DigitalInfraService.mockBoundaryMarkers[idx] = payload;
            }
        }
        return payload;
    },

    /**
     * ลบแนวเขต
     */
    async deleteBoundary(id) {
        console.log("BoundarySpatialService: Deleting boundary record ID:", id);
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { error } = await supabaseClient
                .from(this.tables.boundary)
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return true;
        }
        
        if (DigitalInfraService.mockBoundaries) {
            const idx = DigitalInfraService.mockBoundaries.findIndex(item => item.id === id);
            if (idx !== -1) {
                DigitalInfraService.mockBoundaries.splice(idx, 1);
                return true;
            }
        }
        return false;
    },

    /**
     * ลบหลักเขต
     */
    async deleteMarker(id) {
        console.log("BoundarySpatialService: Deleting marker record ID:", id);
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { error } = await supabaseClient
                .from(this.tables.marker)
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return true;
        }
        
        if (DigitalInfraService.mockBoundaryMarkers) {
            const idx = DigitalInfraService.mockBoundaryMarkers.findIndex(item => item.id === id);
            if (idx !== -1) {
                DigitalInfraService.mockBoundaryMarkers.splice(idx, 1);
                return true;
            }
        }
        return false;
    },

    // === MAPPING CONVERTERS ===

    _mapBoundaryUIToDatabase(ui) {
        let geom = ui.geom;
        if (typeof geom === 'string') {
            try {
                geom = JSON.parse(geom);
            } catch (e) {
                console.error("BoundarySpatialService: Failed to parse ui.geom:", e);
            }
        }

        // ปรับแต่งโพลิกอนเดี่ยวให้เป็น MultiPolygon เสมอสำหรับตารางแนวเขต
        if (geom && geom.type === 'Polygon') {
            geom = {
                type: 'MultiPolygon',
                coordinates: [geom.coordinates]
            };
        }

        return {
            id: ui.id,
            boundary_name: ui.boundary_name || '',
            boundary_type: ui.boundary_type || 'แนวเขตตำบล',
            village_no: ui.village_no || '',
            area_sqm: parseFloat(ui.area_sqm) || null,
            area_sqkm: parseFloat(ui.area_sqkm) || null,
            area_rai: parseFloat(ui.area_rai) || null,
            gazette_announcement_text: ui.gazette_announcement_text || '',
            map_reference: ui.map_reference || 'นำเข้าจากระบบสารสนเทศภูมิศาสตร์ GIS',
            gazette_pdf_url: ui.gazette_pdf_url || '',
            map_annex_url: ui.map_annex_url || '',
            geometry_geojson: geom || null,
            updated_at: new Date().toISOString()
        };
    },

    _mapBoundaryDatabaseToUI(db) {
        if (!db) return null;
        
        let geom = db.geometry_geojson;
        if (typeof geom === 'string') {
            try {
                geom = JSON.parse(geom);
            } catch (e) {
                console.error("BoundarySpatialService: Failed to parse db.geometry_geojson:", e);
                geom = null;
            }
        }

        return {
            id: db.id,
            boundary_name: db.boundary_name,
            boundary_type: db.boundary_type,
            village_no: db.village_no || '',
            area_sqm: db.area_sqm || 0,
            area_sqkm: db.area_sqkm || 0,
            area_rai: db.area_rai || 0,
            gazette_announcement_text: db.gazette_announcement_text || '',
            map_reference: db.map_reference || 'นำเข้าจากระบบสารสนเทศภูมิศาสตร์ GIS',
            gazette_pdf_url: db.gazette_pdf_url || '',
            map_annex_url: db.map_annex_url || '',
            geom: geom || db.geom || null,
            created_at: db.created_at,
            updated_at: db.updated_at
        };
    },

    _mapMarkerUIToDatabase(ui) {
        let geom = ui.geom;
        if (typeof geom === 'string') {
            try {
                geom = JSON.parse(geom);
            } catch (e) {
                console.error("BoundarySpatialService: Failed to parse ui.geom:", e);
            }
        }

        return {
            id: ui.id,
            marker_code: ui.marker_code || '',
            marker_type: ui.marker_type || 'หลักเขตตำบล',
            description: ui.description || '',
            village_no: ui.village_no || '1',
            latitude: parseFloat(ui.latitude) || null,
            longitude: parseFloat(ui.longitude) || null,
            mgrs: ui.mgrs || '',
            coord_x: parseFloat(ui.coord_x) || null,
            coord_y: parseFloat(ui.coord_y) || null,
            marker_condition: ui.marker_condition || 'perfect',
            image_url: ui.image_url || '',
            document_url: ui.document_url || '',
            geometry_geojson: geom || null,
            updated_at: new Date().toISOString()
        };
    },

    _mapMarkerDatabaseToUI(db) {
        if (!db) return null;
        
        let geom = db.geometry_geojson;
        if (typeof geom === 'string') {
            try {
                geom = JSON.parse(geom);
            } catch (e) {
                console.error("BoundarySpatialService: Failed to parse db.geometry_geojson:", e);
                geom = null;
            }
        }

        return {
            id: db.id,
            marker_code: db.marker_code,
            marker_type: db.marker_type,
            description: db.description || '',
            village_no: db.village_no || '1',
            latitude: db.latitude,
            longitude: db.longitude,
            mgrs: db.mgrs || '',
            coord_x: db.coord_x || null,
            coord_y: db.coord_y || null,
            marker_condition: db.marker_condition || 'perfect',
            image_url: db.image_url || '',
            document_url: db.document_url || '',
            geom: geom || db.geom || null,
            created_at: db.created_at,
            updated_at: db.updated_at
        };
    }
};

window.BoundarySpatialService = BoundarySpatialService;
