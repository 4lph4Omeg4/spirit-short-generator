import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn("Supabase credentials missing! Check .env.local");
    console.warn("Checked: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_ANON_KEY");
} else {
    console.log("Supabase Client Initialized with URL:", supabaseUrl.substring(0, 20) + "...");
}

export const supabase = createClient(supabaseUrl || 'https://auth.timeline-alchemy.nl', supabaseKey || 'placeholder');
