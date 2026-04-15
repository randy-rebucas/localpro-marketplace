/**
 * MongoDB Transaction Helper
 * 
 * Provides utilities for running transactional operations across multiple documents.
 * Ensures ACID guarantees for critical workflows like:
 * - Quote acceptance + Job assignment
 * - Escrow funding + Transaction creation
 * - Job completion + Release escrow
 */

import mongoose, { ClientSession } from "mongoose";
import { connectDB } from "@/lib/db";

/**
 * Run a callback within a MongoDB transaction.
 * 
 * Handles:
 * - Session creation
 * - Automatic retry on transient errors
 * - Session cleanup
 * 
 * @param callback Function to run transactionally
 * @param options Transaction options (isolation level, timeout, etc.)
 * @returns Result from callback
 */
export async function runInTransaction<T>(
  callback: (session: ClientSession) => Promise<T>,
  options: {
    maxRetries?: number;
    timeoutMs?: number;
  } = {}
): Promise<T> {
  const { maxRetries = 3, timeoutMs = 5000 } = options;

  if (!mongoose.connection.readyState) {
    await connectDB();
  }

  let session: ClientSession | null = null;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      session = await mongoose.startSession();
      
      // Configure transaction with appropriate isolation level + timeout
      const transactionOptions = {
        readConcern: { level: "snapshot" as const },
        writeConcern: { w: "majority" as const },
        readPreference: "primary" as const,
        maxCommitTimeMS: timeoutMs,
      };

      await session.withTransaction(
        () => callback(session!),
        transactionOptions
      );

      return await callback(session);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Check if this is a transient error we should retry
      if (isTransientError(lastError) && attempt < maxRetries) {
        console.warn(
          `[Transaction] Transient error on attempt ${attempt}/${maxRetries}: ${lastError.message}. Retrying...`
        );
        // Exponential backoff: 100ms * 2^(attempt-1)
        const delayMs = 100 * Math.pow(2, attempt - 1);
        await sleep(delayMs);
        continue;
      }

      // Non-transient error or out of retries
      throw lastError;
    } finally {
      if (session) {
        await session.endSession().catch((err) => {
          console.error("[Transaction] Failed to end session:", err);
        });
      }
    }
  }

  throw lastError || new Error("Transaction failed after max retries");
}

/**
 * Check if an error is transient (can be safely retried)
 * See: https://www.mongodb.com/docs/manual/core/transactions-api/#transient-transaction-errors
 */
function isTransientError(error: Error): boolean {
  const message = error.message || "";

  // Transient transaction commit error
  if (message.includes("TransientTransactionError")) {
    return true;
  }

  // Connection lost or interrupted
  if (
    message.includes("connection") ||
    message.includes("interrupted") ||
    message.includes("disconnected")
  ) {
    return true;
  }

  // Server selection timeout
  if (message.includes("ECONNREFUSED") || message.includes("server selection")) {
    return true;
  }

  // Write conflicts (typical with concurrent transactions)
  if (message.includes("E11000") || message.includes("duplicate")) {
    return true;
  }

  return false;
}

/**
 * Helper to sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Transaction scope builder for common operations
 */
export const transactionScopes = {
  /**
   * Quote acceptance transaction
   * Atomically updates both Quote and Job documents
   */
  quoteAcceptance: async (
    callback: (session: ClientSession) => Promise<any>,
    opts?: { maxRetries?: number }
  ) => {
    return runInTransaction(callback, { maxRetries: opts?.maxRetries ?? 3, timeoutMs: 10000 });
  },

  /**
   * Escrow funding transaction
   * Atomically updates Payment, Job, and Ledger entries
   */
  escrowFunding: async (
    callback: (session: ClientSession) => Promise<any>,
    opts?: { maxRetries?: number }
  ) => {
    return runInTransaction(callback, { maxRetries: opts?.maxRetries ?? 3, timeoutMs: 15000 });
  },

  /**
   * Job completion transaction
   * Atomically updates Job, Escrow, and Ledger entries
   */
  jobCompletion: async (
    callback: (session: ClientSession) => Promise<any>,
    opts?: { maxRetries?: number }
  ) => {
    return runInTransaction(callback, { maxRetries: opts?.maxRetries ?? 3, timeoutMs: 15000 });
  },

  /**
   * Payment refund transaction
   * Atomically updates Payment and Ledger entries
   */
  paymentRefund: async (
    callback: (session: ClientSession) => Promise<any>,
    opts?: { maxRetries?: number }
  ) => {
    return runInTransaction(callback, { maxRetries: opts?.maxRetries ?? 3, timeoutMs: 12000 });
  },
};

/**
 * Export for testing and advanced usage
 */
export type { ClientSession };
