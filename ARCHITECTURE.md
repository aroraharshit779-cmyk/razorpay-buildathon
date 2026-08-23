# RazorGuard AI — System Architecture & Pipeline Specification

**Razorpay AI Buildathon 2026 — Track 2: AI Risk Manager**

---

## High-Level Architecture Diagram

```
┌─────────────────┐
│ 1. DETECT       │ Razorpay API / Webhook Receiver / Synthetic Stream
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. DIAGNOSE     │ Stage A: Deterministic Rules Engine (<5ms)
│                 │ Stage B: Gemini 2.5/3.6 Flash Contextual Diagnostic Agent
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 3. DECIDE       │ Stage C: Policy Bounds & Mandatory Hard Stopping Rules
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 4. ACT          │ Stage D: Bounded Mitigation (3DS Step-Up, Settlement Hold, Alert)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 5. AUDIT        │ SQLite Trace Log, Analyst Evidence Brief, Precision & Recall Engine
└─────────────────┘
```

---

## 5-Stage Risk Processing Pipeline

### 1. DETECT Stage
Ingests transaction metadata from live Razorpay Webhooks (`payment.authorized`, `dispute.created`) or the built-in synthetic benchmark stream.
- Analyzes payment amount, currency, device fingerprint, IP address, VPN status, velocity (tx/min), card BIN issuing country, merchant category, and historical RTO score.

### 2. DIAGNOSE Stage
- **Stage A (Rules Engine)**: Evaluates deterministic rules (Blacklist match, velocity spikes, international BIN + high amount, VPN proxy, device shift).
- **Stage B (Gemini LLM Agent)**: Evaluates nuanced contextual risk signals using structured JSON prompts. Returns diagnosed risk vector, risk score (0-100), confidence level, and key risk indicators. Fallback diagnostic engine ensures zero downtime.

### 3. DECIDE Stage
Applies policy bounds and mandatory safety guardrails:
- `APPROVE` (Score ≤ 30): Clean approval.
- `STEP_UP_AUTH` (Score 30–65): Triggers dynamic 3DS / SMS OTP challenge.
- `HOLD_PAYOUT` (Score 65–85): Places 24h risk hold on merchant settlement.
- `BLOCK_AND_FREEZE` (Score ≥ 80): Rejects transaction and flags IP/account.

#### Hard Stopping Rules Matrix
1. **HARD_STOP_001 (Blacklist / Mass Velocity)**: Velocity ≥ 6 tx/min or Blacklist match → Mandatory `BLOCK_AND_FREEZE`.
2. **HARD_STOP_002 (Offshore BIN High Value)**: International card &gt; ₹20,000 → Mandatory `STEP_UP_AUTH` (Cannot bypass 3DS).
3. **HARD_STOP_003 (Merchant Volume Spike)**: Merchant volume &gt; 8x hourly average → Mandatory `HOLD_PAYOUT`.

### 4. ACT Stage
Executes bounded automated actions without human delay, generates customer-facing alerts / SMS nudges, and constructs analyst briefs.

### 5. AUDIT Stage
Stores full execution traces in SQLite (`razorguard.db`), calculates macro/micro Precision, Recall, F1-Score, False Positive Rate (FPR), and Total Fraud Value Saved in INR (₹).

---

## Diagnostic Vectors Matrix

| Risk Vector | Primary Diagnostic Signals | Default Action |
| :--- | :--- | :--- |
| **CARDING_ATTACK** | Rapid velocity (&gt;4 tx/min), low amount, virtual card BIN | `BLOCK_AND_FREEZE` |
| **HIGH_AMOUNT_GEO_MISMATCH** | Offshore card BIN, VPN IP, order value &gt; 4x merchant average | `STEP_UP_AUTH` |
| **RTO_COD_ABUSE** | Cash on delivery, address risk score &gt; 0.70, buyer return history | `STEP_UP_AUTH` |
| **ACCOUNT_TAKEOVER** | Browser hardware fingerprint shift, IP jump | `STEP_UP_AUTH` / `HOLD` |
| **MERCHANT_VELOCITY_SPIKE**| Volume ratio &gt; 8.0x normal hourly rate | `HOLD_PAYOUT` |
| **CHARGEBACK_DISPUTE_ABUSE**| Known dispute abuse blacklist match | `BLOCK_AND_FREEZE` |
| **LEGITIMATE_TRANSACTION** | Standard domestic payment, normal velocity | `APPROVE` |
