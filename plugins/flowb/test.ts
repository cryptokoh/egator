/**
 * Test script for FlowB agent
 *
 * Run: npx tsx test.ts
 */

import register from "./src/index.js";

// Mock OpenClaw API
const registeredTools: any[] = [];
const mockApi = {
  config: {
    // DANZ plugin config
    danzSupabaseUrl: process.env.DANZ_SUPABASE_URL || process.env.VITE_DANZ_SUPABASE_URL,
    danzSupabaseKey: process.env.DANZ_SUPABASE_KEY || process.env.VITE_DANZ_SUPABASE_KEY,
    // eGator plugin config
    apiBaseUrl: process.env.EGATOR_API_URL || "http://localhost:3000",
  },
  registerTool: (tool: any) => {
    registeredTools.push(tool);
    console.log(`\nRegistered tool: ${tool.name}`);
  },
  logger: {
    info: (msg: string) => console.log(`[info] ${msg}`),
  },
};

// Register FlowB
register(mockApi);

const tool = registeredTools[0];
if (!tool) {
  console.error("No tool registered!");
  process.exit(1);
}

// Test helper
async function test(name: string, input: any) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`TEST: ${name}`);
  console.log(`Input: ${JSON.stringify(input)}`);
  console.log("-".repeat(60));

  try {
    const result = await tool.execute(input);
    console.log(result);
  } catch (err) {
    console.error("Error:", err);
  }
}

async function main() {
  console.log("\nFlowB Agent Test\n");

  const hasDanz = !!mockApi.config.danzSupabaseUrl;
  const hasEgator = !!mockApi.config.apiBaseUrl;
  console.log(`DANZ plugin: ${hasDanz ? "configured" : "not configured"}`);
  console.log(`eGator plugin: ${hasEgator ? "configured" : "not configured"}`);

  // Core: Help
  await test("Help", { action: "help" });

  // Core: Events (queries all configured providers)
  await test("Events (all sources)", { action: "events" });
  await test("Events in Denver", { action: "events", city: "Denver" });

  // DANZ: Join info
  await test("DANZ - Join Info", { action: "join" });

  // DANZ: Signup
  await test("DANZ - Signup", {
    action: "signup",
    user_id: "telegram_12345",
    platform: "telegram",
    platform_username: "testuser",
  });

  // DANZ: Status
  await test("DANZ - Status", {
    action: "status",
    user_id: "telegram_12345",
    platform: "telegram",
  });

  // DANZ: Verify
  await test("DANZ - Verify (koH)", {
    action: "verify",
    user_id: "test_user_123",
    danz_username: "koH",
  });

  // DANZ: Stats (after verify - auto-hydrates from cache)
  await test("DANZ - Stats", { action: "stats", user_id: "test_user_123", platform: "telegram" });

  // DANZ: My Events (requires verified user)
  await test("DANZ - My Events", { action: "my-events", user_id: "test_user_123", platform: "telegram" });

  // DANZ: Stats without prior verify (tests auto-hydrate from DB)
  await test("DANZ - Stats (auto-hydrate)", { action: "stats", user_id: "fresh_user_456", platform: "telegram" });

  // DANZ: Challenges
  await test("DANZ - Challenges", { action: "challenges", platform: "telegram" });

  // DANZ: Leaderboard
  await test("DANZ - Leaderboard", { action: "leaderboard" });

  // eGator: Search
  await test("eGator - Search", { action: "search", city: "San Francisco" });

  console.log(`\n${"=".repeat(60)}`);
  console.log("All tests completed\n");
}

main().catch(console.error);
