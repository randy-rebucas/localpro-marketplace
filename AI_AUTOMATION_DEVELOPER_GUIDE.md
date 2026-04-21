# AI Automation - Developer Implementation Guide
**For:** Developers adding new agents or modifying existing ones  
**Updated:** April 21, 2026

---

## How to Add a New Agent

### Step 1: Define Types

Create new decision type and agent name in `src/models/AIDecision.ts`:

```typescript
// Add to AIDecisionType union
export type AIDecisionType = 
  | "VALIDATION"
  | "DISPUTE"
  | "PAYOUT"
  | "SUPPORT"
  | "LEAD_SCORING"
  | "KYC_VERIFICATION"
  | "FRAUD_CHECK"
  | "BOOKING_MATCH"
  | "ESCROW_RELEASE"
  | "RISK_DETECTION"
  | "REVIEW_MODERATION"
  | "OUTREACH_DECISION"
  | "NEW_AGENT_TYPE";  // ← Add here

// Add to AIAgentName union
export type AIAgentName = 
  | "support_agent"
  | "operations_manager"
  | "dispute_resolver"
  | "kyc_verifier"
  | "fraud_detector"
  | "sales_agent"
  | "booking_optimizer"
  | "escrow_manager"
  | "proactive_support"
  | "review_moderator"
  | "outreach_agent"
  | "new_agent_name";  // ← Add here

// Update schema enums
const AIDecisionSchema = new Schema<IAIDecision>({
  type: {
    enum: [
      "VALIDATION",
      "DISPUTE",
      "PAYOUT",
      "SUPPORT",
      "LEAD_SCORING",
      "KYC_VERIFICATION",
      "FRAUD_CHECK",
      "BOOKING_MATCH",
      "ESCROW_RELEASE",
      "RISK_DETECTION",
      "REVIEW_MODERATION",
      "OUTREACH_DECISION",
      "NEW_AGENT_TYPE",  // ← Add here
    ],
    required: true,
    index: true,
  },
  agentName: {
    enum: [
      "support_agent",
      "operations_manager",
      "dispute_resolver",
      "kyc_verifier",
      "fraud_detector",
      "sales_agent",
      "booking_optimizer",
      "escrow_manager",
      "proactive_support",
      "review_moderator",
      "outreach_agent",
      "new_agent_name",  // ← Add here
    ],
    required: true,
  },
  // ... rest of schema
});
```

### Step 2: Create Agent Endpoint

Create `src/app/api/ai/agents/new-agent-name.ts`:

```typescript
/**
 * New Agent Handler
 * Purpose: Brief description
 * POST /api/ai/agents/new-agent-name
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { connectDB } from "@/lib/db";
import { withHandler } from "@/lib/utils";
import { AIDecisionService } from "@/services/ai-decision.service";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Define input interface
interface NewAgentInput {
  fieldOne: string;
  fieldTwo: number;
  // ... other fields
}

// Define output interface
interface NewAgentDecision {
  decision: {
    recommendation: string;
    confidence: number;        // 0-100
    riskLevel: "low" | "medium" | "high" | "critical";
  };
  supportingDetails?: {
    // ... context-specific fields
  };
}

/**
 * Handler function
 */
export const POST = withHandler(async (req: NextRequest) => {
  try {
    // Parse request
    const input: NewAgentInput = await req.json();

    // Validate input
    if (!input.fieldOne) {
      return NextResponse.json(
        { error: "fieldOne is required" },
        { status: 400 }
      );
    }

    // Connect to DB
    await connectDB();

    // Build AI prompt
    const prompt = `You are an expert AI agent for [domain].
    
Analyze this data:
- Field One: ${input.fieldOne}
- Field Two: ${input.fieldTwo}

Provide a JSON response with:
- recommendation (string): Your primary recommendation
- confidence (number): How confident (0-100)
- riskLevel (string): low/medium/high/critical
- reasoning (string): Why you recommend this

Return ONLY valid JSON.`;

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 500,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: "You are a decision-making AI agent. Return valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Parse response
    const responseText = completion.choices[0]?.message?.content || "{}";
    const aiResponse = JSON.parse(responseText);

    // Create decision
    const decision = await AIDecisionService.createDecision({
      type: "NEW_AGENT_TYPE",
      agentName: "new_agent_name",
      recommendation: aiResponse.recommendation,
      confidenceScore: aiResponse.confidence,
      riskLevel: aiResponse.riskLevel,
      supportingEvidence: {
        patternDetected: aiResponse.reasoning,
      },
      relatedEntityType: "lead",  // or appropriate type
      relatedEntityId: input.entityId,
    });

    // Return response
    return NextResponse.json({
      decision: {
        recommendation: aiResponse.recommendation,
        confidence: aiResponse.confidence,
        riskLevel: aiResponse.riskLevel,
      },
      supportingDetails: {
        reasoning: aiResponse.reasoning,
      },
      decisionId: decision._id,  // For tracking
    });
  } catch (error) {
    console.error("[New Agent] error:", error);
    return NextResponse.json(
      { error: "Agent processing failed" },
      { status: 500 }
    );
  }
});
```

### Step 3: Add to Sidebar Navigation

Update `src/components/layout/Sidebar.tsx`:

```typescript
const navGroups: Partial<Record<UserRole, NavGroup[]>> = {
  admin: [
    // ... existing groups

    {
      heading: "AI Automation",
      items: [
        { 
          label: "Decision Queue",   
          href: "/admin/approval-queue", 
          icon: <Brain className="h-4.5 w-4.5" />, 
          capability: "manage_operations" 
        },
        { 
          label: "AI Performance",   
          href: "/admin/ai-performance", 
          icon: <TrendingUpIcon className="h-4.5 w-4.5" />, 
          capability: "manage_operations" 
        },
        { 
          label: "AI Metrics",       
          href: "/admin/ai-metrics", 
          icon: <FileBarChart className="h-4.5 w-4.5" />, 
          capability: "manage_operations" 
        },
        // ↓ Add your new agent here if it needs its own dashboard
        { 
          label: "New Agent Insights",       
          href: "/admin/new-agent-insights", 
          icon: <IconName className="h-4.5 w-4.5" />, 
          capability: "manage_operations" 
        },
      ],
    },
  ],
};
```

### Step 4: Update Approval Queue Filters

Update `src/components/admin/AIApprovalDashboard.tsx`:

```typescript
<select
  value={filters.agentName}
  onChange={(e) => setFilters({ ...filters, agentName: e.target.value })}
  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
>
  <option value="">All Agents</option>
  <option value="support_agent">Support Agent</option>
  <option value="operations_manager">Operations Manager</option>
  {/* ... other agents ... */}
  <option value="new_agent_name">New Agent Name</option>  {/* ← Add here */}
</select>
```

### Step 5: Add to API Metrics Query

Update `src/app/api/admin/ai-metrics/route.ts`:

```typescript
const agents = [
  // Phase 1-2: Core Operations
  "support_agent",
  "operations_manager",
  "dispute_resolver",
  // Phase 4: Identity & Fraud
  "kyc_verifier",
  "fraud_detector",
  // Phase 5: Sales
  "sales_agent",
  // Phase 6: Booking & Escrow
  "booking_optimizer",
  "escrow_manager",
  // Phase 7: Quality & Growth
  "proactive_support",
  "review_moderator",
  "outreach_agent",
  // Phase 8: New Agents
  "new_agent_name",  // ← Add here
];
```

### Step 6: Write Tests

Create `src/app/api/ai/agents/new-agent-name.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";

describe("New Agent", () => {
  const endpoint = "http://localhost:3000/api/ai/agents/new-agent-name";

  describe("Basic Functionality", () => {
    it("should make a decision", async () => {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fieldOne: "test value",
          fieldTwo: 123,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.decision).toBeDefined();
      expect(data.decision.confidence).toBeGreaterThan(0);
      expect(data.decision.confidence).toBeLessThanOrEqual(100);
    });

    it("should require fieldOne", async () => {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fieldTwo: 123,
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("Decision Quality", () => {
    it("should have valid riskLevel", async () => {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fieldOne: "test",
          fieldTwo: 456,
        }),
      });

      const data = await response.json();
      expect(["low", "medium", "high", "critical"]).toContain(
        data.decision.riskLevel
      );
    });

    it("should save decision to database", async () => {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fieldOne: "test",
          fieldTwo: 789,
        }),
      });

      const data = await response.json();
      expect(data.decisionId).toBeDefined();

      // Verify in DB
      // ... DB lookup code ...
    });
  });
});
```

### Step 7: Update Documentation

Add entry to `AI_AUTOMATION_QUICK_REFERENCE.md`:

```markdown
| # | Agent | Purpose | Endpoint | Decision Type | Auto-Approve Rate |
|---|-------|---------|----------|---------------|-------------------|
| 12 | New Agent | Purpose here | `/api/ai/agents/new-agent-name` | NEW_AGENT_TYPE | 70% |
```

---

## How to Modify Existing Agent

### Change Decision Logic

```typescript
// In src/app/api/ai/agents/support-agent.ts

// BEFORE
const prompt = `Old instructions...`;

// AFTER
const prompt = `New instructions...
Additional context: ...
New decision criteria: ...`;
```

### Change Confidence Scoring

```typescript
// BEFORE
const confidenceScore = Math.min(100, baseScore + sentimentBonus);

// AFTER
const confidenceScore = Math.min(
  100, 
  (baseScore * 0.7) + (sentimentBonus * 0.2) + (historyBonus * 0.1)
);
```

### Add New Evidence Field

```typescript
// 1. Update model schema in src/models/AIDecision.ts
supportingEvidence?: {
  fraudScore?: number;
  behavioralFlags?: string[];
  newField?: string;  // ← Add here
  patternDetected?: string;
  // ... rest
};

// 2. Update agent to populate it
const decision = await AIDecisionService.createDecision({
  // ...
  supportingEvidence: {
    fraudScore: 45,
    newField: "new value",  // ← Add here
  },
});
```

---

## Common Patterns

### Pattern 1: Risk Score Calculation

```typescript
// Calculate risk from multiple signals
function calculateRisk(signals: {
  newAccountDays: number;
  transactionVelocity: number;
  priorFraudFlags: number;
}): { score: number; level: string } {
  let score = 0;

  // Weight by importance
  score += signals.newAccountDays < 30 ? 30 : 0;      // New account = risky
  score += signals.transactionVelocity > 5 ? 40 : 0;  // High velocity = risky
  score += signals.priorFraudFlags > 0 ? 20 : 0;      // History = risky

  const level = 
    score >= 75 ? "critical" :
    score >= 50 ? "high" :
    score >= 25 ? "medium" :
    "low";

  return { score: Math.min(score, 100), level };
}
```

### Pattern 2: Confidence Based on Evidence

```typescript
// Higher confidence with more evidence
function calculateConfidence(evidence: {
  fieldCount: number;
  dataQuality: number;
  historical: boolean;
}): number {
  let confidence = 50;  // Base confidence

  confidence += evidence.fieldCount * 5;     // +5 per field
  confidence += evidence.dataQuality * 30;   // 0-30 based on quality
  confidence += evidence.historical ? 15 : 0;  // +15 if historical data

  return Math.min(confidence, 100);
}
```

### Pattern 3: Message Generation

```typescript
// Generate human-readable message
function generateRecommendation(decision: {
  recommendation: string;
  confidence: number;
  reasoning: string;
}): string {
  const confidence = decision.confidence >= 85 ? "strongly" :
                    decision.confidence >= 70 ? "" :
                    "tentatively";

  return `I ${confidence} recommend: ${decision.recommendation}. ${decision.reasoning}`;
}
```

### Pattern 4: Multi-Signal Decision

```typescript
// Combine multiple signals for decision
async function makeDecision(data: InputData): Promise<Decision> {
  // Get individual signals
  const signal1 = analyzeSignal1(data);
  const signal2 = analyzeSignal2(data);
  const signal3 = analyzeSignal3(data);

  // Combine with weighting
  const combined = {
    score: (signal1.score * 0.5) + (signal2.score * 0.3) + (signal3.score * 0.2),
    signals: [signal1, signal2, signal3],
  };

  // Make decision
  return {
    recommendation: combined.score > 70 ? "approve" : "reject",
    confidence: combined.score,
    evidence: combined.signals,
  };
}
```

---

## Performance Optimization

### Cache Results

```typescript
import NodeCache from "node-cache";

const cache = new NodeCache({ stdTTL: 600 });  // 10 minutes

export const POST = withHandler(async (req: NextRequest) => {
  const cacheKey = `agent:${JSON.stringify(req.body)}`;
  
  // Check cache
  const cached = cache.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  // Process...
  const result = await processRequest(req);

  // Cache result
  cache.set(cacheKey, result);

  return NextResponse.json(result);
});
```

### Batch Processing

```typescript
// Process multiple items efficiently
async function processBatch(items: InputItem[]): Promise<Decision[]> {
  return Promise.all(
    items.map(item => processItem(item))
  );
}

// Use in batch endpoint
export const POST = withHandler(async (req: NextRequest) => {
  const { items } = await req.json();
  const decisions = await processBatch(items);
  
  // Save all at once
  await AIDecisionService.createBulkDecisions(decisions);

  return NextResponse.json({ count: decisions.length });
});
```

### Early Exit

```typescript
// Return early if obviously incorrect
export const POST = withHandler(async (req: NextRequest) => {
  const input = await req.json();

  // Quick validation
  if (input.amount > 10000000) {
    return NextResponse.json({
      decision: "reject",
      confidence: 100,
      riskLevel: "critical",
      reason: "Amount exceeds maximum allowed",
    });
  }

  // Only call AI if needed
  const aiDecision = await callAI(input);
  
  return NextResponse.json(aiDecision);
});
```

---

## Error Handling

### Graceful Degradation

```typescript
export const POST = withHandler(async (req: NextRequest) => {
  try {
    const input = await req.json();

    // Try AI first
    try {
      const aiResponse = await callOpenAI(input);
      return NextResponse.json(aiResponse);
    } catch (aiError) {
      console.warn("AI failed, using fallback", aiError);
      
      // Fallback to rule-based decision
      const fallbackDecision = applyFallbackRules(input);
      return NextResponse.json(fallbackDecision);
    }
  } catch (error) {
    console.error("Agent error:", error);
    return NextResponse.json(
      { error: "Decision processing failed" },
      { status: 500 }
    );
  }
});
```

### Retry Logic

```typescript
async function callWithRetry(fn: () => Promise<any>, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      
      // Exponential backoff
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }
}

// Use in agent
const aiResponse = await callWithRetry(() => openai.chat.completions.create({
  // ... config
}));
```

---

## Testing Strategies

### Unit Test Template

```typescript
describe("New Agent", () => {
  describe("Input Validation", () => {
    it("should reject missing required fields");
    it("should reject invalid types");
    it("should reject out-of-range values");
  });

  describe("Decision Making", () => {
    it("should make consistent decisions");
    it("should have appropriate confidence");
    it("should detect edge cases");
  });

  describe("Edge Cases", () => {
    it("should handle null values");
    it("should handle very large values");
    it("should handle special characters");
  });

  describe("Performance", () => {
    it("should respond in <2 seconds");
    it("should handle concurrent requests");
  });

  describe("Integration", () => {
    it("should save decision to database");
    it("should trigger notifications");
    it("should update metrics");
  });
});
```

---

## Deployment Checklist

Before deploying a new agent:

- [ ] Types added to AIDecision model
- [ ] Types exported properly
- [ ] Agent endpoint implemented
- [ ] Input validation complete
- [ ] OpenAI prompt optimized
- [ ] Error handling comprehensive
- [ ] Tests passing (100%)
- [ ] Performance verified (<2s)
- [ ] Sidebar navigation updated
- [ ] Approval queue filters updated
- [ ] Metrics API updated
- [ ] Documentation updated
- [ ] Code reviewed
- [ ] Staging deployment successful
- [ ] Production monitoring set up
- [ ] Rollback plan ready

---

## Common Mistakes to Avoid

❌ **Don't:**
- Forget to add type to enum in model
- Call OpenAI without error handling
- Save decision without decision service
- Hardcode confidence scores
- Skip input validation
- Ignore timezone differences
- Log sensitive data
- Cache decisions permanently
- Trust user input directly

✅ **Do:**
- Use decision service for all saves
- Implement proper error handling
- Use type system effectively
- Validate all inputs
- Log decision reasoning
- Handle timezones explicitly
- Mask sensitive data in logs
- Use appropriate cache TTL
- Sanitize user input

---

## Getting Help

- **Questions:** Ask in #ai-platform-dev Slack
- **Code Review:** Tag @ai-team
- **Production Issues:** @oncall
- **Documentation:** Edit and PR this guide

---

**Version:** 1.0  
**Last Updated:** April 21, 2026
