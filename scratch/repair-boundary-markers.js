const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function repairMarkers() {
    try {
        const content = fs.readFileSync('e:/ANTIGRAVITY/Smart governance/assets/js/supabase-client.js', 'utf8');
        const urlMatch = content.match(/const SUPABASE_URL = '(.*?)'/);
        const keyMatch = content.match(/const SUPABASE_ANON_KEY = '(.*?)'/);
        const url = urlMatch[1];
        const key = keyMatch[1];
        
        const supabaseClient = createClient(url, key);
        
        console.log("Loading all markers from database...");
        const { data: markers, error } = await supabaseClient
            .from('infra_boundary_markers')
            .select('*');
            
        if (error) {
            console.error("Error fetching markers:", error);
            return;
        }
        
        console.log(`Found ${markers.length} markers in database.`);
        let repairedCount = 0;
        
        for (const m of markers) {
            let lat = m.latitude;
            let lng = m.longitude;
            let needsUpdate = false;
            
            // Check if coordinates are in UTM/invalid degrees
            const isInvalidLat = !lat || lat < -90 || lat > 90;
            const isInvalidLng = !lng || lng < -180 || lng > 180;
            
            if (isInvalidLat || isInvalidLng) {
                console.log(`Marker Code ${m.marker_code} has invalid coordinates in table: [${lat}, ${lng}]`);
                
                // Try parsing geometry_geojson
                let geom = m.geometry_geojson;
                if (typeof geom === 'string') {
                    try { geom = JSON.parse(geom); } catch(e) {}
                }
                
                if (geom && geom.type === 'Point' && geom.coordinates) {
                    const geoLng = geom.coordinates[0];
                    const geoLat = geom.coordinates[1];
                    
                    const isValidGeoLat = geoLat >= -90 && geoLat <= 90;
                    const isValidGeoLng = geoLng >= -180 && geoLng <= 180;
                    
                    if (isValidGeoLat && isValidGeoLng) {
                        console.log(`  -> Found valid WGS84 coordinates in geometry_geojson: [${geoLat}, ${geoLng}]`);
                        m.latitude = geoLat;
                        m.longitude = geoLng;
                        needsUpdate = true;
                    }
                }
            }
            
            if (needsUpdate) {
                console.log(`  -> Repairing Marker Code ${m.marker_code}...`);
                const { error: updateError } = await supabaseClient
                    .from('infra_boundary_markers')
                    .update({
                        latitude: m.latitude,
                        longitude: m.longitude,
                        coord_x: m.coord_x || m.longitude,
                        coord_y: m.coord_y || m.latitude
                    })
                    .eq('id', m.id);
                    
                if (updateError) {
                    console.error(`  -> Failed to repair ${m.marker_code}:`, updateError);
                } else {
                    console.log(`  -> Successfully repaired ${m.marker_code}!`);
                    repairedCount++;
                }
            }
        }
        
        console.log(`\nRepair process completed. Repaired ${repairedCount} markers.`);
        
    } catch(e) {
        console.error("Exception during repair:", e);
    }
}
repairMarkers();
