import { describe, it, expect, vi } from "vitest";
import {
  calculateCommission,
  calculateEscrowFee,
  calculateClientFees,
  calculateCancellationFee,
  getCommissionRate,
  BASE_COMMISSION_RATE,
  HIGH_COMMISSION_RATE,
  DEFAULT_ESCROW_FEE_RATE_PERCENT,
  DEFAULT_PROCESSING_FEE_RATE_PERCENT,
  DEFAULT_URGENCY_FEE_SAME_DAY,
  DEFAULT_URGENCY_FEE_RUSH,
  DEFAULT_CANCELLATION_FEE_FLAT,
  DEFAULT_CANCELLATION_FEE_PERCENT,
} from "@/lib/commission";

// ─── Fee Calculations ───────────────────────────────────────────────────────

describe("calculateEscrowFee", () => {
  it("calculates 2% escrow fee on a 1000 PHP service", () => {
    const result = calculateEscrowFee(1000, 2);
    expect(result.escrowFee).toBe(20);
    expect(result.totalCharge).toBe(1020);
    expect(result.rate).toBe(0.02);
  });

  it("handles zero service amount", () => {
    const result = calculateEscrowFee(0, 2);
    expect(result.escrowFee).toBe(0);
    expect(result.totalCharge).toBe(0);
  });

  it("rounds to two decimal places", () => {
    // 333 * 0.03 = 9.99 exactly, but test with a value that produces rounding
    const result = calculateEscrowFee(333, 3);
    expect(result.escrowFee).toBe(9.99);
    expect(result.totalCharge).toBe(342.99);
  });
});

describe("calculateClientFees", () => {
  it("computes all fees and total charge", () => {
    const result = calculateClientFees(1000, 2, 2, 0, 5);
    expect(result.escrowFee).toBe(20);
    expect(result.processingFee).toBe(20);
    expect(result.platformServiceFee).toBe(50);
    expect(result.urgencyFee).toBe(0);
    expect(result.totalCharge).toBe(1090);
  });

  it("adds urgency fee for same-day bookings", () => {
    const result = calculateClientFees(1000, 2, 2, DEFAULT_URGENCY_FEE_SAME_DAY);
    expect(result.urgencyFee).toBe(50);
    expect(result.totalCharge).toBe(1000 + 20 + 20 + 50);
  });

  it("adds rush urgency fee", () => {
    const result = calculateClientFees(1000, 2, 2, DEFAULT_URGENCY_FEE_RUSH);
    expect(result.urgencyFee).toBe(100);
  });

  it("handles zero budget", () => {
    const result = calculateClientFees(0, 2, 2, 0);
    expect(result.totalCharge).toBe(0);
    expect(result.escrowFee).toBe(0);
    expect(result.processingFee).toBe(0);
  });
});

// ─── Commission Rates ───────────────────────────────────────────────────────

describe("getCommissionRate", () => {
  it("returns 15% for standard categories", () => {
    expect(getCommissionRate("Plumbing")).toBe(BASE_COMMISSION_RATE);
  });

  it("returns 20% for high-value categories", () => {
    expect(getCommissionRate("HVAC")).toBe(HIGH_COMMISSION_RATE);
    expect(getCommissionRate("Roofing")).toBe(HIGH_COMMISSION_RATE);
    expect(getCommissionRate("Masonry & Tiling")).toBe(HIGH_COMMISSION_RATE);
  });

  it("returns standard rate for null/undefined category", () => {
    expect(getCommissionRate(null)).toBe(BASE_COMMISSION_RATE);
    expect(getCommissionRate(undefined)).toBe(BASE_COMMISSION_RATE);
  });

  it("trims whitespace before matching", () => {
    expect(getCommissionRate("  HVAC  ")).toBe(HIGH_COMMISSION_RATE);
  });
});

describe("calculateCommission", () => {
  it("calculates 15% commission on a standard job", () => {
    const result = calculateCommission(1000, 0.15);
    expect(result.commission).toBe(150);
    expect(result.netAmount).toBe(850);
    expect(result.gross).toBe(1000);
    expect(result.rate).toBe(0.15);
  });

  it("calculates 20% commission for high-value category", () => {
    const result = calculateCommission(5000, 0.20);
    expect(result.commission).toBe(1000);
    expect(result.netAmount).toBe(4000);
  });

  it("uses the default 15% rate when none specified", () => {
    const result = calculateCommission(2000);
    expect(result.rate).toBe(BASE_COMMISSION_RATE);
    expect(result.commission).toBe(300);
  });

  it("handles zero amount", () => {
    const result = calculateCommission(0);
    expect(result.commission).toBe(0);
    expect(result.netAmount).toBe(0);
  });
});

// ─── Cancellation Fee Tiers ─────────────────────────────────────────────────

describe("calculateCancellationFee", () => {
  // Helper: create a Date that is N hours from now
  function hoursFromNow(hours: number): Date {
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  it("returns free tier when cancelling > 24 hours before service", () => {
    const result = calculateCancellationFee(5000, hoursFromNow(48));
    expect(result.tier).toBe("free");
    expect(result.fee).toBe(0);
    expect(result.providerShare).toBe(0);
    expect(result.platformShare).toBe(0);
  });

  it("returns flat fee tier when cancelling between 1h and 24h before service", () => {
    const result = calculateCancellationFee(5000, hoursFromNow(12));
    expect(result.tier).toBe("flat");
    expect(result.fee).toBe(DEFAULT_CANCELLATION_FEE_FLAT); // 100
    expect(result.providerShare).toBe(50);
    expect(result.platformShare).toBe(50);
  });

  it("returns percentage tier when cancelling < 1 hour before service", () => {
    const result = calculateCancellationFee(5000, hoursFromNow(0.5));
    expect(result.tier).toBe("percent");
    // 20% of 5000 = 1000
    expect(result.fee).toBe(1000);
    expect(result.providerShare).toBe(500);
    expect(result.platformShare).toBe(500);
  });

  it("returns no_schedule tier when scheduleDate is null", () => {
    const result = calculateCancellationFee(5000, null);
    expect(result.tier).toBe("no_schedule");
    expect(result.fee).toBe(0);
    expect(result.hoursUntilService).toBeNull();
  });

  it("returns no_schedule tier when scheduleDate is undefined", () => {
    const result = calculateCancellationFee(5000, undefined);
    expect(result.tier).toBe("no_schedule");
  });

  it("handles zero budget in percentage tier", () => {
    const result = calculateCancellationFee(0, hoursFromNow(0.5));
    expect(result.tier).toBe("percent");
    expect(result.fee).toBe(0);
  });

  it("returns free tier at exactly the free window boundary", () => {
    const result = calculateCancellationFee(5000, hoursFromNow(24));
    expect(result.tier).toBe("free");
    expect(result.fee).toBe(0);
  });

  it("returns flat tier at exactly the percent window boundary", () => {
    const result = calculateCancellationFee(5000, hoursFromNow(1));
    expect(result.tier).toBe("flat");
    expect(result.fee).toBe(DEFAULT_CANCELLATION_FEE_FLAT);
  });

  it("splits the fee 50/50 between provider and platform", () => {
    const result = calculateCancellationFee(1000, hoursFromNow(0.25));
    // 20% of 1000 = 200 -> 100 each
    expect(result.fee).toBe(200);
    expect(result.providerShare).toBe(100);
    expect(result.platformShare).toBe(100);
  });
});
