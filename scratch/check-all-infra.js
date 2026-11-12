const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://blotxjrfsqsmkwyftfmv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_GC8ms66XBVFogFlbWlwJ2g_Bhu44EG_';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkAllData() {
    const tables = [
        {name: 'infra_roads', fields: 'id, road_name, road_type'},
        {name: 'infra_water_resources', fields: 'id, water_name, water_type'},
        {name: 'infra_waterways', fields: 'id, waterway_name, waterway_type'},
        {name: 'infra_drainage_assets', fields: 'id, asset_id, drainage_type'},
        {name: 'infra_public_lands', fields: 'id, land_name, land_type'},
        {name: 'infra_boundaries', fields: 'id, boundary_name, boundary_type'},
        {name: 'infra_boundary_markers', fields: 'id, marker_code, marker_type'}
    ];

    for (let t of tables) {
        const { data, error } = await supabase.from(t.name).select(t.fields);
        if (error) {
            console.log(`Error in ${t.name}: ${error.message}`);
        } else {
            console.log(`--- ${t.name} ---`);
            console.log(data);
        }
    }
}
checkAllData();
