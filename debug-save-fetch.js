const fs = require('fs');

async function debugSave() {
    try {
        const content = fs.readFileSync('e:/ANTIGRAVITY/Smart governance/assets/js/supabase-client.js', 'utf8');
        const urlMatch = content.match(/const SUPABASE_URL = '(.*?)'/);
        const keyMatch = content.match(/const SUPABASE_ANON_KEY = '(.*?)'/);
        const url = urlMatch[1];
        const key = keyMatch[1];
        
        // Find a member
        let res = await fetch(`${url}/rest/v1/dd_household_members?select=id&limit=1`, {
            headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
        });
        const members = await res.json();
        const memberId = members[0].id;
        console.log("Testing with member ID:", memberId);
        
        // Check existing
        res = await fetch(`${url}/rest/v1/dd_elderly?select=id&household_member_id=eq.${memberId}&limit=1`, {
            headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
        });
        const existingArr = await res.json();
        console.log("Existing array:", existingArr);
        
        const data = {
            household_member_id: memberId,
            dependency_level: 'ติดสังคม',
            welfare_status: '600',
            caregiver: 'test',
            gps_verified: false
        };
        
        if (existingArr.length > 0) {
            console.log("Updating existing:", existingArr[0].id);
            res = await fetch(`${url}/rest/v1/dd_elderly?id=eq.${existingArr[0].id}`, {
                method: 'PATCH',
                headers: {
                    'apikey': key, 'Authorization': 'Bearer ' + key,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(data)
            });
        } else {
            console.log("Inserting new");
            res = await fetch(`${url}/rest/v1/dd_elderly`, {
                method: 'POST',
                headers: {
                    'apikey': key, 'Authorization': 'Bearer ' + key,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(data)
            });
        }
        const text = await res.text();
        console.log("Save status:", res.status, text);
    } catch(e) {
        console.error("Exception:", e);
    }
}
debugSave();
