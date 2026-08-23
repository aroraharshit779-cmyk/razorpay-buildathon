const express = require('express');
const router = express.Router();
const { evaluateStageARules } = require('../services/rulesEngine');
const { evaluateWithGemini } = require('../services/geminiAgent');
const { determineAction } = require('../services/policyEngine');
const { executeActionAndAudit } = require('../services/actionExecutor');

// POST /api/webhooks/razorpay - Razorpay webhook listener endpoint
router.post('/razorpay', async (req, res) => {
  const startTime = Date.now();
  try {
    const event = req.body.event || 'payment.authorized';
    const payload = req.body.payload?.payment?.entity || req.body;

    console.log(`[Webhook Received] Event: ${event}, ID: ${payload.id || 'N/A'}`);

    const tx = {
      id: payload.id || `pay_wh_${Date.now()}`,
      razorpay_payment_id: payload.id || `pay_${Date.now()}`,
      merchant_id: payload.notes?.merchant_id || 'merch_webhook',
      amount: (payload.amount || 250000) / 100, // convert paise to INR
      currency: payload.currency || 'INR',
      customer_email: payload.email || 'customer@example.com',
      customer_phone: payload.contact || '+919876543210',
      ip_address: payload.ip || '103.14.22.9',
      card_bin: payload.card?.international ? '371234' : '459123',
      payment_method: payload.method || 'card',
      card_country: payload.card?.international ? 'US' : 'IN',
      merchant_country: 'IN',
      velocity_1min: req.body.velocity_1min || 1,
      is_vpn: Boolean(req.body.is_vpn),
      is_blacklisted: event === 'dispute.created',
      rto_risk_score: req.body.rto_risk_score || 0.1,
      device_fingerprint_changed: Boolean(req.body.device_fingerprint_changed),
      ground_truth: event === 'dispute.created' ? 'CHARGEBACK_DISPUTE_ABUSE' : 'LEGITIMATE_TRANSACTION'
    };

    // Process through RazorGuard 5-Stage Pipeline
    const stageA = evaluateStageARules(tx);
    const stageB = await evaluateWithGemini(tx, stageA);
    const decision = determineAction(tx, stageA, stageB);
    const execution = await executeActionAndAudit(tx, stageA, stageB, decision, Date.now() - startTime);

    return res.json({
      received: true,
      event,
      razorguard_action: execution.action,
      risk_score: execution.final_risk_score,
      summary: execution.summary
    });
  } catch (err) {
    console.error('Webhook Handling Error:', err);
    return res.status(500).json({ received: false, error: err.message });
  }
});

module.exports = router;
