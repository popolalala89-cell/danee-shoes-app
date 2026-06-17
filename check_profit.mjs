import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.+)/)?.[1]?.trim() || '';
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim() || '';
if (!url || !key) { console.error('Missing env vars'); process.exit(1); }
const sb = createClient(url, key);
const { data } = await sb.from('settings_profit').select('*');
console.log(JSON.stringify(data, null, 2));
