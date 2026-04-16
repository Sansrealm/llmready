# Setup Instructions: Analysis History Tracking

This document provides step-by-step instructions for setting up the analysis history tracking feature for LLM Check.

## Overview

The history tracking feature allows premium users to:
- View score trends over time for analyzed URLs
- See a chart showing score progression
- Track improvements and declines
- View a table of recent analyses

## Prerequisites

- Vercel account with access to Vercel Postgres
- Access to the LLM Check project on Vercel
- Environment variables configured (Clerk, Stripe, OpenAI)

---

## Step 1: Install Dependencies

Run the following command to install the required package:

```bash
npm install
```

This will install `@vercel/postgres@^0.10.0` which was added to `package.json`.

---

## Step 2: Set Up Vercel Postgres Database

### Option A: Via Vercel Dashboard (Recommended)

1. Go to your project on Vercel: https://vercel.com/dashboard
2. Navigate to the **Storage** tab
3. Click **Create Database**
4. Select **Postgres**
5. Choose a database name (e.g., `llm-check-production`)
6. Select a region close to your application (same as deployment region)
7. Click **Create**

Vercel will automatically add the following environment variables to your project:
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

### Option B: Via Vercel CLI

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login to Vercel
vercel login

# Link your project
vercel link

# Create Postgres database
vercel postgres create
```

---

## Step 3: Run Database Migrations

### Option A: Via Vercel Postgres Dashboard

1. Go to your Vercel Postgres database
2. Click on the **Query** tab
3. Copy the contents of `/scripts/schema.sql`
4. Paste into the query editor
5. Click **Run Query**

### Option B: Via Local Script

Create a migration script locally:

```bash
# Create .env.local file with database connection
echo "POSTGRES_URL='your-postgres-url-from-vercel'" > .env.local

# Run the schema
node -e "
const { sql } = require('@vercel/postgres');
const fs = require('fs');

async function runMigration() {
  const schema = fs.readFileSync('./scripts/schema.sql', 'utf8');
  await sql.query(schema);
  console.log('✅ Database schema created successfully');
}

runMigration().catch(console.error);
"
```

### Option C: Manual SQL Execution

Connect to your Vercel Postgres database using a PostgreSQL client (like `psql` or TablePlus) and execute the SQL from `/scripts/schema.sql`.

---

## Step 4: Verify Database Setup

Test the database connection by running a simple query via Vercel dashboard:

```sql
SELECT * FROM pg_tables WHERE schemaname = 'public';
```

You should see the `analyses` table listed.

---

## Step 5: Deploy to Vercel

### If using Git integration (recommended):

```bash
git add .
git commit -m "feat: Add analysis history tracking feature

- Add Vercel Postgres integration for storing analysis results
- Create score history widget for premium users
- Show trend charts and analysis history table
- Premium-only feature with upgrade prompts for free users

Includes:
- Database schema with proper indexes
- API endpoint for fetching history
- Score history widget component
- Integration into results page
"

git push origin main
```

Vercel will automatically deploy your changes.

### If deploying manually:

```bash
vercel --prod
```

---

## Step 6: Verify the Feature

### Test as Guest User:
1. Visit the site
2. Analyze a URL
3. **Expected**: History widget should NOT appear (guests don't get history saved)

### Test as Free User:
1. Sign in with a free account
2. Analyze a URL
3. **Expected**: See upgrade prompt for history tracking
4. Analysis should be saved to database (check Vercel Postgres dashboard)

### Test as Premium User:
1. Sign in with a premium account
2. Analyze a URL for the first time
3. **Expected**: See "This is your first analysis of this URL"
4. Analyze the same URL again (change content slightly to get different score)
5. **Expected**: See chart with 2 data points, trend indicator, and table

---

## Step 7: Monitor Database Usage

Keep an eye on your Vercel Postgres usage:

1. Go to Vercel Dashboard → Storage → Your Postgres DB
2. Check the **Metrics** tab
3. Monitor:
   - Row count
   - Storage size
   - Query performance

### Expected Growth:
- Each analysis adds 1 row (~2-5 KB depending on parameters size)
- 1000 analyses ≈ 2-5 MB
- 10,000 analyses ≈ 20-50 MB

### Cleanup (if needed):

To prevent unlimited growth, you may want to add a cleanup script later:

```sql
-- Delete analyses older than 1 year
DELETE FROM analyses WHERE analyzed_at < NOW() - INTERVAL '1 year';

-- Or keep only last 100 analyses per user per URL
DELETE FROM analyses a1
WHERE id NOT IN (
  SELECT id FROM analyses a2
  WHERE a2.user_id = a1.user_id
    AND a2.normalized_url = a1.normalized_url
  ORDER BY analyzed_at DESC
  LIMIT 100
);
```

---

## Troubleshooting

### Issue: "Failed to save analysis to database" in logs

**Solution:**
- Check that `POSTGRES_URL` environment variable is set in Vercel
- Verify database connection in Vercel Postgres dashboard
- Check that the `analyses` table exists

### Issue: History widget shows error

**Solution:**
- Check browser console for errors
- Verify `/api/analysis-history` endpoint is working (should return 401 if not authenticated, 403 if not premium)
- Ensure user has premium status in Clerk

### Issue: History not showing for premium user

**Solution:**
- Verify premium status via `/api/subscription-status`
- Check that user has analyzed the URL before (run another analysis)
- Look for errors in server logs

### Issue: Database connection timeout

**Solution:**
- Vercel Postgres uses connection pooling automatically
- If you see timeouts, check the **Metrics** tab for connection count
- Consider adding connection retry logic if needed

---

## File Changes Summary

### New Files Created:
- `/lib/db.ts` - Database utilities and helper functions
- `/scripts/schema.sql` - Database schema
- `/app/api/analysis-history/route.ts` - API endpoint for fetching history
- `/components/score-history-widget.tsx` - UI component for displaying history
- `SETUP_HISTORY_TRACKING.md` - This file

### Modified Files:
- `/app/api/analyze/route.js` - Added database save after successful analysis
- `/app/results/page.tsx` - Added history widget to results page
- `/package.json` - Added `@vercel/postgres` dependency

---

## Feature Flags (Optional)

If you want to enable/disable this feature without code changes, add an environment variable:

```bash
# In Vercel dashboard, add:
ENABLE_HISTORY_TRACKING=true
```

Then modify the code to check this variable before saving/displaying history.

---

## Next Steps

After successful deployment:

1. ✅ Monitor first few analyses to ensure data is being saved
2. ✅ Test the feature with real premium users
3. ✅ Gather feedback on the UI/UX
4. 📊 Consider adding more analytics (most improved URLs, average scores, etc.)
5. 🎯 Consider adding email notifications for score changes
6. 🔄 Set up automated database backups

---

## Support

If you encounter issues during setup:
1. Check Vercel deployment logs
2. Check browser console for frontend errors
3. Review server logs for API errors
4. Verify all environment variables are set correctly

For database-specific issues, refer to [Vercel Postgres documentation](https://vercel.com/docs/storage/vercel-postgres).
