// Try to run SQL via Supabase RPC / Management API
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://faqueaejsbkmpurjmubv.supabase.co';
const ANON_KEY = 'sb_publishable_6ZJhrY9TGgEuTgDFLlPE3g_-Tv0IK5y';
const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function run() {
  // Try various approaches to run SQL
  const sql = `ALTER TABLE settings_profit ADD COLUMN IF NOT EXISTS persen numeric DEFAULT 0;`;
  
  // Approach 1: Try to call possible RPC functions
  for (const fn of ['exec_sql', 'execute_sql', 'pgm_execute', 'run_sql']) {
    try {
      const { data, error } = await supabase.rpc(fn, { query: sql });
      console.log(`RPC ${fn}:`, error ? `✗ ${error.message}` : `✓ Success`);
      if (data) console.log('  Data:', data);
    } catch (e) {
      console.log(`RPC ${fn}: ✗ ${e.message}`);
    }
  }
  
  // Approach 2: Try to use supabase REST API with service key
  // The service_role key can be derived... but we don't have it.
  
  // Approach 3: Print SQL for manual execution
  console.log('\n========== MANUAL SQL ==========');
  console.log(require('fs').readFileSync('supabase/migration_profit_merge_persen.sql', 'utf8'));
  console.log('================================');
}

run().catch(console.error);
