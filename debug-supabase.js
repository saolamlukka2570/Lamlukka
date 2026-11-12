const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function debugSupabase() {
    try {
        const content = fs.readFileSync('e:/ANTIGRAVITY/Smart governance/assets/js/supabase-client.js', 'utf8');
        const urlMatch = content.match(/const SUPABASE_URL = '(.*?)'/);
        const keyMatch = content.match(/const SUPABASE_ANON_KEY = '(.*?)'/);
        const url = urlMatch[1];
        const key = keyMatch[1];
        
        const supabaseClient = createClient(url, key);
        
        // Find a member that doesn't have an elderly record
        const {data: members} = await supabaseClient.from('dd_household_members').select('id, first_name').limit(10);
        let memberId = members[1].id;
        
        console.log("Testing with member ID:", memberId);
        
        // Emulate saveElderly EXACTLY as written in household-service.js
        const {data: existing, error: selectErr} = await supabaseClient.from('dd_elderly').select('id').eq('household_member_id', memberId).single();
        console.log("Select returned - existing:", existing, "error:", selectErr);
        
        let error;
        if (existing) {
            console.log("Updating...");
            ({error} = await supabaseClient.from('dd_elderly').update({welfare_status: "700"}).eq('id', existing.id));
        } else {
            console.log("Inserting...");
            const data = {
                household_member_id: memberId,
                dependency_level: 'ติดสังคม',
                welfare_status: '600',
                caregiver: 'test',
                gps_verified: false
            };
            ({error} = await supabaseClient.from('dd_elderly').insert([data]));
        }
        
        console.log("Final error:", error);
        
    } catch(e) {
        console.error("Exception:", e);
    }
}
debugSupabase();
