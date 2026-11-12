const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://blotxjrfsqsmkwyftfmv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_GC8ms66XBVFogFlbWlwJ2g_Bhu44EG_';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const tables = [
    'infra_roads',
    'infra_water_resources',
    'infra_waterways',
    'infra_drainage_assets',
    'infra_public_lands',
    'infra_boundary_markers'
];

async function checkData() {
    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*');
        if (error) {
            console.log(`Error reading ${table}: ${error.message}`);
        } else {
            console.log(`\n--- ${table} (${data.length} records shown) ---`);
            data.forEach(r => console.log(JSON.stringify(r)));
        }
    }
}

checkData();
