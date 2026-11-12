const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://blotxjrfsqsmkwyftfmv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_GC8ms66XBVFogFlbWlwJ2g_Bhu44EG_';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function deleteMockData() {
    // 1. Delete mock roads
    console.log('Deleting mock roads...');
    const { data: roads, error: errRoads } = await supabase
        .from('infra_roads')
        .delete()
        .in('id', ['b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', '2085a369-694f-4595-b665-2ebb54ac62d5']);
    if (errRoads) console.error('Error deleting roads:', errRoads.message);
    else console.log('Successfully deleted mock roads.');

    // 2. Delete mock water resources
    console.log('Deleting mock water resources...');
    const { data: water, error: errWater } = await supabase
        .from('infra_water_resources')
        .delete()
        .in('id', ['b8f2fb20-c861-452a-a7af-389dab496889']);
    if (errWater) console.error('Error deleting water resources:', errWater.message);
    else console.log('Successfully deleted mock water resources.');

    // 3. Delete mock waterways
    console.log('Deleting mock waterways...');
    const { data: waterways, error: errWaterways } = await supabase
        .from('infra_waterways')
        .delete()
        .in('id', ['c479edf9-a9c7-4592-afcc-7c2d2b583c15']);
    if (errWaterways) console.error('Error deleting waterways:', errWaterways.message);
    else console.log('Successfully deleted mock waterways.');
}

deleteMockData();
