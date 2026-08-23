const { RISK_ACTION } = require('../config/constants');
const { saveTransaction, saveAuditLog } = require('./db');

/**
 * Stage D: Bounded Action Execution & Audit Logger
 * Executes automated mitigation actions, builds analyst briefs, updates DB.
 */
async function executeActionAndAudit(transaction, stageAResults, llmDiagnosis, policyDecision, executionTimeMs) {
  const { action, final_risk_score, hard_rules_triggered, policy_reasoning } = policyDecision;
  
  let status = 'PROCESSED';
  let actionPayload = {};

  switch (action) {
    case RISK_ACTION.APPROVE:
      status = 'APPROVED';
      actionPayload = {
        message: 'Transaction approved cleanly.',
        challenge_required: false
      };
      break;

    case RISK_ACTION.STEP_UP_AUTH:
      status = 'CHALLENGED_3DS';
      actionPayload = {
        message: 'Step-up 3DS authentication initiated.',
        challenge_required: true,
        auth_type: 'SMS_OTP_AND_DEVICE_VERIFY',
        nudge_message: `Razorpay Alert: High value payment of ₹${transaction.amount} requires OTP confirmation. Enter OTP sent to registered mobile.`
      };
      break;

    case RISK_ACTION.HOLD_PAYOUT:
      status = 'PAYOUT_HELD';
      actionPayload = {
        message: 'Merchant settlement payout placed on temporary 24h risk hold.',
        hold_duration_hours: 24,
        analyst_review_queued: true,
        merchant_notification: `Settlement Hold Notice: Transaction #${transaction.id} flagged for security review. Payout on hold for 24h.`
      };
      break;

    case RISK_ACTION.BLOCK_AND_FREEZE:
      status = 'BLOCKED_FRAUD';
      actionPayload = {
        message: 'Transaction blocked and IP/card fingerprint flagged.',
        blocked: true,
        risk_level: 'CRITICAL',
        analyst_brief: `CRITICAL FRAUD ALERT: Payment ID ${transaction.id} blocked (Risk Score: ${final_risk_score}/100). Vector: ${llmDiagnosis.risk_vector}. Summary: ${llmDiagnosis.summary}`
      };
      break;

    default:
      status = 'PROCESSED';
  }

  // Save updated transaction record
  const updatedTx = {
    ...transaction,
    status,
    risk_score: final_risk_score,
    risk_vector: llmDiagnosis.risk_vector,
    action_taken: action
  };

  saveTransaction(updatedTx);

  // Save comprehensive audit trail entry
  saveAuditLog({
    transaction_id: transaction.id,
    stage_a_rules: stageAResults.triggeredRules,
    stage_b_llm: llmDiagnosis,
    decision_reasoning: policy_reasoning,
    hard_rules_triggered,
    action_executed: action,
    confidence_score: llmDiagnosis.confidence_score,
    execution_time_ms: executionTimeMs
  });

  return {
    transaction_id: transaction.id,
    action,
    status,
    final_risk_score,
    risk_vector: llmDiagnosis.risk_vector,
    confidence: llmDiagnosis.confidence_score,
    summary: llmDiagnosis.summary,
    key_risk_indicators: llmDiagnosis.key_risk_indicators || [],
    policy_reasoning,
    action_payload: actionPayload,
    execution_time_ms: executionTimeMs
  };
}

module.exports = {
  executeActionAndAudit
};
