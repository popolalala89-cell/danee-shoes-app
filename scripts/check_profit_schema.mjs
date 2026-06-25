// Try to connect to Supabase database directly
// Project ref: faqueaejsbkmpurjmubv
// URL: https://faqueaejsbkmpurjmubv.supabase.co

const SUPABASE_URL = 'https://faqueaejsbkmpurjmubv.supabase.co';
const ANON_KEY = 'sb_publishable_6ZJhrY9TGgEuTgDFLlPE3g_-Tv0IK5y';

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

// Try to fetch settings_profit to see current data
const { data, error } = await supabase.from('settings_profit').select('peran, persen, clean_pct, repair_pct, base_gaji').limit(20);
console.log('Current settings_profit data:');
if (error) {
  console.error('Error:', error.message);
} else {
  console.log(JSON.stringify(data, null, 2));
}

// Check if persen column already exists
if (data && data.length > 0) {
  const firstRow = data[0];
  console.log('\nColumns available:', Object.keys(firstRow).join(', '));
  if ('persen' in firstRow) {
    console.log('\n✓ Kolom "persen" sudah ada!');
  } else {
    console.log('\n✗ Kolom "persen" belum ada — perlu SQL migration');
  }
}
