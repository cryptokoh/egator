/**
 * Apply FlowB migrations to DANZ Supabase
 *
 * Run: DANZ_SUPABASE_URL=... DANZ_SUPABASE_KEY=... npx tsx scripts/apply-migration.ts
 *
 * Or run the SQL manually in Supabase Studio:
 * https://supabase.com/dashboard/project/eoajujwpdkfuicnoxetk/sql/new
 */

const MIGRATION_SQL = `
-- FlowB: Pending Verifications Table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.pending_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) NOT NULL UNIQUE,
  platform VARCHAR(20) NOT NULL,
  platform_user_id VARCHAR(255) NOT NULL,
  platform_username VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  danz_privy_id VARCHAR(255)
);

-- Index for code lookup
CREATE INDEX IF NOT EXISTS idx_pending_verifications_code
  ON public.pending_verifications(code)
  WHERE verified_at IS NULL;

-- Index for platform user lookup
CREATE INDEX IF NOT EXISTS idx_pending_verifications_platform_user
  ON public.pending_verifications(platform, platform_user_id);
`;

async function main() {
  const url = process.env.DANZ_SUPABASE_URL;
  const key = process.env.DANZ_SUPABASE_KEY;

  if (!url || !key) {
    console.log("Missing DANZ_SUPABASE_URL or DANZ_SUPABASE_KEY");
    console.log("\n--- SQL to run manually in Supabase Studio ---\n");
    console.log(MIGRATION_SQL);
    console.log("\n--- End SQL ---\n");
    console.log("Copy the SQL above and run it at:");
    console.log("https://supabase.com/dashboard/project/eoajujwpdkfuicnoxetk/sql/new");
    return;
  }

  // Try direct database connection via Supabase REST API
  // Note: This requires the exec_sql function to exist, which may not be default
  console.log("Attempting to run migration via Supabase RPC...");

  try {
    const response = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql: MIGRATION_SQL }),
    });

    const result = await response.text();

    if (response.ok) {
      console.log("✓ Migration applied successfully!");
    } else {
      console.log("Could not apply migration automatically.");
      console.log("Response:", result);
      console.log("\n--- Run this SQL manually in Supabase Studio ---\n");
      console.log(MIGRATION_SQL);
      console.log("\n--- End SQL ---\n");
      console.log("Copy the SQL above and run it at:");
      console.log("https://supabase.com/dashboard/project/eoajujwpdkfuicnoxetk/sql/new");
    }
  } catch (err) {
    console.error("Error:", err);
    console.log("\n--- Run this SQL manually in Supabase Studio ---\n");
    console.log(MIGRATION_SQL);
  }
}

main();
