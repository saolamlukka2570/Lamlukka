const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://blotxjrfsqsmkwyftfmv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_GC8ms66XBVFogFlbWlwJ2g_Bhu44EG_';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkSchema() {
    const { data, error } = await supabase.rpc('get_column_info', { table_name: 'electric_poles' });
    if (error) {
        console.log("RPC failed, trying raw insert to see error...");
        const payload = {
            pole_code: '123456789012',
            pole_type: '123456789012',
            light_type: '123456789012',
            village_no: '123456789012',
            location_detail: '123456789012',
            lat: 0,
            lng: 0,
            status: '123456789012'
        };
        const { error: insertErr } = await supabase.from('electric_poles').insert([payload]);
        console.log("Insert error:", insertErr);
    } else {
        console.log(data);
    }
}
checkSchema();
