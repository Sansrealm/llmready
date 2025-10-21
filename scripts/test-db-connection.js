// Test script to verify Vercel Postgres connection
// Run with: node scripts/test-db-connection.js

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const { sql } = require('@vercel/postgres');

async function testConnection() {
  console.log('🔍 Testing Vercel Postgres connection...\n');

  try {
    // Test 1: Basic connection
    console.log('Test 1: Checking database connection...');
    const result = await sql`SELECT NOW() as current_time, version() as db_version`;
    console.log('✅ Connection successful!');
    console.log('   Current time:', result.rows[0].current_time);
    console.log('   PostgreSQL version:', result.rows[0].db_version.split(',')[0]);
    console.log('');

    // Test 2: Check if analyses table exists
    console.log('Test 2: Checking if analyses table exists...');
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'analyses'
      ) as table_exists
    `;

    const tableExists = tableCheck.rows[0].table_exists;

    if (tableExists) {
      console.log('✅ analyses table exists!');

      // Get row count
      const countResult = await sql`SELECT COUNT(*) as count FROM analyses`;
      console.log(`   Total analyses stored: ${countResult.rows[0].count}`);
      console.log('');
    } else {
      console.log('⚠️  analyses table does NOT exist yet');
      console.log('   You need to run the schema SQL to create the table.');
      console.log('   See SETUP_HISTORY_TRACKING.md for instructions.');
      console.log('');
    }

    // Test 3: Check indexes (if table exists)
    if (tableExists) {
      console.log('Test 3: Checking indexes...');
      const indexCheck = await sql`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'analyses'
        AND schemaname = 'public'
        ORDER BY indexname
      `;

      console.log(`✅ Found ${indexCheck.rows.length} indexes:`);
      indexCheck.rows.forEach(row => {
        console.log(`   - ${row.indexname}`);
      });
      console.log('');
    }

    // Test 4: Connection pool info
    console.log('Test 4: Connection pool status...');
    const poolInfo = await sql`
      SELECT
        (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()) as active_connections,
        (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections
    `;
    console.log(`✅ Active connections: ${poolInfo.rows[0].active_connections}/${poolInfo.rows[0].max_connections}`);
    console.log('');

    console.log('🎉 All tests passed! Database is ready to use.');
    console.log('');

    if (!tableExists) {
      console.log('⚠️  NEXT STEP: Run the schema SQL to create the analyses table');
      console.log('   Option 1: Via Vercel Dashboard → Storage → Your DB → Query tab');
      console.log('   Option 2: Run: node scripts/run-migration.js');
    }

  } catch (error) {
    console.error('❌ Database connection failed!');
    console.error('');
    console.error('Error details:', error.message);
    console.error('');
    console.error('Troubleshooting:');
    console.error('1. Check that POSTGRES_URL is set in your environment');
    console.error('2. Verify the database exists in Vercel Dashboard');
    console.error('3. Check that your IP is not blocked (if using local connection)');
    console.error('4. Ensure the connection string is correct');
    console.error('');
    console.error('Environment check:');
    console.error('  POSTGRES_URL defined:', !!process.env.POSTGRES_URL);
    console.error('  POSTGRES_URL length:', process.env.POSTGRES_URL?.length || 0);
    process.exit(1);
  }
}

testConnection();
