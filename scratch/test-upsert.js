const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://blotxjrfsqsmkwyftfmv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_GC8ms66XBVFogFlbWlwJ2g_Bhu44EG_';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testUpsert() {
    const payload1 = { pole_code: 'TEST_01', pole_type: 'Test', village_no: '1', light_type: 'Test', status: 'normal' };
    const payload2 = { pole_code: 'TEST_01', pole_type: 'Test Update', village_no: '1', light_type: 'Test', status: 'normal' };
    
    console.log("Upserting payload1...");
    let res1 = await supabase.from('electric_poles').upsert([payload1], { onConflict: 'pole_code' });
    console.log(res1.error);
    
    console.log("Upserting payload2...");
    let res2 = await supabase.from('electric_poles').upsert([payload2], { onConflict: 'pole_code' });
    console.log(res2.error);
    
    console.log("Deleting test record...");
    await supabase.from('electric_poles').delete().eq('pole_code', 'TEST_01');
}
testUpsert();
