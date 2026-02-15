// config.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://khnkxahjaznzczfswfkb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_6_0v8xzUm68RdgOP6k6tQQ_CpxnzRzP';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);