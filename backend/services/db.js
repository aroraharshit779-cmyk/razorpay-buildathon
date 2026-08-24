const fs = require('fs');
const path = require('path');

const isVercel = Boolean(process.env.VERCEL);
const dataDir = isVercel ? '/tmp/data' : path.join(__dirname, '../data');
const storePath = path.join(dataDir, 'store.json');

try {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
} catch (e) {
  // Ignore filesystem permission errors in serverless containers
}

let store = {
  transactions: [],
  audit_logs: [],
  policy_config: {
    id: 1,
    approve_max_score: 30,
    step_up_max_score: 65,
    hold_payout_max_score: 85,
    auto_block_threshold: 80,
    updated_at: new Date().toISOString()
  },
  evaluation_runs: []
};

// Load initial store if exists
try {
  if (fs.existsSync(storePath)) {
    const raw = fs.readFileSync(storePath, 'utf8');
    store = { ...store, ...JSON.parse(raw) };
  } else {
    saveStore();
  }
} catch (err) {
  // Use in-memory store
}

function saveStore() {
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    // In-memory fallback
  }
}

module.exports = {
  saveTransaction(tx) {
    const existingIndex = store.transactions.findIndex(t => t.id === tx.id);
    const record = {
      id: tx.id,
      razorpay_payment_id: tx.razorpay_payment_id || `pay_${tx.id}`,
      merchant_id: tx.merchant_id || 'merch_default',
      amount: tx.amount || 0,
      currency: tx.currency || 'INR',
      customer_email: tx.customer_email || 'user@example.com',
      customer_phone: tx.customer_phone || '+919876543210',
      ip_address: tx.ip_address || '127.0.0.1',
      card_bin: tx.card_bin || '411111',
      payment_method: tx.payment_method || 'card',
      status: tx.status || 'PROCESSED',
      risk_score: tx.risk_score || 0,
      risk_vector: tx.risk_vector || 'LEGITIMATE_TRANSACTION',
      action_taken: tx.action_taken || 'APPROVE',
      ground_truth: tx.ground_truth || 'LEGITIMATE_TRANSACTION',
      created_at: tx.created_at || new Date().toISOString()
    };

    if (existingIndex >= 0) {
      store.transactions[existingIndex] = record;
    } else {
      store.transactions.unshift(record);
    }
    saveStore();
  },

  saveAuditLog(log) {
    const entry = {
      id: store.audit_logs.length + 1,
      transaction_id: log.transaction_id,
      stage_a_rules: log.stage_a_rules || [],
      stage_b_llm: log.stage_b_llm || {},
      decision_reasoning: log.decision_reasoning || '',
      hard_rules_triggered: log.hard_rules_triggered || [],
      action_executed: log.action_executed || 'APPROVE',
      confidence_score: log.confidence_score || 0.9,
      execution_time_ms: log.execution_time_ms || 0,
      created_at: new Date().toISOString()
    };
    store.audit_logs.unshift(entry);
    saveStore();
  },

  getAllTransactions(limit = 100) {
    return store.transactions.slice(0, limit);
  },

  getTransactionWithAudit(id) {
    const tx = store.transactions.find(t => t.id === id);
    if (!tx) return null;
    const audit = store.audit_logs.find(a => a.transaction_id === id);
    return { ...tx, audit: audit || null };
  },

  getPolicyConfig() {
    return store.policy_config;
  },

  updatePolicyConfig(config) {
    store.policy_config = {
      ...store.policy_config,
      approve_max_score: parseInt(config.approve_max_score),
      step_up_max_score: parseInt(config.step_up_max_score),
      hold_payout_max_score: parseInt(config.hold_payout_max_score),
      auto_block_threshold: parseInt(config.auto_block_threshold),
      updated_at: new Date().toISOString()
    };
    saveStore();
    return store.policy_config;
  },

  saveEvaluationRun(summary) {
    store.evaluation_runs.unshift(summary);
    saveStore();
  },

  clearAllData() {
    store.transactions = [];
    store.audit_logs = [];
    store.evaluation_runs = [];
    saveStore();
  }
};
