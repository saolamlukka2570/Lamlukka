const fs = require('fs');

async function checkSchema() {
    const content = fs.readFileSync('e:/ANTIGRAVITY/Smart governance/assets/js/supabase-client.js', 'utf8');
    const urlMatch = content.match(/const\s+supabaseUrl\s*=\s*['"]([^'"]+)['"]/);
    const keyMatch = content.match(/const\s+supabaseKey\s*=\s*['"]([^'"]+)['"]/);
    
    if (!urlMatch || !keyMatch) return console.log("Missing config");
    
    const res = await fetch(`${urlMatch[1]}/rest/v1/dd_disabled_persons?select=*&limit=1`, {
        headers: { 'apikey': keyMatch[1], 'Authorization': `Bearer ${keyMatch[1]}` }
    });
    console.log("Status:", res.status);
    console.log("Data:", await res.json());
}
checkSchema();
checkSchema();
