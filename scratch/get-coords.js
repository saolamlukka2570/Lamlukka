const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://blotxjrfsqsmkwyftfmv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_GC8ms66XBVFogFlbWlwJ2g_Bhu44EG_';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function getCoords() {
    const { data: roads } = await supabase.from('infra_roads').select('latitude, longitude').not('latitude', 'is', null).limit(1);
    console.log("Road coords:", roads);
    const { data: markers } = await supabase.from('infra_boundary_markers').select('latitude, longitude').not('latitude', 'is', null).limit(1);
    console.log("Marker coords:", markers);
}
getCoords();
