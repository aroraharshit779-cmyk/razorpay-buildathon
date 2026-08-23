const { RISK_VECTOR } = require('../config/constants');

/**
 * Synthetic Transaction Generator for RazorGuard AI Evaluation
 * Generates realistic benchmark datasets with ground-truth labels for precision & recall benchmarking.
 */

const INDIAN_CITIES = ['Mumbai', 'Bengaluru', 'Delhi NCR', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad'];
const INTERNATIONAL_COUNTRIES = ['US', 'GB', 'RU', 'CN', 'NG', 'BR', 'RO', 'DE'];
const CARD_BINS = {
  DOMESTIC_VISA: '459123',
  DOMESTIC_RUPAY: '607099',
  INTERNATIONAL_AMEX: '371234',
  HIGH_RISK_PREPAID: '524188',
  VIRTUAL_CARD: '539920'
};

function generateSyntheticBatch(count = 75) {
  const transactions = [];
  const vectors = Object.values(RISK_VECTOR);

  for (let i = 1; i <= count; i++) {
    const txId = `tx_synth_${Date.now()}_${i.toString().padStart(3, '0')}`;
    let vector = RISK_VECTOR.LEGITIMATE_TRANSACTION;

    // Distribution: ~45% Legitimate, ~55% across various risk vectors
    const rand = Math.random();
    if (rand < 0.45) {
      vector = RISK_VECTOR.LEGITIMATE_TRANSACTION;
    } else if (rand < 0.55) {
      vector = RISK_VECTOR.CARDING_ATTACK;
    } else if (rand < 0.65) {
      vector = RISK_VECTOR.HIGH_AMOUNT_GEO_MISMATCH;
    } else if (rand < 0.75) {
      vector = RISK_VECTOR.RTO_COD_ABUSE;
    } else if (rand < 0.83) {
      vector = RISK_VECTOR.ACCOUNT_TAKEOVER;
    } else if (rand < 0.90) {
      vector = RISK_VECTOR.MERCHANT_VELOCITY_SPIKE;
    } else if (rand < 0.95) {
      vector = RISK_VECTOR.CHARGEBACK_DISPUTE_ABUSE;
    } else {
      vector = RISK_VECTOR.SUSPICIOUS_BIN_ATTACK;
    }

    const tx = buildTransactionForVector(txId, vector, i);
    transactions.push(tx);
  }

  return transactions;
}

function buildTransactionForVector(id, vector, index) {
  const base = {
    id,
    razorpay_payment_id: `pay_${id}`,
    merchant_id: `merch_${(index % 5) + 1}`,
    merchant_country: 'IN',
    merchant_avg_amount: 1800,
    currency: 'INR',
    customer_email: `user${index}@example.com`,
    customer_phone: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
    ip_address: `103.${(index * 7) % 255}.${(index * 13) % 255}.42`,
    payment_method: 'card',
    card_country: 'IN',
    card_bin: CARD_BINS.DOMESTIC_VISA,
    velocity_1min: 1,
    is_vpn: false,
    is_blacklisted: false,
    rto_risk_score: 0.12,
    device_fingerprint_changed: false,
    merchant_volume_spike_ratio: 1.0,
    ground_truth: vector
  };

  switch (vector) {
    case RISK_VECTOR.LEGITIMATE_TRANSACTION:
      return {
        ...base,
        amount: Math.floor(400 + Math.random() * 2500),
        rto_risk_score: parseFloat((Math.random() * 0.2).toFixed(2))
      };

    case RISK_VECTOR.CARDING_ATTACK:
      return {
        ...base,
        amount: Math.floor(10 + Math.random() * 50),
        velocity_1min: Math.floor(5 + Math.random() * 6),
        is_vpn: Math.random() > 0.3,
        card_bin: CARD_BINS.VIRTUAL_CARD
      };

    case RISK_VECTOR.HIGH_AMOUNT_GEO_MISMATCH:
      return {
        ...base,
        amount: Math.floor(35000 + Math.random() * 60000),
        card_country: INTERNATIONAL_COUNTRIES[index % INTERNATIONAL_COUNTRIES.length],
        ip_address: `185.${index % 250}.12.8`,
        is_vpn: true,
        card_bin: CARD_BINS.INTERNATIONAL_AMEX
      };

    case RISK_VECTOR.RTO_COD_ABUSE:
      return {
        ...base,
        payment_method: 'cod',
        amount: Math.floor(3000 + Math.random() * 7000),
        rto_risk_score: parseFloat((0.72 + Math.random() * 0.25).toFixed(2))
      };

    case RISK_VECTOR.ACCOUNT_TAKEOVER:
      return {
        ...base,
        amount: Math.floor(12000 + Math.random() * 18000),
        device_fingerprint_changed: true,
        ip_address: `49.${index % 200}.88.11`,
        is_vpn: true
      };

    case RISK_VECTOR.MERCHANT_VELOCITY_SPIKE:
      return {
        ...base,
        amount: Math.floor(15000 + Math.random() * 25000),
        merchant_volume_spike_ratio: parseFloat((9.5 + Math.random() * 5.0).toFixed(1))
      };

    case RISK_VECTOR.CHARGEBACK_DISPUTE_ABUSE:
      return {
        ...base,
        amount: Math.floor(8000 + Math.random() * 14000),
        is_blacklisted: true
      };

    case RISK_VECTOR.SUSPICIOUS_BIN_ATTACK:
      return {
        ...base,
        amount: Math.floor(5000 + Math.random() * 12000),
        card_bin: CARD_BINS.HIGH_RISK_PREPAID,
        velocity_1min: 4,
        is_vpn: true
      };

    default:
      return base;
  }
}

module.exports = {
  generateSyntheticBatch,
  buildTransactionForVector
};
