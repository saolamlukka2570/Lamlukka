const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function debugSave() {
    try {
        const content = fs.readFileSync('e:/ANTIGRAVITY/Smart governance/assets/js/supabase-client.js', 'utf8');
        const urlMatch = content.match(/const SUPABASE_URL = '(.*?)'/);
        const keyMatch = content.match(/const SUPABASE_ANON_KEY = '(.*?)'/);
        const url = urlMatch[1];
        const key = keyMatch[1];
        
        const supabaseClient = createClient(url, key);
        
        // Find a member to test with
        const {data: member} = await supabaseClient.from('dd_household_members').select('id').limit(1).single();
        if (!member) {
            console.log("No members found");
            return;
        }
        const memberId = member.id;
        console.log("Testing with member ID:", memberId);
        
        const data = {
            household_member_id: memberId,
            dependency_level: 'ติดสังคม',
            welfare_status: '600',
            caregiver: 'test',
            gps_verified: false
        };
        
        // Emulate saveElderly
        const {data: existing} = await supabaseClient.from('dd_elderly').select('id').eq('household_member_id', memberId).single();
        let error;
        if (existing) {
            console.log("Updating existing:", existing.id);
            ({error} = await supabaseClient.from('dd_elderly').update(data).eq('id', existing.id));
        } else {
            console.log("Inserting new");
            ({error} = await supabaseClient.from('dd_elderly').insert([data]));
        }
        
        if (error) {
            console.log("Error during save:", error);
        } else {
            console.log("Success!");
        }
    } catch(e) {
        console.error("Exception:", e);
    }
}
debugSave();
