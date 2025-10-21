// Migration script to create the analyses table
// Run with: node scripts/run-migration.js

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const { sql } = require('@vercel/postgres');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('🚀 Running database migration...\n');

  try {
    // Read the schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('📄 Loading schema from:', schemaPath);
    console.log('');

    // Execute the entire schema as one transaction
    console.log('📊 Executing schema...\n');

    try {
      await sql.query(schema);
      console.log('   ✅ Schema executed successfully\n');
    } catch (err) {
      // Ignore "already exists" errors
      if (err.message.includes('already exists')) {
        console.log('   ⚠️  Table or indexes already exist (skipping)\n');
      } else {
        throw err;
      }
    }

    console.log('🎉 Migration completed successfully!\n');

    // Verify the table was created
    console.log('🔍 Verifying table creation...');
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'analyses'
      ) as table_exists
    `;

    if (tableCheck.rows[0].table_exists) {
      console.log('✅ analyses table exists\n');

      // Check indexes
      const indexCheck = await sql`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'analyses'
        AND schemaname = 'public'
        ORDER BY indexname
      `;

      console.log(`✅ Created ${indexCheck.rows.length} indexes:`);
      indexCheck.rows.forEach(row => {
        console.log(`   - ${row.indexname}`);
      });
      console.log('');

      // Check columns
      const columnCheck = await sql`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'analyses'
        AND table_schema = 'public'
        ORDER BY ordinal_position
      `;

      console.log(`✅ Created ${columnCheck.rows.length} columns:`);
      columnCheck.rows.forEach(row => {
        console.log(`   - ${row.column_name} (${row.data_type})`);
      });
      console.log('');

      console.log('🎊 Database is ready for analysis history tracking!');
      console.log('');
      console.log('Next steps:');
      console.log('1. Deploy your application to Vercel');
      console.log('2. Test with a premium user account');
      console.log('3. Analyze a URL and check the history widget');
    } else {
      console.log('❌ Table was not created. Something went wrong.');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Migration failed!');
    console.error('');
    console.error('Error:', error.message);
    console.error('');

    if (error.code) {
      console.error('Error code:', error.code);
    }

    console.error('');
    console.error('Troubleshooting:');
    console.error('1. Ensure POSTGRES_URL is set in your environment');
    console.error('2. Check that you have write permissions on the database');
    console.error('3. Verify the schema.sql file exists and is valid');
    console.error('');
    process.exit(1);
  }
}

runMigration();
