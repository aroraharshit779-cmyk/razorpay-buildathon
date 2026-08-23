const express = require('express');
const router = express.Router();
const { evaluateStageARules } = require('../services/rulesEngine');
const { evaluateWithGemini } = require('../services/geminiAgent');
const { determineAction } = require('../services/policyEngine');
const { executeActionAndAudit } = require('../services/actionExecutor');
const { runBenchmarkEvaluation } = require('../services/evaluator');
const { generateSyntheticBatch, buildTransactionForVector } = require('../services/syntheticGenerator');
const { 
  getAllTransactions, 
  getTransactionWithAudit, 
  getPolicyConfig, 
  updatePolicyConfig,
  clearAllData 
} = require('../services/db');
const { createRazorpayOrder } = require('../services/razorpayClient');

// POST /api/risk/evaluate - Evaluate a single transaction
router.post('/evaluate', async (req, res) => {
  const startTime = Date.now();
  try {
    const rawTx = req.body;
    const tx = {
      id: rawTx.id || `tx_manual_${Date.now()}`,
      amount: parseFloat(rawTx.amount || 1500),
      currency: rawTx.currency || 'INR',
      customer_email: rawTx.customer_email || 'customer@example.com',
      customer_phone: rawTx.customer_phone || '+919876543210',
      ip_address: rawTx.ip_address || '103.21.12.4',
      card_bin: rawTx.card_bin || '459123',
      payment_method: rawTx.payment_method || 'card',
      card_country: rawTx.card_country || 'IN',
      merchant_country: rawTx.merchant_country || 'IN',
      velocity_1min: parseInt(rawTx.velocity_1min || 1),
      is_vpn: Boolean(rawTx.is_vpn),
      is_blacklisted: Boolean(rawTx.is_blacklisted),
      rto_risk_score: parseFloat(rawTx.rto_risk_score || 0.1),
      device_fingerprint_changed: Boolean(rawTx.device_fingerprint_changed),
      merchant_volume_spike_ratio: parseFloat(rawTx.merchant_volume_spike_ratio || 1.0),
      ground_truth: rawTx.ground_truth || 'LEGITIMATE_TRANSACTION'
    };

    // 1. Stage A: Rules Engine
    const stageA = evaluateStageARules(tx);

    // 2. Stage B: Gemini Agent (or Fallback)
    const stageB = await evaluateWithGemini(tx, stageA);

    // 3. Stage C: Policy Decision
    const decision = determineAction(tx, stageA, stageB);

    // 4. Stage D: Action Execution & Logging
    const executionTimeMs = Date.now() - startTime;
    const execution = await executeActionAndAudit(tx, stageA, stageB, decision, executionTimeMs);

    return res.json({
      success: true,
      data: execution
    });
  } catch (err) {
    console.error('Risk Evaluation Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/risk/batch - Run synthetic batch evaluation benchmark
router.post('/batch', async (req, res) => {
  try {
    const count = parseInt(req.body.count || 75);
    const customBatch = generateSyntheticBatch(count);
    const benchmark = await runBenchmarkEvaluation(customBatch);

    return res.json({
      success: true,
      data: benchmark
    });
  } catch (err) {
    console.error('Batch Benchmark Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/risk/transactions - List recent transactions
router.get('/transactions', (req, res) => {
  try {
    const limit = parseInt(req.query.limit || 100);
    const list = getAllTransactions(limit);
    return res.json({ success: true, count: list.length, data: list });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/risk/transactions/:id - Fetch single transaction with audit log details
router.get('/transactions/:id', (req, res) => {
  try {
    const item = getTransactionWithAudit(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }
    return res.json({ success: true, data: item });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/risk/policy - Fetch current policy thresholds
router.get('/policy', (req, res) => {
  try {
    const config = getPolicyConfig();
    return res.json({ success: true, data: config });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/risk/policy - Update policy thresholds
router.post('/policy', (req, res) => {
  try {
    const updated = updatePolicyConfig(req.body);
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/risk/create-order - Create live/simulated Razorpay order
router.post('/create-order', async (req, res) => {
  try {
    const amount = parseFloat(req.body.amount || 1000);
    const order = await createRazorpayOrder(amount);
    return res.json({ success: true, order });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/risk/clear - Reset database
router.post('/clear', (req, res) => {
  try {
    clearAllData();
    return res.json({ success: true, message: 'All database records cleared.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
