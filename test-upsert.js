const fs = require('fs');
async function testUpsert() {
    const content = fs.readFileSync('e:/ANTIGRAVITY/Smart governance/assets/js/supabase-client.js', 'utf8');
    const urlMatch = content.match(/const SUPABASE_URL = '(.*?)'/);
    const keyMatch = content.match(/const SUPABASE_ANON_KEY = '(.*?)'/);
    const url = urlMatch[1];
    const key = keyMatch[1];
    
    // Attempt upsert
    const data = {
        household_member_id: "777c5c08-0138-41ec-b286-cdad604ce172", // Dummy or just test error
        dependency_level: "ติดสังคม",
        welfare_status: "600"
    };
    
    const res = await fetch(`${url}/rest/v1/dd_elderly?on_conflict=household_member_id`, {
        method: 'POST',
        headers: {
            'apikey': key,
            'Authorization': 'Bearer ' + key,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(data)
    });
    
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
}
testUpsert();
