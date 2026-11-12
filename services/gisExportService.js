/**
 * services/gisExportService.js
 * GIS Export Service — Generating spatial export formats (GeoJSON, SHP, KML, CSV)
 * Smart Governance Municipality Platform
 */

const GISExportService = {
    storageBucket: 'gis-exports',
    storageFolder: 'roads/',

    /**
     * ดึงสคริปต์ JSZip เข้าใช้งานแบบ Dynamic CDN
     */
    async _loadJSZip() {
        if (typeof window.JSZip !== 'undefined') return window.JSZip;
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            script.onload = () => {
                console.log("JSZip library loaded dynamically.");
                resolve(window.JSZip);
            };
            script.onerror = () => reject(new Error("ไม่สามารถโหลดไลบรารี JSZip สำหรับบีบอัดไฟล์ Shapefile ได้"));
            document.head.appendChild(script);
        });
    },

    /**
     * 1. Export as GeoJSON FeatureCollection (พิกัดสากล EPSG:4326)
     */
    exportGeoJSON(roads) {
        const features = roads.map(r => {
            // ใช้ Geometry GeoJSON ตรงตามโครงสร้าง Master
            let geom = r.geom;
            if (!geom || !geom.coordinates || !geom.coordinates.length) {
                // หากไม่มีพิกัดเส้น ให้สร้างเส้นพิกัดจุดเริ่มต้นจำลองเพื่อป้องกัน QGIS ปฏิเสธค่า
                geom = {
                    type: "LineString",
                    coordinates: [
                        [r.longitude || 103.472, r.latitude || 17.975],
                        [(r.longitude || 103.472) + 0.002, (r.latitude || 17.975) + 0.002]
                    ]
                };
            }
            
            return {
                type: "Feature",
                geometry: geom,
                properties: {
                    road_code: r.road_id || '',
                    road_name: r.road_name || '',
                    road_type: r.road_type || '',
                    width: parseFloat(r.width) || 0,
                    length_m: parseFloat(r.length_m) || 0,
                    village_no: parseInt(r.village_no) || 1,
                    status: r.status || 'good',
                    surface: r.surface_type || 'คอนกรีตเสริมเหล็ก',
                    const_year: parseInt(r.construction_year) || 0
                }
            };
        });

        return {
            type: "FeatureCollection",
            name: "roads_master_gis",
            crs: {
                type: "name",
                properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" }
            },
            features: features
        };
    },

    /**
     * 2. Export as KML (รองรับ Google Earth)
     */
    exportKML(roads) {
        let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>ทะเบียนโครงข่ายสายทางถนน อปท.</name>
    <description>แผนภูมิพิกัดแนวเส้นทางถนน Master GIS Database (WGS 84)</description>
    <Style id="roadLineStyle">
      <LineStyle>
        <color>ff441de1</color>
        <width>6</width>
      </LineStyle>
    </Style>
`;

        roads.forEach(r => {
            let coordsStr = "";
            let geom = r.geom;
            
            if (geom && geom.coordinates && geom.coordinates.length) {
                coordsStr = geom.coordinates.map(coord => `${coord[0]},${coord[1]},0`).join(' ');
            } else {
                // พิกัดสำรองเริ่มต้น
                const lon = r.longitude || 103.472;
                const lat = r.latitude || 17.975;
                coordsStr = `${lon},${lat},0 ${lon+0.002},${lat+0.002},0`;
            }

            kml += `    <Placemark>
      <name>${r.road_name || 'ถนนสายทาง'}</name>
      <description><![CDATA[
        <b>รหัสทะเบียน:</b> ${r.road_id || '-'}<br/>
        <b>ประเภทถนน:</b> ${r.road_type || '-'}<br/>
        <b>หน้ากว้าง:</b> ${r.width || 0} ม. | <b>ความยาว:</b> ${r.length_m || 0} ม.<br/>
        <b>สภาพปัจจุบัน:</b> ${r.status === 'good' ? 'ดีเยี่ยม' : r.status === 'fair' ? 'ปานกลาง' : 'ชำรุดหนัก'}<br/>
        <b>วัสดุผิวจราจร:</b> ${r.surface_type || '-'}
      ]]></description>
      <styleUrl>#roadLineStyle</styleUrl>
      <LineString>
        <tessellate>1</tessellate>
        <coordinates>${coordsStr}</coordinates>
      </LineString>
    </Placemark>
`;
        });

        kml += `  </Document>
</kml>`;
        return kml;
    },

    /**
     * 3. Export as CSV File (พร้อมฟิลด์พิกัดละติจูดและลองจิจูดสำหรับเปิดใน MS Excel)
     */
    exportCSV(roads) {
        const headers = ["ID", "Road Code", "Road Name", "Road Type", "Width (m)", "Length (m)", "Village No", "Surface Material", "Status", "Year Built", "Start Latitude", "Start Longitude"];
        const rows = roads.map(r => [
            r.id,
            `"${r.road_id || ''}"`,
            `"${r.road_name || ''}"`,
            `"${r.road_type || ''}"`,
            r.width || 0,
            r.length_m || 0,
            r.village_no || '1',
            `"${r.surface_type || 'คอนกรีตเสริมเหล็ก'}"`,
            `"${r.status || 'good'}"`,
            r.construction_year || '-',
            r.latitude || 17.975,
            r.longitude || 103.472
        ]);

        return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    },

    /**
     * 4. Export as Compiling Binary Shapefile Package (.zip containing .shp, .dbf, .shx, .prj)
     * สร้างสปีดไบนารีระดับเอ็นจิ้นเพื่อการยอมรับบนซอฟต์แวร์ QGIS
     */
    async exportSHP(roads) {
        const JSZip = await this._loadJSZip();
        const zip = new JSZip();

        // A. prj file: ข้อความระบุ Coordinate System WGS 84 (EPSG:4326)
        const prjContent = 'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]';
        zip.file("roads.prj", prjContent);

        // คำนวณ Bounding Box ของแผนที่ทั้งหมดในคอลเลกชัน
        let minX = 180, minY = 90, maxX = -180, maxY = -90;
        const validGeoms = [];
        
        roads.forEach(r => {
            let coords = [];
            if (r.geom && r.geom.coordinates && r.geom.coordinates.length) {
                coords = r.geom.coordinates;
            } else {
                const lon = r.longitude || 103.472;
                const lat = r.latitude || 17.975;
                coords = [[lon, lat], [lon + 0.002, lat + 0.002]];
            }
            
            validGeoms.push({
                coords: coords,
                record: r
            });

            coords.forEach(pt => {
                if (pt[0] < minX) minX = pt[0];
                if (pt[1] < minY) minY = pt[1];
                if (pt[0] > maxX) maxX = pt[0];
                if (pt[1] > maxY) maxY = pt[1];
            });
        });

        if (!validGeoms.length) {
            minX = 103.472; minY = 17.975; maxX = 103.474; maxY = 17.977;
        }

        // B. สร้าง Shp และ Shx ไบนารี (Shapefile Main และ Index เคร่งครัดตามข้อกำหนด ESRI Whitepaper)
        const shpBuffer = this._compileShpBinary(validGeoms, minX, minY, maxX, maxY, false);
        const shxBuffer = this._compileShpBinary(validGeoms, minX, minY, maxX, maxY, true);
        
        zip.file("roads.shp", shpBuffer);
        zip.file("roads.shx", shxBuffer);

        // C. สร้าง DBF (ตารางฐานข้อมูลคุณสมบัติภาษาไทย รหัส TIS-620 หรือ UTF-8 สำหรับ QGIS)
        const dbfBuffer = this._compileDbfBinary(validGeoms);
        zip.file("roads.dbf", dbfBuffer);

        // เจเนอเรตออกมาในลักษณะ Blob บีบอัด
        const zipBlob = await zip.generateAsync({ type: "blob" });
        return zipBlob;
    },

    /**
     * อัปโหลดไฟล์ประเมิน GIS สู่ Supabase Storage และดำเนินการ Backup จำลองไปยัง Google Drive
     */
    async uploadStorageBackup(filename, fileData, fileType) {
        console.log(`GISExportService: Starting upload chain for: ${filename}`);
        const storagePath = `${this.storageFolder}${filename}`;
        let fileUrl = '';

        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            try {
                // จัดอัปโหลดข้อมูลเข้าถังขยะประวัติตัวส่งออก "gis-exports"
                const { data, error } = await supabaseClient
                    .storage
                    .from(this.storageBucket)
                    .upload(storagePath, fileData, {
                        contentType: fileType === 'zip' ? 'application/zip' : 'application/json',
                        upsert: true
                    });
                
                if (error) throw error;
                
                if (data) {
                    const { data: publicUrlData } = supabaseClient
                        .storage
                        .from(this.storageBucket)
                        .getPublicUrl(storagePath);
                    fileUrl = publicUrlData ? publicUrlData.publicUrl : '';
                }
            } catch (err) {
                console.error("GISExportService: Supabase Storage upload failed, bypassing storage sync:", err);
            }
        }

        // --- PHASE 4 — GOOGLE DRIVE BACKUP (PLACEHOLDER) ---
        // จำลองกระบวนการอัปโหลดไฟล์สำรองข้อมูล (GeoJSON, SHP) ไปยัง Google Drive:
        // โฟลเดอร์: GIS-BACKUP/roads/
        const backupPath = `GIS-BACKUP/roads/${filename}`;
        console.log(`GISExportService [Drive Backup]: Emulated copy transfer to G-Drive folder -> ${backupPath}`);
        
        // จำลองเวลาอัปโหลดพิกัด
        const driveLog = {
            status: "Success (Placeholder Mode)",
            service: "Google Drive Sync Module",
            destination: backupPath,
            timestamp: new Date().toLocaleString('th-TH'),
            size_bytes: fileData.size || fileData.length || 2048,
            file_link: fileUrl || `https://drive.google.com/drive/folders/mock_gis_backup_roads`
        };
        
        console.log("GISExportService [Drive Backup]: Emulation Log Generated:\n", JSON.stringify(driveLog, null, 2));

        return {
            storageUrl: fileUrl,
            driveBackup: driveLog
        };
    },

    // ==========================================
    // LOW-LEVEL ESRI SHAPEFILE BINARY ENGINES
    // ==========================================

    _compileShpBinary(features, minX, minY, maxX, maxY, isIndexOnly = false, shapeType = 3) {
        // อ้างอิง ESRI Shapefile Specs:
        // shapeType: 1 for Point, 3 for PolyLine, 5 for Polygon
        let headerSize = 100;
        let contentSize = 0;

        // คำนวณพื้นที่จัดเก็บสำหรับเรคคอร์ด
        const recordsMeta = [];
        features.forEach((feat, idx) => {
            const numPts = feat.coords.length;
            let recordWords;
            if (shapeType === 1) {
                // Record Content Header = 4 words (8 bytes)
                // Shape Type = 2 words (4 bytes)
                // Coordinates = X (4 words) + Y (4 words) = 8 words (16 bytes)
                // Total = 14 words (28 bytes)
                recordWords = isIndexOnly ? 4 : 14;
            } else {
                // Shape Type 3 (PolyLine) or 5 (Polygon)
                // Record Content Header = 4 words
                // Shape Type = 2 words
                // Box = 16 words (4 x double)
                // NumParts = 2 words, NumPoints = 2 words
                // Parts Array = 2 words (1 part)
                // Coordinates Array = numPts * 8 words
                recordWords = isIndexOnly ? 4 : (4 + 16 + 2 + 2 + 2 + (numPts * 8));
            }

            recordsMeta.push({
                offsetWords: (100 / 2) + contentSize,
                contentLengthWords: isIndexOnly ? 4 : (recordWords - 4),
                numPoints: numPts,
                coords: feat.coords
            });
            contentSize += recordWords;
        });

        const totalFileBytes = headerSize + (contentSize * 2);
        const buffer = new ArrayBuffer(isIndexOnly ? 100 + (features.length * 8) : totalFileBytes);
        const view = new DataView(buffer);

        // 1. เขียนส่วน File Header (100 bytes)
        view.setInt32(0, 9994, false); // File Code (Big-Endian)
        view.setInt32(24, isIndexOnly ? (100 + (features.length * 8)) / 2 : totalFileBytes / 2, false); // File Length
        view.setInt32(28, 1000, true); // Version 1000 (Little-Endian)
        view.setInt32(32, shapeType, true);    // Shape Type (Little-Endian)

        // Bounding Box
        view.setFloat64(36, minX, true); // Min X
        view.setFloat64(44, minY, true); // Min Y
        view.setFloat64(52, maxX, true); // Max X
        view.setFloat64(60, maxY, true); // Max Y
        view.setFloat64(68, 0.0, true);  // Min Z
        view.setFloat64(76, 0.0, true);  // Max Z
        view.setFloat64(84, 0.0, true);  // Min M
        view.setFloat64(92, 0.0, true);  // Max M

        if (isIndexOnly) {
            // เขียนโครงสร้างชิ้นดัชนี .shx
            let offset = 100;
            recordsMeta.forEach(rec => {
                view.setInt32(offset, rec.offsetWords, false);          // Big-Endian Offset in words
                view.setInt32(offset + 4, rec.contentLengthWords, false); // Big-Endian Record Length in words
                offset += 8;
            });
            return buffer;
        }

        // 2. เขียนเนื้อเรคคอร์ดจริงสำหรับไฟล์หลัก .shp
        let offset = 100;
        recordsMeta.forEach((rec, idx) => {
            // A. Record Header (8 bytes)
            view.setInt32(offset, idx + 1, false);                // Record Number 1-based (Big-Endian)
            view.setInt32(offset + 4, rec.contentLengthWords, false); // Content Length in words (Big-Endian)
            offset += 8;

            if (shapeType === 1) {
                // B. Point Shape Record (20 bytes)
                view.setInt32(offset, 1, true); // Shape Type Point: 1
                const pt = rec.coords[0] || [103.472, 17.975];
                view.setFloat64(offset + 4, pt[0], true); // X (Longitude)
                view.setFloat64(offset + 12, pt[1], true); // Y (Latitude)
                offset += 20;
            } else {
                // B. LineString/Polygon Shape Record
                view.setInt32(offset, shapeType, true); // Shape Type (3 or 5)

                // คำนวณ Bounding Box ของเฉพาะวัตถุนี้
                let rMinX = 180, rMinY = 90, rMaxX = -180, rMaxY = -90;
                rec.coords.forEach(pt => {
                    if (pt[0] < rMinX) rMinX = pt[0];
                    if (pt[1] < rMinY) rMinY = pt[1];
                    if (pt[0] > rMaxX) rMaxX = pt[0];
                    if (pt[1] > rMaxY) rMaxY = pt[1];
                });

                view.setFloat64(offset + 4, rMinX, true);  // Box MinX
                view.setFloat64(offset + 12, rMinY, true); // Box MinY
                view.setFloat64(offset + 20, rMaxX, true); // Box MaxX
                view.setFloat64(offset + 28, rMaxY, true); // Box MaxY

                view.setInt32(offset + 36, 1, true);              // NumParts
                view.setInt32(offset + 40, rec.numPoints, true);   // NumPoints
                view.setInt32(offset + 44, 0, true);              // Parts Index [0]

                offset += 48;

                // เขียนชุดคู่อันดับของพิกัด [lng, lat]
                rec.coords.forEach(pt => {
                    view.setFloat64(offset, pt[0], true);     // Longitude (X)
                    view.setFloat64(offset + 8, pt[1], true); // Latitude (Y)
                    offset += 16;
                });
            }
        });

        return buffer;
    },

    _compileDbfBinary(features) {
        // dBase III Specs:
        const fields = [
            { name: "ROAD_CODE", type: "C", length: 16 },
            { name: "ROAD_NAME", type: "C", length: 48 },
            { name: "ROAD_TYPE", type: "C", length: 24 },
            { name: "WIDTH",     type: "N", length: 8, decimal: 2 },
            { name: "LENGTH_M",  type: "N", length: 10, decimal: 2 },
            { name: "VILLAGE",   type: "N", length: 4, decimal: 0 }
        ];

        const headerSize = 32 + (fields.length * 32) + 1;
        
        let recordSize = 1;
        fields.forEach(f => recordSize += f.length);

        const totalDbfBytes = headerSize + (features.length * recordSize) + 1;
        const buffer = new ArrayBuffer(totalDbfBytes);
        const view = new DataView(buffer);
        const uint8 = new Uint8Array(buffer);

        view.setUint8(0, 0x03); // dBase III Version
        
        const now = new Date();
        view.setUint8(1, now.getFullYear() - 1900); // Year
        view.setUint8(2, now.getMonth() + 1);       // Month
        view.setUint8(3, now.getDate());            // Day
        
        view.setInt32(4, features.length, true);    // Number of records
        view.setUint16(8, headerSize, true);        // Length of header
        view.setUint16(10, recordSize, true);       // Length of each record

        let fieldOffset = 32;
        fields.forEach(f => {
            for (let i = 0; i < 11; i++) {
                uint8[fieldOffset + i] = i < f.name.length ? f.name.charCodeAt(i) : 0x00;
            }
            uint8[fieldOffset + 11] = f.type.charCodeAt(0); // Field Type
            view.setUint8(fieldOffset + 16, f.length);     // Field Length
            if (f.type === "N") uint8[fieldOffset + 17] = f.decimal || 0;
            fieldOffset += 32;
        });

        uint8[headerSize - 1] = 0x0D;

        let recordOffset = headerSize;
        const encoder = new TextEncoder();

        features.forEach(feat => {
            const r = feat.record;
            uint8[recordOffset] = 0x20;
            
            let dataOffset = recordOffset + 1;
            fields.forEach(f => {
                let val = "";
                if (f.name === "ROAD_CODE") val = r.road_id || "";
                else if (f.name === "ROAD_NAME") val = r.road_name || "";
                else if (f.name === "ROAD_TYPE") val = r.road_type || "";
                else if (f.name === "WIDTH") val = (r.width || 0).toFixed(2);
                else if (f.name === "LENGTH_M") val = (r.length_m || 0).toFixed(2);
                else if (f.name === "VILLAGE") val = String(r.village_no || 1);

                const encodedVal = encoder.encode(val);
                for (let i = 0; i < f.length; i++) {
                    uint8[dataOffset + i] = i < encodedVal.length ? encodedVal[i] : 0x20;
                }
                dataOffset += f.length;
            });

            recordOffset += recordSize;
        });

        uint8[totalDbfBytes - 1] = 0x1A;
        return buffer;
    },

    // ==========================================
    // WATER RESOURCES, WATERWAYS & DRAINAGE EXPORTS
    // ==========================================

    exportWaterGeoJSON(items, type) {
        const features = items.map(item => {
            let geom = item.geom;
            if (!geom || !geom.coordinates || !geom.coordinates.length) {
                const lon = item.longitude || 103.472;
                const lat = item.latitude || 17.975;
                if (type === 'res') {
                    // Polygon
                    geom = {
                        type: "Polygon",
                        coordinates: [[
                            [lon - 0.001, lat - 0.001],
                            [lon + 0.001, lat - 0.001],
                            [lon + 0.001, lat + 0.001],
                            [lon - 0.001, lat + 0.001],
                            [lon - 0.001, lat - 0.001]
                        ]]
                    };
                } else if (type === 'way') {
                    // LineString
                    geom = {
                        type: "LineString",
                        coordinates: [[lon, lat], [lon + 0.002, lat + 0.002]]
                    };
                } else {
                    // Point
                    geom = {
                        type: "Point",
                        coordinates: [lon, lat]
                    };
                }
            }
            
            let props = {};
            if (type === 'res') {
                props = {
                    water_code: item.water_code || '',
                    water_name: item.water_name || '',
                    water_type: item.water_type || 'หนอง',
                    area_sqm: parseFloat(item.surface_area_sqm) || 0,
                    depth_m: parseFloat(item.depth_m) || 0,
                    capacity: parseFloat(item.capacity_cum) || 0,
                    village_no: parseInt(item.village_no) || 1,
                    status: item.status || 'normal'
                };
            } else if (type === 'way') {
                props = {
                    way_code: item.waterway_code || '',
                    way_name: item.waterway_name || '',
                    way_type: item.waterway_type || 'คลองส่งน้ำ',
                    width_m: parseFloat(item.width_m) || 0,
                    depth_m: parseFloat(item.depth_m) || 0,
                    length_m: parseFloat(item.length_m) || 0,
                    village_no: parseInt(item.village_no) || 1,
                    status: item.status || 'normal'
                };
            } else if (type === 'drain') {
                props = {
                    asset_id: item.asset_id || '',
                    drain_type: item.drainage_type || 'ฝาท่อระบายน้ำ',
                    material: item.material || 'คอนกรีต',
                    width_m: parseFloat(item.width_m) || 0,
                    depth_m: parseFloat(item.depth_m) || 0,
                    length_m: parseFloat(item.length_m) || 0,
                    road_id: item.road_id || '',
                    village_no: parseInt(item.village_no) || 1,
                    status: item.status || 'good'
                };
            }

            return {
                type: "Feature",
                geometry: geom,
                properties: props
            };
        });

        return {
            type: "FeatureCollection",
            name: `water_${type}_gis`,
            crs: {
                type: "name",
                properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" }
            },
            features: features
        };
    },

    exportWaterKML(items, type) {
        let title = type === 'res' ? 'แหล่งน้ำนิ่งสาธารณะ' : (type === 'way' ? 'เส้นทางน้ำสาธารณะ' : 'ระบบระบายน้ำและฝาท่อ');
        let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${title}</name>
    <description>แผนภูมิพิกัด Master GIS Database (WGS 84)</description>
    <Style id="gisStyle">
      <LineStyle>
        <color>ff0ea5e9</color>
        <width>4</width>
      </LineStyle>
      <PolyStyle>
        <color>7f0ea5e9</color>
      </PolyStyle>
      <IconStyle>
        <color>ff0ea5e9</color>
        <scale>1.1</scale>
      </IconStyle>
    </Style>
`;

        items.forEach(item => {
            let geom = item.geom;
            let lon = item.longitude || 103.472;
            let lat = item.latitude || 17.975;
            
            let geomXML = "";
            if (type === 'drain') {
                geomXML = `<Point><coordinates>${lon},${lat},0</coordinates></Point>`;
            } else if (type === 'way') {
                let coordsStr = "";
                if (geom && geom.coordinates && geom.coordinates.length) {
                    coordsStr = geom.coordinates.map(coord => `${coord[0]},${coord[1]},0`).join(' ');
                } else {
                    coordsStr = `${lon},${lat},0 ${lon+0.002},${lat+0.002},0`;
                }
                geomXML = `<LineString><tessellate>1</tessellate><coordinates>${coordsStr}</coordinates></LineString>`;
            } else if (type === 'res') {
                let coordsStr = "";
                if (geom && geom.coordinates && geom.coordinates[0] && geom.coordinates[0].length) {
                    coordsStr = geom.coordinates[0].map(coord => `${coord[0]},${coord[1]},0`).join(' ');
                } else {
                    coordsStr = `${lon-0.001},${lat-0.001},0 ${lon+0.001},${lat-0.001},0 ${lon+0.001},${lat+0.001},0 ${lon-0.001},${lat+0.001},0 ${lon-0.001},${lat-0.001},0`;
                }
                geomXML = `<Polygon><outerBoundaryIs><LinearRing><coordinates>${coordsStr}</coordinates></LinearRing></outerBoundaryIs></Polygon>`;
            }

            let desc = "";
            let name = "";
            if (type === 'res') {
                name = item.water_name || 'แหล่งน้ำ';
                desc = `
                    <b>รหัสแหล่งน้ำ:</b> ${item.water_code || '-'}<br/>
                    <b>ประเภท:</b> ${item.water_type || '-'}<br/>
                    <b>พื้นที่:</b> ${item.surface_area_sqm || 0} ตร.ม.<br/>
                    <b>ลึกเฉลี่ย:</b> ${item.depth_m || 0} ม. | <b>ความจุ:</b> ${item.capacity_cum || 0} ลบ.ม.<br/>
                    <b>สถานะ:</b> ${item.status === 'normal' ? 'ปกติ/มีน้ำใช้' : 'ตื้นเขิน'}
                `;
            } else if (type === 'way') {
                name = item.waterway_name || 'เส้นทางน้ำ';
                desc = `
                    <b>รหัสเส้นทางน้ำ:</b> ${item.waterway_code || '-'}<br/>
                    <b>ประเภท:</b> ${item.waterway_type || '-'}<br/>
                    <b>กว้าง:</b> ${item.width_m || 0} ม. | <b>ลึก:</b> ${item.depth_m || 0} ม.<br/>
                    <b>ความยาว:</b> ${item.length_m || 0} ม.<br/>
                    <b>สถานะ:</b> ${item.status === 'normal' ? 'ไหลเวียนดี' : 'อุดตัน'}
                `;
            } else if (type === 'drain') {
                name = `${item.drainage_type} (${item.asset_id})`;
                desc = `
                    <b>รหัสสินทรัพย์:</b> ${item.asset_id || '-'}<br/>
                    <b>วัสดุ:</b> ${item.material || '-'}<br/>
                    <b>กว้าง:</b> ${item.width_m || 0} ม. | <b>ลึก:</b> ${item.depth_m || 0} ม.<br/>
                    <b>ความยาวราง:</b> ${item.length_m || 0} ม.<br/>
                    <b>พิกัดสายถนน:</b> ${item.road_id || '-'}<br/>
                    <b>สถานะ:</b> ${item.status === 'good' ? 'ปกติ' : 'อุดตัน'}
                `;
            }

            kml += `    <Placemark>
      <name>${name}</name>
      <description><![CDATA[${desc}]]></description>
      <styleUrl>#gisStyle</styleUrl>
      ${geomXML}
    </Placemark>
`;
        });

        kml += `  </Document>
</kml>`;
        return kml;
    },

    exportWaterCSV(items, type) {
        let headers, rows;
        if (type === 'res') {
            headers = ["ID", "Water Code", "Water Name", "Water Type", "Area (sqm)", "Depth (m)", "Capacity (cum)", "Village No", "Status", "Latitude", "Longitude"];
            rows = items.map(w => [
                w.id,
                `"${w.water_code || ''}"`,
                `"${w.water_name || ''}"`,
                `"${w.water_type || ''}"`,
                w.surface_area_sqm || 0,
                w.depth_m || 0,
                w.capacity_cum || 0,
                w.village_no || '1',
                `"${w.status || 'normal'}"`,
                w.latitude || 17.975,
                w.longitude || 103.472
            ]);
        } else if (type === 'way') {
            headers = ["ID", "Waterway Code", "Waterway Name", "Waterway Type", "Width (m)", "Depth (m)", "Length (m)", "Village No", "Status", "Latitude", "Longitude"];
            rows = items.map(ww => [
                ww.id,
                `"${ww.waterway_code || ''}"`,
                `"${ww.waterway_name || ''}"`,
                `"${ww.waterway_type || ''}"`,
                ww.width_m || 0,
                ww.depth_m || 0,
                ww.length_m || 0,
                ww.village_no || '1',
                `"${ww.status || 'normal'}"`,
                ww.latitude || 17.975,
                ww.longitude || 103.472
            ]);
        } else if (type === 'drain') {
            headers = ["ID", "Asset ID", "Drainage Type", "Material", "Width (m)", "Depth (m)", "Length (m)", "Road ID", "Village No", "Status", "Latitude", "Longitude"];
            rows = items.map(d => [
                d.id,
                `"${d.asset_id || ''}"`,
                `"${d.drainage_type || ''}"`,
                `"${d.material || ''}"`,
                d.width_m || 0,
                d.depth_m || 0,
                d.length_m || 0,
                `"${d.road_id || ''}"`,
                d.village_no || '1',
                `"${d.status || 'good'}"`,
                d.latitude || 17.975,
                d.longitude || 103.472
            ]);
        }

        return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    },

    async exportWaterSHP(items, type) {
        const JSZip = await this._loadJSZip();
        const zip = new JSZip();

        const prjContent = 'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]';
        zip.file("water.prj", prjContent);

        let shapeType = 3;
        if (type === 'res') shapeType = 5; // Polygon
        else if (type === 'way') shapeType = 3; // Polyline
        else if (type === 'drain') shapeType = 1; // Point

        let minX = 180, minY = 90, maxX = -180, maxY = -90;
        const validGeoms = [];

        items.forEach(item => {
            let coords = [];
            let geom = item.geom;
            const lon = item.longitude || 103.472;
            const lat = item.latitude || 17.975;
            
            if (geom && geom.coordinates) {
                if (shapeType === 1) {
                    coords = [geom.coordinates];
                } else if (shapeType === 3 && (geom.type === 'LineString' || geom.type === 'MultiLineString')) {
                    coords = geom.type === 'LineString' ? geom.coordinates : geom.coordinates[0];
                } else if (shapeType === 5 && geom.type === 'Polygon') {
                    coords = geom.coordinates[0] || [];
                }
            }
            
            if (!coords || coords.length === 0) {
                if (shapeType === 1) {
                    coords = [[lon, lat]];
                } else if (shapeType === 3) {
                    coords = [[lon, lat], [lon + 0.002, lat + 0.002]];
                } else if (shapeType === 5) {
                    coords = [
                        [lon - 0.001, lat - 0.001],
                        [lon + 0.001, lat - 0.001],
                        [lon + 0.001, lat + 0.001],
                        [lon - 0.001, lat + 0.001],
                        [lon - 0.001, lat - 0.001]
                    ];
                }
            }

            validGeoms.push({
                coords: coords,
                record: item
            });

            coords.forEach(pt => {
                if (pt[0] < minX) minX = pt[0];
                if (pt[1] < minY) minY = pt[1];
                if (pt[0] > maxX) maxX = pt[0];
                if (pt[1] > maxY) maxY = pt[1];
            });
        });

        if (!validGeoms.length) {
            minX = 103.472; minY = 17.975; maxX = 103.474; maxY = 17.977;
        }

        const shpBuffer = this._compileShpBinary(validGeoms, minX, minY, maxX, maxY, false, shapeType);
        const shxBuffer = this._compileShpBinary(validGeoms, minX, minY, maxX, maxY, true, shapeType);
        
        zip.file("water.shp", shpBuffer);
        zip.file("water.shx", shxBuffer);

        const dbfBuffer = this._compileWaterDbfBinary(validGeoms, type);
        zip.file("water.dbf", dbfBuffer);

        const zipBlob = await zip.generateAsync({ type: "blob" });
        return zipBlob;
    },

    _compileWaterDbfBinary(features, type) {
        let fields = [];
        if (type === 'res') {
            fields = [
                { name: "WATER_CODE", type: "C", length: 16 },
                { name: "WATER_NAME", type: "C", length: 48 },
                { name: "WATER_TYPE", type: "C", length: 24 },
                { name: "AREA_SQM",  type: "N", length: 10, decimal: 2 },
                { name: "DEPTH_M",   type: "N", length: 8, decimal: 2 },
                { name: "CAPACITY",  type: "N", length: 12, decimal: 2 },
                { name: "VILLAGE",   type: "N", length: 4, decimal: 0 }
            ];
        } else if (type === 'way') {
            fields = [
                { name: "WAY_CODE",  type: "C", length: 16 },
                { name: "WAY_NAME",  type: "C", length: 48 },
                { name: "WAY_TYPE",  type: "C", length: 24 },
                { name: "WIDTH_M",   type: "N", length: 8, decimal: 2 },
                { name: "DEPTH_M",   type: "N", length: 8, decimal: 2 },
                { name: "LENGTH_M",  type: "N", length: 10, decimal: 2 },
                { name: "VILLAGE",   type: "N", length: 4, decimal: 0 }
            ];
        } else if (type === 'drain') {
            fields = [
                { name: "ASSET_ID",   type: "C", length: 16 },
                { name: "DRAIN_TYPE", type: "C", length: 24 },
                { name: "MATERIAL",   type: "C", length: 24 },
                { name: "WIDTH_M",    type: "N", length: 8, decimal: 2 },
                { name: "DEPTH_M",    type: "N", length: 8, decimal: 2 },
                { name: "LENGTH_M",   type: "N", length: 8, decimal: 2 },
                { name: "ROAD_ID",    type: "C", length: 16 },
                { name: "VILLAGE",    type: "N", length: 4, decimal: 0 }
            ];
        }

        const headerSize = 32 + (fields.length * 32) + 1;
        let recordSize = 1;
        fields.forEach(f => recordSize += f.length);

        const totalDbfBytes = headerSize + (features.length * recordSize) + 1;
        const buffer = new ArrayBuffer(totalDbfBytes);
        const view = new DataView(buffer);
        const uint8 = new Uint8Array(buffer);

        view.setUint8(0, 0x03);
        const now = new Date();
        view.setUint8(1, now.getFullYear() - 1900);
        view.setUint8(2, now.getMonth() + 1);
        view.setUint8(3, now.getDate());
        view.setInt32(4, features.length, true);
        view.setUint16(8, headerSize, true);
        view.setUint16(10, recordSize, true);

        let fieldOffset = 32;
        fields.forEach(f => {
            for (let i = 0; i < 11; i++) {
                uint8[fieldOffset + i] = i < f.name.length ? f.name.charCodeAt(i) : 0x00;
            }
            uint8[fieldOffset + 11] = f.type.charCodeAt(0);
            view.setUint8(fieldOffset + 16, f.length);
            if (f.type === "N") uint8[fieldOffset + 17] = f.decimal || 0;
            fieldOffset += 32;
        });

        uint8[headerSize - 1] = 0x0D;

        let recordOffset = headerSize;
        const encoder = new TextEncoder();

        features.forEach(feat => {
            const r = feat.record;
            uint8[recordOffset] = 0x20;
            
            let dataOffset = recordOffset + 1;
            fields.forEach(f => {
                let val = "";
                if (type === 'res') {
                    if (f.name === "WATER_CODE") val = r.water_code || "";
                    else if (f.name === "WATER_NAME") val = r.water_name || "";
                    else if (f.name === "WATER_TYPE") val = r.water_type || "";
                    else if (f.name === "AREA_SQM") val = (r.surface_area_sqm || 0).toFixed(2);
                    else if (f.name === "DEPTH_M") val = (r.depth_m || 0).toFixed(2);
                    else if (f.name === "CAPACITY") val = (r.capacity_cum || 0).toFixed(2);
                    else if (f.name === "VILLAGE") val = String(r.village_no || 1);
                } else if (type === 'way') {
                    if (f.name === "WAY_CODE") val = r.waterway_code || "";
                    else if (f.name === "WAY_NAME") val = r.waterway_name || "";
                    else if (f.name === "WAY_TYPE") val = r.waterway_type || "";
                    else if (f.name === "WIDTH_M") val = (r.width_m || 0).toFixed(2);
                    else if (f.name === "DEPTH_M") val = (r.depth_m || 0).toFixed(2);
                    else if (f.name === "LENGTH_M") val = (r.length_m || 0).toFixed(2);
                    else if (f.name === "VILLAGE") val = String(r.village_no || 1);
                } else if (type === 'drain') {
                    if (f.name === "ASSET_ID") val = r.asset_id || "";
                    else if (f.name === "DRAIN_TYPE") val = r.drainage_type || "";
                    else if (f.name === "MATERIAL") val = r.material || "";
                    else if (f.name === "WIDTH_M") val = (r.width_m || 0).toFixed(2);
                    else if (f.name === "DEPTH_M") val = (r.depth_m || 0).toFixed(2);
                    else if (f.name === "LENGTH_M") val = (r.length_m || 0).toFixed(2);
                    else if (f.name === "ROAD_ID") val = r.road_id || "";
                    else if (f.name === "VILLAGE") val = String(r.village_no || 1);
                }

                const encodedVal = encoder.encode(val);
                for (let i = 0; i < f.length; i++) {
                    uint8[dataOffset + i] = i < encodedVal.length ? encodedVal[i] : 0x20;
                }
                dataOffset += f.length;
            });

        uint8[totalDbfBytes - 1] = 0x1A;
        return buffer;
    },

    exportPublicLandGeoJSON(items) {
        const features = items.map(item => {
            let geom = item.geom;
            const lon = item.longitude || 103.472;
            const lat = item.latitude || 17.975;
            
            if (!geom || !geom.coordinates || !geom.coordinates.length) {
                geom = {
                    type: "Polygon",
                    coordinates: [[
                        [lon - 0.001, lat - 0.001],
                        [lon + 0.001, lat - 0.001],
                        [lon + 0.001, lat + 0.001],
                        [lon - 0.001, lat + 0.001],
                        [lon - 0.001, lat - 0.001]
                    ]]
                };
            }
            
            return {
                type: "Feature",
                geometry: geom,
                properties: {
                    land_code: item.land_code || '',
                    land_name: item.land_name || '',
                    land_type: item.land_type || '',
                    area_rai: parseInt(item.area_rai) || 0,
                    area_ngan: parseInt(item.area_ngan) || 0,
                    area_sqwa: parseFloat(item.area_sqwa) || 0,
                    village_no: String(item.village_no || '1'),
                    status: item.status || 'used',
                    current_use: item.current_use || ''
                }
            };
        });

        return {
            type: "FeatureCollection",
            name: "public_lands_master_gis",
            crs: {
                type: "name",
                properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" }
            },
            features: features
        };
    },

    exportPublicLandKML(items) {
        let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>ทะเบียนที่ดินสาธารณประโยชน์ อปท.</name>
    <description>แผนภูมิพิกัดแนวแปลงที่ดินสาธารณประโยชน์ Master GIS Database (WGS 84)</description>
    <Style id="landPolyStyle">
      <LineStyle>
        <color>ff16a34a</color>
        <width>2</width>
      </LineStyle>
      <PolyStyle>
        <color>7f4ade80</color>
      </PolyStyle>
    </Style>
`;

        items.forEach(item => {
            let coordsStr = "";
            let geom = item.geom;
            
            if (geom && geom.type === 'Polygon' && geom.coordinates && geom.coordinates[0]) {
                coordsStr = geom.coordinates[0].map(coord => `${coord[0]},${coord[1]},0`).join(' ');
            } else {
                const lon = item.longitude || 103.472;
                const lat = item.latitude || 17.975;
                coordsStr = `${lon - 0.001},${lat - 0.001},0 ${lon + 0.001},${lat - 0.001},0 ${lon + 0.001},${lat + 0.001},0 ${lon - 0.001},${lat + 0.001},0 ${lon - 0.001},${lat - 0.001},0`;
            }

            kml += `    <Placemark>
      <name>${item.land_name || item.land_code}</name>
      <description>รหัส: ${item.land_code || ''}\nประเภท: ${item.land_type || ''}\nเนื้อที่: ${item.area_rai || 0} ไร่ ${item.area_ngan || 0} งาน ${item.area_sqwa || 0} ตร.ว.\nสถานะ: ${item.status || ''}</description>
      <styleUrl>#landPolyStyle</styleUrl>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${coordsStr}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
`;
        });

        kml += `  </Document>
</kml>`;
        return kml;
    },

    exportPublicLandCSV(items) {
        const headers = ["ID", "LAND_CODE", "LAND_NAME", "LAND_TYPE", "AREA_RAI", "AREA_NGAN", "AREA_SQWA", "VILLAGE_NO", "STATUS", "CURRENT_USE", "LATITUDE", "LONGITUDE"];
        const rows = items.map(item => [
            `"${item.id || ''}"`,
            `"${item.land_code || ''}"`,
            `"${item.land_name || ''}"`,
            `"${item.land_type || ''}"`,
            parseInt(item.area_rai) || 0,
            parseInt(item.area_ngan) || 0,
            parseFloat(item.area_sqwa) || 0,
            `"${item.village_no || '1'}"`,
            `"${item.status || 'used'}"`,
            `"${(item.current_use || '').replace(/"/g, '""')}"`,
            item.latitude || 17.975,
            item.longitude || 103.472
        ]);
        return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    },

    async exportPublicLandSHP(items) {
        const JSZip = await this._loadJSZip();
        const zip = new JSZip();

        const prjContent = 'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]';
        zip.file("public_land.prj", prjContent);

        const shapeType = 5; // Polygon shape type

        let minX = 180, minY = 90, maxX = -180, maxY = -90;
        const validGeoms = [];

        items.forEach(item => {
            let coords = [];
            let geom = item.geom;
            const lon = item.longitude || 103.472;
            const lat = item.latitude || 17.975;
            
            if (geom && geom.coordinates && geom.coordinates[0]) {
                coords = geom.coordinates[0];
            }
            
            if (!coords || coords.length === 0) {
                coords = [
                    [lon - 0.001, lat - 0.001],
                    [lon + 0.001, lat - 0.001],
                    [lon + 0.001, lat + 0.001],
                    [lon - 0.001, lat + 0.001],
                    [lon - 0.001, lat - 0.001]
                ];
            }

            validGeoms.push({
                coords: coords,
                record: item
            });

            coords.forEach(pt => {
                if (pt[0] < minX) minX = pt[0];
                if (pt[1] < minY) minY = pt[1];
                if (pt[0] > maxX) maxX = pt[0];
                if (pt[1] > maxY) maxY = pt[1];
            });
        });

        if (!validGeoms.length) {
            minX = 103.472; minY = 17.975; maxX = 103.474; maxY = 17.977;
        }

        const shpBuffer = this._compileShpBinary(validGeoms, minX, minY, maxX, maxY, false, shapeType);
        const shxBuffer = this._compileShpBinary(validGeoms, minX, minY, maxX, maxY, true, shapeType);
        
        zip.file("public_land.shp", shpBuffer);
        zip.file("public_land.shx", shxBuffer);

        const dbfBuffer = this._compilePublicLandDbfBinary(validGeoms);
        zip.file("public_land.dbf", dbfBuffer);

        const zipBlob = await zip.generateAsync({ type: "blob" });
        return zipBlob;
    },

    _compilePublicLandDbfBinary(features) {
        const fields = [
            { name: "LAND_CODE", type: "C", length: 16 },
            { name: "LAND_NAME", type: "C", length: 48 },
            { name: "LAND_TYPE", type: "C", length: 24 },
            { name: "AREA_RAI",  type: "N", length: 8, decimal: 0 },
            { name: "AREA_NGAN", type: "N", length: 8, decimal: 0 },
            { name: "AREA_SQWA", type: "N", length: 10, decimal: 2 },
            { name: "VILLAGE",   type: "N", length: 4, decimal: 0 },
            { name: "STATUS",    type: "C", length: 24 },
            { name: "CURRENT_US", type: "C", length: 120 }
        ];

        const headerSize = 32 + (fields.length * 32) + 1;
        let recordSize = 1;
        fields.forEach(f => recordSize += f.length);

        const totalDbfBytes = headerSize + (features.length * recordSize) + 1;
        const buffer = new ArrayBuffer(totalDbfBytes);
        const view = new DataView(buffer);
        const uint8 = new Uint8Array(buffer);

        view.setUint8(0, 0x03);
        const now = new Date();
        view.setUint8(1, now.getFullYear() - 1900);
        view.setUint8(2, now.getMonth() + 1);
        view.setUint8(3, now.getDate());
        view.setInt32(4, features.length, true);
        view.setUint16(8, headerSize, true);
        view.setUint16(10, recordSize, true);

        let fieldOffset = 32;
        fields.forEach(f => {
            for (let i = 0; i < 11; i++) {
                uint8[fieldOffset + i] = i < f.name.length ? f.name.charCodeAt(i) : 0x00;
            }
            uint8[fieldOffset + 11] = f.type.charCodeAt(0);
            view.setUint8(fieldOffset + 16, f.length);
            if (f.type === "N") uint8[fieldOffset + 17] = f.decimal || 0;
            fieldOffset += 32;
        });

        uint8[headerSize - 1] = 0x0D;

        let recordOffset = headerSize;
        const encoder = new TextEncoder();

        features.forEach(feat => {
            const r = feat.record;
            uint8[recordOffset] = 0x20;
            
            let dataOffset = recordOffset + 1;
            fields.forEach(f => {
                let val = "";
                if (f.name === "LAND_CODE") val = r.land_code || "";
                else if (f.name === "LAND_NAME") val = r.land_name || "";
                else if (f.name === "LAND_TYPE") val = r.land_type || "";
                else if (f.name === "AREA_RAI") val = String(r.area_rai || 0);
                else if (f.name === "AREA_NGAN") val = String(r.area_ngan || 0);
                else if (f.name === "AREA_SQWA") val = (r.area_sqwa || 0).toFixed(2);
                else if (f.name === "VILLAGE") val = String(r.village_no || 1);
                else if (f.name === "STATUS") val = r.status || "";
                else if (f.name === "CURRENT_US") val = r.current_use || "";

                const encodedVal = encoder.encode(val);
                for (let i = 0; i < f.length; i++) {
                    uint8[dataOffset + i] = i < encodedVal.length ? encodedVal[i] : 0x20;
                }
                dataOffset += f.length;
            });

            recordOffset += recordSize;
        });

        uint8[totalDbfBytes - 1] = 0x1A;
        return buffer;
    }
};

// ส่งออกบริการไปยังขอบเขตของ Window
window.GISExportService = GISExportService;
