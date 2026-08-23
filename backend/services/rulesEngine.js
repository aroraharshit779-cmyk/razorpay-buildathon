const { RISK_VECTOR } = require('../config/constants');

/**
 * Stage A: Fast Deterministic Rules Engine
 * Evaluates concrete heuristic rules before calling LLM.
 * Returns score additions, rule triggers, and candidate risk vectors.
 */
function evaluateStageARules(transaction, historicalContext = {}) {
  const triggeredRules = [];
  let scoreAdditions = 0;
  let candidateVector = null;

  const {
    amount = 0,
    currency = 'INR',
    ip_address = '127.0.0.1',
    is_vpn = false,
    card_country = 'IN',
    merchant_country = 'IN',
    velocity_1min = 1,
    merchant_avg_amount = 2500,
    rto_risk_score = 0.1,
    payment_method = 'card',
    is_blacklisted = false,
    device_fingerprint_changed = false
  } = transaction;

  // Rule 1: Known Blacklist Match
  if (is_blacklisted) {
    triggeredRules.push({
      rule_id: 'RUL_001_BLACKLIST_MATCH',
      severity: 'CRITICAL',
      weight: 90,
      description: 'Customer email, phone, or IP matches known fraud blacklist database.'
    });
    scoreAdditions += 90;
    candidateVector = RISK_VECTOR.CARDING_ATTACK;
  }

  // Rule 2: High Velocity Carding Attempt
  if (velocity_1min >= 4) {
    const weight = velocity_1min >= 7 ? 85 : 60;
    triggeredRules.push({
      rule_id: 'RUL_002_HIGH_VELOCITY',
      severity: velocity_1min >= 7 ? 'HIGH' : 'MEDIUM',
      weight,
      description: `High transaction velocity detected (${velocity_1min} transactions in 60s from same IP/device).`
    });
    scoreAdditions += weight;
    if (!candidateVector) candidateVector = RISK_VECTOR.CARDING_ATTACK;
  }

  // Rule 3: Geo-IP & International BIN Mismatch on High Value
  if (card_country !== merchant_country && amount > 15000) {
    triggeredRules.push({
      rule_id: 'RUL_003_GEO_BIN_MISMATCH',
      severity: 'HIGH',
      weight: 45,
      description: `International card issued in (${card_country}) used for high-value domestic payment (₹${amount}) with merchant in (${merchant_country}).`
    });
    scoreAdditions += 45;
    if (!candidateVector) candidateVector = RISK_VECTOR.HIGH_AMOUNT_GEO_MISMATCH;
  }

  // Rule 4: Extreme Amount Spike Anomaly
  if (amount > merchant_avg_amount * 4 && amount > 25000) {
    triggeredRules.push({
      rule_id: 'RUL_004_AMOUNT_SPIKE_ANOMALY',
      severity: 'HIGH',
      weight: 40,
      description: `Transaction amount (₹${amount}) is ${ (amount / merchant_avg_amount).toFixed(1) }x higher than merchant average order value (₹${merchant_avg_amount}).`
    });
    scoreAdditions += 40;
    if (!candidateVector) candidateVector = RISK_VECTOR.HIGH_AMOUNT_GEO_MISMATCH;
  }

  // Rule 5: VPN / TOR Proxy Anomaly
  if (is_vpn && amount > 5000) {
    triggeredRules.push({
      rule_id: 'RUL_005_VPN_PROXY_USAGE',
      severity: 'MEDIUM',
      weight: 25,
      description: 'Transaction originated from a commercial VPN/anonymizer proxy endpoint.'
    });
    scoreAdditions += 25;
  }

  // Rule 6: High RTO / COD Non-Delivery History
  if (rto_risk_score >= 0.65) {
    const weight = rto_risk_score >= 0.85 ? 55 : 35;
    triggeredRules.push({
      rule_id: 'RUL_006_HIGH_RTO_RISK',
      severity: rto_risk_score >= 0.85 ? 'HIGH' : 'MEDIUM',
      weight,
      description: `Elevated Return-To-Origin (RTO) risk factor (${(rto_risk_score * 100).toFixed(0)}%) for customer delivery profile.`
    });
    scoreAdditions += weight;
    candidateVector = RISK_VECTOR.RTO_COD_ABUSE;
  }

  // Rule 7: Device Fingerprint Shift / Suspicious Session Swap
  if (device_fingerprint_changed && amount > 10000) {
    triggeredRules.push({
      rule_id: 'RUL_007_DEVICE_TAKEOVER',
      severity: 'MEDIUM',
      weight: 35,
      description: 'Sudden change in browser user-agent and hardware fingerprint during checkout session.'
    });
    scoreAdditions += 35;
    if (!candidateVector) candidateVector = RISK_VECTOR.ACCOUNT_TAKEOVER;
  }

  const finalScore = Math.min(100, scoreAdditions);

  return {
    rawScore: finalScore,
    triggeredRules,
    isAmbiguous: finalScore > 20 && finalScore < 80,
    candidateVector: candidateVector || (finalScore < 20 ? RISK_VECTOR.LEGITIMATE_TRANSACTION : RISK_VECTOR.HIGH_AMOUNT_GEO_MISMATCH)
  };
}

module.exports = {
  evaluateStageARules
};
