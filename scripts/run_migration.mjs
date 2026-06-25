import pg from 'pg';

const PROJECT_REF = 'faqueaejsbkmpurjmubv';
const HOST = `db.${PROJECT_REF}.supabase.co`;

async function tryConnect() {
  const configs = [
    // Try common patterns
    { host: HOST, port: 5432, database: 'postgres', user: 'postgres', password: 'postgres' },
    { host: HOST, port: 5432, database: 'postgres', user: 'postgres', password: '' },
    // Try session pooler
    { host: `aws-0-ap-southeast-1.pooler.supabase.com`, port: 6543, database: 'postgres', user: `postgres.${PROJECT_REF}`, password: 'postgres' },
  ];

  for (const cfg of configs) {
    const client = new pg.Client(cfg);
    try {
      await client.connect();
      console.log(`✓ Connected to ${cfg.host}:${cfg.port} as ${cfg.user}`);
      
      // Check current schema
      const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'settings_profit' ORDER BY ordinal_position");
      console.log('Columns:', res.rows.map(r => r.column_name).join(', '));
      
      // Run migration if persen doesn't exist
      const hasPersen = res.rows.some(r => r.column_name === 'persen');
      if (!hasPersen) {
        console.log('\n✓ Kolom persen belum ada, menjalankan migration...');
        await client.query('BEGIN');
        
        await client.query(`ALTER TABLE settings_profit ADD COLUMN IF NOT EXISTS persen numeric DEFAULT 0`);
        await client.query(`UPDATE settings_profit SET persen = clean_pct WHERE peran NOT IN ('cuci', 'repair')`);
        await client.query(`UPDATE settings_profit SET persen = clean_pct + repair_pct WHERE peran IN ('cuci', 'repair')`);
        await client.query(`
          INSERT INTO settings_profit (nama_layanan, hpp, kategori, role_name, target_omset, peran, persen, base_gaji)
          SELECT 'role_spesialis', 0, NULL, 'Spesialis', 0, 'spesialis',
            (SELECT COALESCE(SUM(persen), 0) FROM settings_profit WHERE peran IN ('cuci', 'repair')),
            (SELECT COALESCE(SUM(base_gaji), 50000) FROM settings_profit WHERE peran IN ('cuci', 'repair'))
          WHERE NOT EXISTS (SELECT 1 FROM settings_profit WHERE peran = 'spesialis')
        `);
        await client.query(`DELETE FROM settings_profit WHERE peran IN ('cuci', 'repair')`);
        
        await client.query('COMMIT');
        console.log('✓ Migration selesai!');
        
        // Verify
        const verify = await client.query("SELECT peran, persen, base_gaji, clean_pct, repair_pct FROM settings_profit ORDER BY peran");
        console.log('\nHasil setelah migration:');
        console.table(verify.rows);
      } else {
        console.log('\n✓ Kolom persen sudah ada, tidak perlu migration');
        const verify = await client.query("SELECT peran, persen, base_gaji, clean_pct, repair_pct FROM settings_profit ORDER BY peran");
        console.table(verify.rows);
      }
      
      await client.end();
      process.exit(0);
    } catch (e) {
      console.log(`✗ ${cfg.host}:${cfg.port} - ${e.message}`);
      try { await client.end(); } catch {}
    }
  }
  
  console.log('\nTidak bisa connect ke database. Butuh password/credentials.');
  console.log('\nCara manual:');
  console.log('1. Buka https://supabase.com/dashboard');
  console.log('2. Login, pilih project faqueaejsbkmpurjmubv');
  console.log('3. Buka SQL Editor, paste isi file:');
  console.log('   ~/danee-shoes-app/supabase/migration_profit_merge_persen.sql');
  console.log('4. Klik RUN');
}

tryConnect().catch(console.error);
