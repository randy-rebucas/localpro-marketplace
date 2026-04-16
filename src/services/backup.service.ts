/**
 * Backup Service
 * ──────────────
 * Wraps the MongoDB Atlas Administration API (Digest auth) to:
 *  - Trigger on-demand cloud backup snapshots
 *  - List existing snapshots
 *
 * Required environment variables:
 *   MONGODB_ATLAS_PUBLIC_KEY   — Atlas API public key (username for Digest auth)
 *   MONGODB_ATLAS_PRIVATE_KEY  — Atlas API private key (password for Digest auth)
 *   MONGODB_ATLAS_PROJECT_ID   — Atlas project/group ID
 *   MONGODB_ATLAS_CLUSTER_NAME — Cluster name (e.g. "Cluster0")
 *
 * Atlas API reference:
 *   https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v2/#tag/Cloud-Backups
 */

import { type BackupTrigger } from "@/models/BackupLog";
import { backupLogRepository } from "@/repositories/backupLog.repository";

const BASE = "https://cloud.mongodb.com/api/atlas/v2";

// ─── Digest-auth helper ────────────────────────────────────────────────────────
//
// The Atlas Admin API uses HTTP Digest authentication. The Node.js native fetch
// does NOT support Digest automatically, so we implement the two-step handshake
// manually: first a bare request to get the 401 challenge, then a second request
// with the computed Authorization header.

import { createHash } from "crypto";

function md5(s: string) {
  return createHash("md5").update(s).digest("hex");
}

function parseDigestChallenge(header: string) {
  const get = (key: string) => {
    const m = header.match(new RegExp(`${key}="([^"]+)"`));
    return m?.[1] ?? "";
  };
  return {
    realm:  get("realm"),
    nonce:  get("nonce"),
    qop:    get("qop"),
    opaque: get("opaque"),
  };
}

function buildDigestHeader(
  method: string,
  uri: string,
  username: string,
  password: string,
  challenge: ReturnType<typeof parseDigestChallenge>
): string {
  const { realm, nonce, opaque } = challenge;
  // Pick the first offered qop method (Atlas typically offers just "auth")
  const qop   = challenge.qop ? challenge.qop.split(",")[0].trim() : "";
  const nc    = "00000001";
  const cnonce = Math.random().toString(36).slice(2, 10);

  const ha1 = md5(`${username}:${realm}:${password}`);
  const ha2 = md5(`${method}:${uri}`);
  const response = qop
    ? md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
    : md5(`${ha1}:${nonce}:${ha2}`);

  return [
    `Digest username="${username}"`,
    `realm="${realm}"`,
    `nonce="${nonce}"`,
    `uri="${uri}"`,
    qop ? `qop=${qop}` : "",
    qop ? `nc=${nc}` : "",
    qop ? `cnonce="${cnonce}"` : "",
    `response="${response}"`,
    opaque ? `opaque="${opaque}"` : "",
  ].filter(Boolean).join(", ");
}

async function atlasRequest(
  method: "GET" | "POST",
  path: string,
  body?: object
): Promise<Response> {
  const publicKey  = process.env.MONGODB_ATLAS_PUBLIC_KEY  ?? "";
  const privateKey = process.env.MONGODB_ATLAS_PRIVATE_KEY ?? "";

  if (!publicKey || !privateKey) {
    throw new Error("MONGODB_ATLAS_PUBLIC_KEY and MONGODB_ATLAS_PRIVATE_KEY must be set");
  }

  const url  = `${BASE}${path}`;
  const init: RequestInit = {
    method,
    headers: { Accept: "application/vnd.atlas.2023-01-01+json", "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  };

  // Step 1 — unauthenticated request to get 401 + WWW-Authenticate header
  const challenge401 = await fetch(url, init);
  if (challenge401.status !== 401) return challenge401; // already succeeded (unlikely) or other error

  const wwwAuth = challenge401.headers.get("WWW-Authenticate") ?? "";
  if (!wwwAuth.startsWith("Digest ")) {
    throw new Error(`Unexpected auth scheme: ${wwwAuth}`);
  }

  const parsed   = parseDigestChallenge(wwwAuth);
  const pathname = new URL(url).pathname + new URL(url).search;
  const authHeader = buildDigestHeader(method, pathname, publicKey, privateKey, parsed);

  // Step 2 — authenticated request
  return fetch(url, {
    ...init,
    headers: { ...init.headers as Record<string, string>, Authorization: authHeader },
  });
}

// ─── Snapshot operations ───────────────────────────────────────────────────────

export interface AtlasSnapshot {
  id: string;
  status: "queued" | "inProgress" | "completed" | "failed";
  type: string;
  description: string;
  createdAt: string;
  expiresAt: string;
  storageSizeBytes?: number;
  mongodVersion?: string;
}

function cfg() {
  const projectId   = process.env.MONGODB_ATLAS_PROJECT_ID   ?? "";
  const clusterName = process.env.MONGODB_ATLAS_CLUSTER_NAME ?? "";
  if (!projectId || !clusterName) {
    throw new Error("MONGODB_ATLAS_PROJECT_ID and MONGODB_ATLAS_CLUSTER_NAME must be set");
  }
  return { projectId, clusterName };
}

/** Trigger an on-demand Atlas cloud backup snapshot. Saves a BackupLog record. */
export async function triggerAtlasSnapshot(
  triggeredBy: BackupTrigger,
  adminId?: string,
  description = "Automated daily backup"
): Promise<{ snapshotId: string; logId: string }> {
  const { projectId, clusterName } = cfg();

  // Create a pending log entry first
  const log = await backupLogRepository.createLog({
    type: "atlas_snapshot",
    status: "pending",
    triggeredBy,
    adminId: adminId ?? undefined,
    description,
  });

  const logId = String(log._id);

  try {
    const res = await atlasRequest(
      "POST",
      `/groups/${projectId}/clusters/${clusterName}/backup/snapshots`,
      { description, retentionInDays: 7 }
    );

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({})) as { detail?: string; errorCode?: string };
      throw new Error(errBody.detail ?? errBody.errorCode ?? `Atlas API error ${res.status}`);
    }

    const data = await res.json() as AtlasSnapshot;

    await backupLogRepository.updateLog(logId, {
      status: "completed",
      snapshotId: data.id,
      sizeBytes: data.storageSizeBytes,
      completedAt: new Date(),
    });

    return { snapshotId: data.id, logId };
  } catch (err) {
    await backupLogRepository.updateLog(logId, {
      status: "failed",
      error: (err as Error).message,
      completedAt: new Date(),
    });
    throw err;
  }
}

/** List existing Atlas cloud backup snapshots (most recent first, up to 20). */
export async function listAtlasSnapshots(): Promise<AtlasSnapshot[]> {
  const { projectId, clusterName } = cfg();

  const res = await atlasRequest(
    "GET",
    `/groups/${projectId}/clusters/${clusterName}/backup/snapshots?itemsPerPage=20&pageNum=1`
  );

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({})) as { detail?: string; errorCode?: string };
    throw new Error(errBody.detail ?? errBody.errorCode ?? `Atlas API error ${res.status}`);
  }

  const data = await res.json() as { results: AtlasSnapshot[] };
  return data.results ?? [];
}

/** Return the last N backup log records. */
export async function listBackupLogs(limit = 20) {
  return backupLogRepository.listRecent(limit);
}
