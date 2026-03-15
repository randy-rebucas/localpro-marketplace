/**
 * Atlas Backup API Diagnostic Script
 * ------------------------------------
 * Tests the Atlas Admin API connection and lists snapshots.
 *
 * Usage:
 *   node --env-file=.env.local scripts/test-atlas-backup.mjs
 */

import { createHash } from "crypto";

const PUBLIC_KEY   = process.env.MONGODB_ATLAS_PUBLIC_KEY;
const PRIVATE_KEY  = process.env.MONGODB_ATLAS_PRIVATE_KEY;
const PROJECT_ID   = process.env.MONGODB_ATLAS_PROJECT_ID;
const CLUSTER_NAME = process.env.MONGODB_ATLAS_CLUSTER_NAME;

console.log("─── Atlas Config ───────────────────────────────────────");
console.log("PUBLIC_KEY:  ", PUBLIC_KEY   ? `${PUBLIC_KEY.slice(0, 4)}...` : "❌ MISSING");
console.log("PRIVATE_KEY: ", PRIVATE_KEY  ? `${PRIVATE_KEY.slice(0, 4)}...` : "❌ MISSING");
console.log("PROJECT_ID:  ", PROJECT_ID   ?? "❌ MISSING");
console.log("CLUSTER:     ", CLUSTER_NAME ?? "❌ MISSING");
console.log("────────────────────────────────────────────────────────\n");

if (!PUBLIC_KEY || !PRIVATE_KEY || !PROJECT_ID || !CLUSTER_NAME) {
  console.error("❌ One or more Atlas env vars are missing. Exiting.");
  process.exit(1);
}

function md5(s) {
  return createHash("md5").update(s).digest("hex");
}

function parseDigestChallenge(header) {
  const get = (key) => {
    const m = header.match(new RegExp(`${key}="([^"]+)"`));
    return m?.[1] ?? "";
  };
  return { realm: get("realm"), nonce: get("nonce"), qop: get("qop"), opaque: get("opaque") };
}

function buildDigestHeader(method, uri, username, password, { realm, nonce, qop, opaque }) {
  const nc    = "00000001";
  const cnonce = Math.random().toString(36).slice(2, 10);
  const ha1    = md5(`${username}:${realm}:${password}`);
  const ha2    = md5(`${method}:${uri}`);
  const selectedQop = qop ? qop.split(",")[0].trim() : ""; // pick first offered method
  const response = selectedQop
    ? md5(`${ha1}:${nonce}:${nc}:${cnonce}:${selectedQop}:${ha2}`)
    : md5(`${ha1}:${nonce}:${ha2}`);

  return [
    `Digest username="${username}"`,
    `realm="${realm}"`,
    `nonce="${nonce}"`,
    `uri="${uri}"`,
    selectedQop ? `qop=${selectedQop}` : "",
    selectedQop ? `nc=${nc}` : "",
    selectedQop ? `cnonce="${cnonce}"` : "",
    `response="${response}"`,
    opaque ? `opaque="${opaque}"` : "",
  ].filter(Boolean).join(", ");
}

async function atlasRequest(method, path, body) {
  const BASE = "https://cloud.mongodb.com/api/atlas/v2";
  const url  = `${BASE}${path}`;
  const init = {
    method,
    headers: { Accept: "application/vnd.atlas.2023-01-01+json", "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  };

  console.log(`→ ${method} ${url}`);
  const r1 = await fetch(url, init);
  console.log(`  Challenge response: ${r1.status} ${r1.statusText}`);

  if (r1.status !== 401) {
    const text = await r1.text();
    console.log("  Body:", text.slice(0, 500));
    return r1;
  }

  const wwwAuth = r1.headers.get("WWW-Authenticate") ?? "";
  console.log("  WWW-Authenticate:", wwwAuth.slice(0, 120));
  if (!wwwAuth.startsWith("Digest ")) throw new Error(`Unexpected auth scheme: ${wwwAuth}`);

  const challenge = parseDigestChallenge(wwwAuth);
  console.log("  Parsed challenge:", challenge);

  const pathname  = new URL(url).pathname + new URL(url).search;
  const authHeader = buildDigestHeader(method, pathname, PUBLIC_KEY, PRIVATE_KEY, challenge);

  const r2 = await fetch(url, { ...init, headers: { ...init.headers, Authorization: authHeader } });
  console.log(`  Authenticated response: ${r2.status} ${r2.statusText}`);
  const text = await r2.text();
  console.log("  Body:", text.slice(0, 1000));
  return r2;
}

// Test 1: List snapshots (GET)
console.log("\n=== Test 1: List snapshots (GET) ===");
try {
  await atlasRequest("GET", `/groups/${PROJECT_ID}/clusters/${CLUSTER_NAME}/backup/snapshots?itemsPerPage=5&pageNum=1`);
} catch (e) {
  console.error("ERROR:", e.message);
}

// Test 2: Trigger snapshot (POST) — uncomment to test
// console.log("\n=== Test 2: Trigger snapshot (POST) ===");
// try {
//   await atlasRequest("POST", `/groups/${PROJECT_ID}/clusters/${CLUSTER_NAME}/backup/snapshots`, {
//     description: "Test snapshot from diagnostic script",
//     retentionInDays: 1,
//   });
// } catch (e) {
//   console.error("ERROR:", e.message);
// }
