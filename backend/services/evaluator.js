const { evaluateStageARules } = require('./rulesEngine');
const { evaluateWithGemini } = require('./geminiAgent');
const { determineAction } = require('./policyEngine');
const { executeActionAndAudit } = require('./actionExecutor');
const { generateSyntheticBatch } = require('./syntheticGenerator');
const { RISK_VECTOR, RISK_ACTION } = require('../config/constants');
const { db } = require('./db');

/**
 * Runs a complete benchmark evaluation over synthetic/labeled transactions.
 * Calculates Precision, Recall, F1 Score, FPR, Total Fraud Value Saved (₹), and Confusion Matrix.
 */
async function runBenchmarkEvaluation(customBatch = null) {
  const startTime = Date.now();
  const dataset = customBatch || generateSyntheticBatch(75);

  let truePositives = 0;   // Fraud correctly blocked / challenged
  let falsePositives = 0;  // Legitimate blocked / challenged
  let trueNegatives = 0;   // Legitimate approved
  let falseNegatives = 0;  // Fraud incorrectly approved
  let totalFraudValueSaved = 0;
  let totalFraudValueMissed = 0;

  const vectorStats = {};
  Object.values(RISK_VECTOR).forEach(v => {
    vectorStats[v] = { tp: 0, fp: 0, tn: 0, fn: 0, total: 0 };
  });

  const processedResults = [];

  for (const tx of dataset) {
    const t0 = Date.now();
    // 1. Stage A: Rules Engine
    const stageA = evaluateStageARules(tx);

    // 2. Stage B: Gemini Agent / Diagnostic Fallback
    const stageB = await evaluateWithGemini(tx, stageA);

    // 3. Stage C: Policy Decision
    const decision = determineAction(tx, stageA, stageB);

    // 4. Stage D: Action Execution & Logging
    const execution = await executeActionAndAudit(tx, stageA, stageB, decision, Date.now() - t0);

    const isActualFraud = tx.ground_truth !== RISK_VECTOR.LEGITIMATE_TRANSACTION;
    const isActionRestrictive = decision.action !== RISK_ACTION.APPROVE;

    if (isActualFraud) {
      if (isActionRestrictive) {
        truePositives++;
        totalFraudValueSaved += tx.amount;
        if (vectorStats[tx.ground_truth]) vectorStats[tx.ground_truth].tp++;
      } else {
        falseNegatives++;
        totalFraudValueMissed += tx.amount;
        if (vectorStats[tx.ground_truth]) vectorStats[tx.ground_truth].fn++;
      }
    } else {
      if (isActionRestrictive) {
        falsePositives++;
        if (vectorStats[tx.ground_truth]) vectorStats[tx.ground_truth].fp++;
      } else {
        trueNegatives++;
        if (vectorStats[tx.ground_truth]) vectorStats[tx.ground_truth].tn++;
      }
    }

    if (vectorStats[tx.ground_truth]) vectorStats[tx.ground_truth].total++;

    processedResults.push({
      tx_id: tx.id,
      ground_truth: tx.ground_truth,
      predicted_vector: stageB.risk_vector,
      action_taken: decision.action,
      amount: tx.amount,
      risk_score: decision.final_risk_score,
      execution
    });
  }

  // Calculate Precision, Recall, F1
  const precision = truePositives + falsePositives > 0 
    ? truePositives / (truePositives + falsePositives) 
    : 1.0;

  const recall = truePositives + falseNegatives > 0 
    ? truePositives / (truePositives + falseNegatives) 
    : 1.0;

  const f1Score = precision + recall > 0 
    ? (2 * precision * recall) / (precision + recall) 
    : 0;

  const falsePositiveRate = falsePositives + trueNegatives > 0 
    ? falsePositives / (falsePositives + trueNegatives) 
    : 0;

  const runId = `eval_${Date.now()}`;
  const evaluationSummary = {
    run_id: runId,
    total_transactions: dataset.length,
    precision: parseFloat(precision.toFixed(4)),
    recall: parseFloat(recall.toFixed(4)),
    f1_score: parseFloat(f1Score.toFixed(4)),
    false_positive_rate: parseFloat(falsePositiveRate.toFixed(4)),
    total_fraud_saved_inr: Math.round(totalFraudValueSaved),
    total_fraud_missed_inr: Math.round(totalFraudValueMissed),
    counts: {
      true_positives: truePositives,
      false_positives: falsePositives,
      true_negatives: trueNegatives,
      false_negatives: falseNegatives
    },
    vector_breakdown: vectorStats,
    benchmark_duration_ms: Date.now() - startTime
  };

  // Store run summary in store DB
  try {
    if (db.saveEvaluationRun) {
      db.saveEvaluationRun(evaluationSummary);
    }
  } catch (err) {
    console.warn('DB evaluation save warning:', err.message);
  }

  return {
    summary: evaluationSummary,
    results: processedResults
  };
}

module.exports = {
  runBenchmarkEvaluation
};
