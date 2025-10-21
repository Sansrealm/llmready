# Verify Database Access

Since your Vercel Postgres is connected via the Vercel Dashboard, we need to pull the environment variables locally to test the connection.

## Option 1: Pull Environment Variables from Vercel (Recommended)

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login to Vercel
vercel login

# Link your project (if not already linked)
vercel link

# Pull environment variables to .env.local
vercel env pull .env.local
```

This will download all environment variables from Vercel, including `POSTGRES_URL`.

## Option 2: Manual Setup (Get from Vercel Dashboard)

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Find the following Postgres variables:
   - `POSTGRES_URL`
   - `POSTGRES_PRISMA_URL`
   - `POSTGRES_URL_NON_POOLING`
   - `POSTGRES_USER`
   - `POSTGRES_HOST`
   - `POSTGRES_PASSWORD`
   - `POSTGRES_DATABASE`

4. Copy `POSTGRES_URL` value
5. Add to `.env.local`:
   ```bash
   POSTGRES_URL="your-postgres-url-here"
   ```

## After Setting Up Environment Variables

### Test the connection:

```bash
node scripts/test-db-connection.js
```

**Expected output if table doesn't exist yet:**
```
🔍 Testing Vercel Postgres connection...

Test 1: Checking database connection...
✅ Connection successful!
   Current time: 2025-01-20T...
   PostgreSQL version: PostgreSQL 15.x

Test 2: Checking if analyses table exists...
⚠️  analyses table does NOT exist yet
   You need to run the schema SQL to create the table.

🎉 All tests passed! Database is ready to use.

⚠️  NEXT STEP: Run the schema SQL to create the analyses table
```

### Run the migration to create the table:

```bash
node scripts/run-migration.js
```

**Expected output:**
```
🚀 Running database migration...

📄 Loading schema from: .../scripts/schema.sql

📊 Found 5 SQL statements to execute

Executing statement 1/5...
   CREATE TABLE IF NOT EXISTS analyses ( id UUID PRIMARY KEY DEFAULT gen_ran...
   ✅ Success

Executing statement 2/5...
   CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id)
   ✅ Success

...

🎉 Migration completed successfully!

✅ analyses table exists

✅ Created 5 indexes:
   - analyses_pkey
   - idx_analyses_analyzed_at
   - idx_analyses_normalized_url
   - idx_analyses_user_id
   - idx_analyses_user_url

✅ Created 8 columns:
   - id (uuid)
   - user_id (character varying)
   - url (character varying)
   - normalized_url (character varying)
   - overall_score (integer)
   - parameters (jsonb)
   - analyzed_at (timestamp with time zone)
   - created_at (timestamp with time zone)

🎊 Database is ready for analysis history tracking!
```

### Verify again:

```bash
node scripts/test-db-connection.js
```

**Should now show:**
```
Test 2: Checking if analyses table exists...
✅ analyses table exists!
   Total analyses stored: 0
```

## Troubleshooting

### Error: "Connection failed"

**Cause:** Environment variables not set or incorrect

**Solution:**
1. Run `vercel env pull .env.local` to get latest env vars
2. Verify `.env.local` contains `POSTGRES_URL`
3. Check the URL format is correct (should start with `postgres://`)

### Error: "permission denied for table"

**Cause:** User doesn't have write permissions

**Solution:**
- This shouldn't happen with Vercel Postgres as you're the owner
- If it does, check the Vercel Dashboard → Storage → Your DB → Settings

### Error: "relation does not exist"

**Cause:** Table hasn't been created yet

**Solution:**
Run the migration: `node scripts/run-migration.js`

## Alternative: Create Table via Vercel Dashboard

If you prefer not to use the CLI:

1. Go to Vercel Dashboard → Storage → Your Postgres DB
2. Click on the **Query** tab
3. Copy the contents of `scripts/schema.sql`
4. Paste into the query editor
5. Click **Run Query**
6. You should see "Query completed successfully"

## Next Steps After Verification

Once the table is created:

1. ✅ Database is ready
2. ✅ Deploy your code to Vercel
3. ✅ Test with a premium user
4. ✅ Analyze a URL and check the history widget appears

---

## Quick Reference

```bash
# Pull env vars from Vercel
vercel env pull .env.local

# Test connection
node scripts/test-db-connection.js

# Run migration
node scripts/run-migration.js

# Test connection again
node scripts/test-db-connection.js
```

---

## Current Status

Based on your setup:
- ✅ Vercel Postgres connected via dashboard
- ✅ `@vercel/postgres` package installed
- ⏳ Need to pull environment variables locally
- ⏳ Need to run schema SQL to create table

**Next action:** Run `vercel env pull .env.local` then test the connection.
