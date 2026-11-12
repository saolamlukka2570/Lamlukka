// assets/js/supabase-client.js
// Supabase Client Initialization
// Requires importing the Supabase JS library via CDN in your HTML files before this script:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

// Supabase Project ID: 'blotxjrfsqsmkwyftfmv'
const SUPABASE_PROJECT_ID = 'blotxjrfsqsmkwyftfmv';
const SUPABASE_URL = 'https://blotxjrfsqsmkwyftfmv.supabase.co';
const SUPABASE_REST_URL = 'https://blotxjrfsqsmkwyftfmv.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'sb_publishable_GC8ms66XBVFogFlbWlwJ2g_Bhu44EG_';
const SUPABASE_SECRET_KEY = 'sb_secret_x8mzeWqk0b_RaoQnWr9vyg_dT3fgc2r';

let supabaseClient = null;

// Initialize only if the library is loaded and keys are provided
if (typeof window.supabase !== 'undefined' && SUPABASE_URL) {
    const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const LOCAL_PROXY_BASE = 'http://localhost:3000/supabase-proxy';

    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
            fetch: async (url, options = {}) => {
                const urlStr = url.toString();
                // On localhost, try routing through the local backend proxy (which uses SUPABASE_SECRET_KEY and bypasses RLS)
                if (isLocalHost && urlStr.startsWith(SUPABASE_URL)) {
                    const proxyUrl = LOCAL_PROXY_BASE + urlStr.slice(SUPABASE_URL.length);
                    try {
                        const proxyRes = await fetch(proxyUrl, { ...options, cache: 'no-store' });
                        if (proxyRes.status !== 502) {
                            return proxyRes;
                        }
                    } catch (_) {
                        // Local proxy server not running; fall through to direct Supabase call
                    }
                }
                return fetch(url, { ...options, cache: 'no-store' });
            }
        }
    });
    console.log("Supabase Client Initialized.");
} else {
    console.warn("Supabase library not loaded or credentials not provided. Running in UI-only mode.");
}

// Example Mock Functions for Frontend Logic if Supabase is not configured
const mockAuth = {
    login: async (email, password) => {
        // Mock successful login
        console.warn("Using mock auth login. Supabase is not configured.");
        return { data: { user: { id: 1, email: email, user_metadata: { full_name: 'สมชาย ใจดี' } } }, error: null };
    },
    logout: async () => {
        return { error: null };
    }
};

// Global Auth Functions Wrapper
const authService = {
    login: async (email, password) => {
        if (!supabaseClient) return mockAuth.login(email, password);
        return await supabaseClient.auth.signInWithPassword({ email, password });
    },
    logout: async () => {
        if (!supabaseClient) return mockAuth.logout();
        return await supabaseClient.auth.signOut();
    },
    getUser: async () => {
        if (!supabaseClient) return null;
        const { data: { user } } = await supabaseClient.auth.getUser();
        return user;
    }
};
