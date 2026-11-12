const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://blotxjrfsqsmkwyftfmv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_GC8ms66XBVFogFlbWlwJ2g_Bhu44EG_';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkSchema() {
    let fields = ['pole_code', 'pole_type', 'light_type', 'village_no', 'status'];
    for (let f of fields) {
        let payload = { pole_code: '1', pole_type: '1', light_type: '1', village_no: '1', status: '1' };
        payload[f] = '123456789012'; // 12 chars
        const { error } = await supabase.from('electric_poles').insert([payload]);
        if (error && error.message.includes('too long')) {
            console.log(f + " is varchar(10)");
        } else {
            console.log(f + " is NOT varchar(10)");
        }
    }
}
checkSchema();
