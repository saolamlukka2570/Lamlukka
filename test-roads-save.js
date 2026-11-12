const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function testRoadsSave() {
    try {
        const content = fs.readFileSync('e:/ANTIGRAVITY/Smart governance/assets/js/supabase-client.js', 'utf8');
        const urlMatch = content.match(/const SUPABASE_URL = '(.*?)'/);
        const keyMatch = content.match(/const SUPABASE_ANON_KEY = '(.*?)'/);
        
        if (!urlMatch || !keyMatch) {
            console.error("Could not parse Supabase URL or Key from supabase-client.js");
            return;
        }

        const url = urlMatch[1];
        const key = keyMatch[1];
        console.log("Supabase URL:", url);
        
        const supabase = createClient(url, key);
        
        // 1. Try querying infra_roads table
        console.log("Checking if 'infra_roads' table exists...");
        const { data: selectData, error: selectError } = await supabase.from('infra_roads').select('id').limit(1);
        if (selectError) {
            console.error("Select error (table might not exist):", selectError);
            return;
        }
        console.log("Select succeeded. infra_roads table exists! Found records:", selectData);

        // 2. Try inserting a mock road with a GeoJSON geometry object
        console.log("Trying insert with GeoJSON object...");
        const payloadGeoJSON = {
            road_id: 'TEST-GEOJSON-' + Math.floor(Math.random() * 10000),
            road_name: 'ถนนทดสอบ GeoJSON',
            road_type: 'ถนนภายในตำบล',
            latitude: 17.975,
            longitude: 103.472,
            geom: {
                type: 'LineString',
                coordinates: [[103.472, 17.975], [103.475, 17.978]]
            }
        };
        const { data: resGeoJSON, error: errGeoJSON } = await supabase.from('infra_roads').insert([payloadGeoJSON]).select();
        console.log("Insert with GeoJSON result:", errGeoJSON ? "FAILED" : "SUCCESS", errGeoJSON || "");

        // 3. Try inserting a mock road with WKT string
        console.log("Trying insert with WKT string...");
        const payloadWKT = {
            road_id: 'TEST-WKT-' + Math.floor(Math.random() * 10000),
            road_name: 'ถนนทดสอบ WKT',
            road_type: 'ถนนภายในตำบล',
            latitude: 17.975,
            longitude: 103.472,
            geom: 'SRID=4326;LINESTRING(103.472 17.975, 103.475 17.978)'
        };
        const { data: resWKT, error: errWKT } = await supabase.from('infra_roads').insert([payloadWKT]).select();
        console.log("Insert with WKT result:", errWKT ? "FAILED" : "SUCCESS", errWKT || "");

    } catch (e) {
        console.error("Exception:", e);
    }
}

testRoadsSave();
