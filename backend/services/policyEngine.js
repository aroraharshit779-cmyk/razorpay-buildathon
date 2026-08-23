const { RISK_ACTION, DEFAULT_THRESHOLDS } = require('../config/constants');
const { getPolicyConfig } = require('./db');

/**
 * Stage C: Policy Engine & Hard Stopping Rules Matrix
 * Enforces strict policy bounds and mandatory safety guardrails.
 */
function determineAction(transaction, stageAResults, llmDiagnosis) {
  // Load dynamic threshold settings from DB or default
  const config = getPolicyConfig() || DEFAULT_THRESHOLDS;
  
  const hardRulesTriggered = [];
  const combinedScore = Math.round(0.4 * stageAResults.rawScore + 0.6 * llmDiagnosis.risk_score);
  
  // ----------------------------------------------------
  // HARD STOPPING RULES CHECK (Precedes numeric thresholding)
  // ----------------------------------------------------
  
  // Hard Rule 1: Blacklist Match or Extreme Velocity -> Force Block
  if (transaction.is_blacklisted || transaction.velocity_1min >= 6) {
    hardRulesTriggered.push({
      rule: 'HARD_STOP_001_BLACKLIST_OR_MASS_VELOCITY',
      action: RISK_ACTION.BLOCK_AND_FREEZE,
      reason: 'Safety Override: Blacklisted entity or severe velocity attack (>6 tx/min).'
    });
    return {
      action: RISK_ACTION.BLOCK_AND_FREEZE,
      final_risk_score: 98,
      hard_rules_triggered: hardRulesTriggered,
      policy_reasoning: 'Hard Stopping Rule triggered: Immediate automated block enforced.'
    };
  }

  // Hard Rule 2: High Amount International BIN -> Force Step-Up Auth
  if (transaction.card_country !== 'IN' && transaction.amount > 20000) {
    hardRulesTriggered.push({
      rule: 'HARD_STOP_002_HIGH_VAL_INTL_BIN',
      action: RISK_ACTION.STEP_UP_AUTH,
      reason: 'Safety Override: High-value international card transaction must undergo 3DS step-up verification.'
    });
    return {
      action: RISK_ACTION.STEP_UP_AUTH,
      final_risk_score: Math.max(combinedScore, 55),
      hard_rules_triggered: hardRulesTriggered,
      policy_reasoning: 'Hard Stopping Rule triggered: Mandatory Step-Up 3DS authentication required for international BIN high-value payment.'
    };
  }

  // Hard Rule 3: Merchant Spike Anomaly -> Force Settlement Payout Hold
  if (transaction.merchant_volume_spike_ratio > 8.0) {
    hardRulesTriggered.push({
      rule: 'HARD_STOP_003_MERCHANT_VOLUME_SPIKE_HOLD',
      action: RISK_ACTION.HOLD_PAYOUT,
      reason: 'Safety Override: Extreme merchant volume spike (>8x normal hourly average) triggers settlement hold.'
    });
    return {
      action: RISK_ACTION.HOLD_PAYOUT,
      final_risk_score: Math.max(combinedScore, 75),
      hard_rules_triggered: hardRulesTriggered,
      policy_reasoning: 'Hard Stopping Rule triggered: Settlement payout temporarily frozen for merchant risk audit.'
    };
  }

  // ----------------------------------------------------
  // DYNAMIC POLICY SCORE BOUNDS
  // ----------------------------------------------------
  let chosenAction = RISK_ACTION.APPROVE;
  let policyReasoning = '';

  if (combinedScore >= config.auto_block_threshold) {
    chosenAction = RISK_ACTION.BLOCK_AND_FREEZE;
    policyReasoning = `Risk score (${combinedScore}) exceeds auto-block threshold (${config.auto_block_threshold}).`;
  } else if (combinedScore >= config.step_up_max_score) {
    chosenAction = RISK_ACTION.HOLD_PAYOUT;
    policyReasoning = `Risk score (${combinedScore}) is in elevated risk zone (${config.step_up_max_score}-${config.auto_block_threshold}). Holding settlement.`;
  } else if (combinedScore >= config.approve_max_score) {
    chosenAction = RISK_ACTION.STEP_UP_AUTH;
    policyReasoning = `Risk score (${combinedScore}) requires friction step-up authentication before completion.`;
  } else {
    chosenAction = RISK_ACTION.APPROVE;
    policyReasoning = `Risk score (${combinedScore}) is within acceptable low-risk threshold (<= ${config.approve_max_score}).`;
  }

  return {
    action: chosenAction,
    final_risk_score: combinedScore,
    hard_rules_triggered: hardRulesTriggered,
    policy_reasoning: policyReasoning
  };
}

module.exports = {
  determineAction
};
