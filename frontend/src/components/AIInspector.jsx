import React from 'react';
import { Cpu, Terminal, Shield, Zap, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AIInspector({ transactions, selectedTx, onSelectTx }) {
  const currentTx = selectedTx || transactions[0];

  if (!currentTx) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-dim)' }}>
        No transactions available for AI inspection. Run a benchmark from the Command Center!
      </div>
    );
  }

  const audit = currentTx.audit || {};
  const stageA = audit.stage_a_rules || [];
  const stageB = audit.stage_b_llm || {};
  const hardRules = audit.hard_rules_triggered || [];

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>AI Reasoning & Audit Inspector</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Step-by-step transparency visualizer explaining *why* the AI agent reached its risk score and selected action.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem' }}>
        {/* Transaction Selector List */}
        <div className="glass-panel" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
          <div className="panel-header">
            <div className="panel-title"><Terminal size={16} /> Recent Audit Traces</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {transactions.slice(0, 25).map((tx) => (
              <div
                key={tx.id}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: currentTx.id === tx.id ? 'var(--bg-card-hover)' : 'rgba(255,255,255,0.02)',
                  border: currentTx.id === tx.id ? '1px solid var(--border-active)' : '1px solid transparent',
                  cursor: 'pointer'
                }}
                onClick={() => onSelectTx(tx)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="mono" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>{tx.id}</span>
                  <span className={`badge-action ${tx.action_taken}`} style={{ fontSize: '0.65rem' }}>{tx.action_taken}</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                  Score: <strong style={{ color: '#fff' }}>{tx.risk_score}</strong> | Vector: {tx.risk_vector}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Deep Dive Panel */}
        <div className="glass-panel">
          <div className="panel-header">
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Inspecting Payment ID</span>
              <h2 className="mono" style={{ color: '#fff', fontSize: '1.25rem' }}>{currentTx.id}</h2>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className={`badge-action ${currentTx.action_taken}`}>{currentTx.action_taken}</span>
              <div className="mono" style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '4px' }}>
                Score: {currentTx.risk_score} / 100
              </div>
            </div>
          </div>

          {/* Pipeline Visualizer Steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Step 1: Detect Input Context */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '1rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent-cyan)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={16} /> Step 1: Detect & Ingest Raw Signals
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', fontSize: '0.8rem' }}>
                <div>Amount: <strong className="mono" style={{ color: '#fff' }}>₹{currentTx.amount?.toLocaleString()}</strong></div>
                <div>Method: <strong style={{ color: '#fff' }}>{currentTx.payment_method}</strong></div>
                <div>IP Address: <strong className="mono" style={{ color: '#fff' }}>{currentTx.ip_address}</strong></div>
                <div>Card BIN: <strong className="mono" style={{ color: '#fff' }}>{currentTx.card_bin}</strong></div>
                <div>Status: <strong style={{ color: '#fff' }}>{currentTx.status}</strong></div>
                <div>Ground Truth: <strong style={{ color: 'var(--accent-warning)' }}>{currentTx.ground_truth}</strong></div>
              </div>
            </div>

            {/* Step 2: Stage A Deterministic Rules */}
            <div style={{ background: 'rgba(0, 210, 255, 0.03)', border: '1px solid rgba(0, 210, 255, 0.2)', borderRadius: '12px', padding: '1rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent-cyan)', marginBottom: '0.5rem' }}>
                Step 2: Stage A Fast Deterministic Rules Engine
              </div>
              {stageA.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Clean pre-screen: No deterministic anomaly rules triggered.</div>
              ) : (
                stageA.map((r, i) => (
                  <div key={i} style={{ fontSize: '0.85rem', color: '#e2e8f0', marginBottom: '4px' }}>
                    • <strong style={{ color: 'var(--accent-warning)' }}>[{r.rule_id}]</strong> {r.description} (Score addition: +{r.weight})
                  </div>
                ))
              )}
            </div>

            {/* Step 3: Stage B Gemini LLM Diagnosis */}
            <div style={{ background: 'rgba(99, 102, 241, 0.03)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '12px', padding: '1rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent-indigo)', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Cpu size={16} /> Step 3: Stage B Gemini LLM Risk Synthesis</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Confidence: {((stageB.confidence_score || 0.9) * 100).toFixed(0)}%</span>
              </div>
              <div style={{ fontSize: '0.9rem', color: '#fff', fontStyle: 'italic', marginBottom: '8px' }}>
                "{stageB.summary || 'Transaction diagnostic evaluated.'}"
              </div>
              {stageB.key_risk_indicators && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {stageB.key_risk_indicators.map((ind, i) => (
                    <span key={i} style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: '4px', color: '#cbd5e1' }}>
                      {ind}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Step 4 & 5: Stage C & D Policy & Execution */}
            <div style={{ background: 'rgba(0, 230, 118, 0.03)', border: '1px solid rgba(0, 230, 118, 0.2)', borderRadius: '12px', padding: '1rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent-success)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={16} /> Step 4 & 5: Policy Enforcer & Action Execution
              </div>
              <div style={{ fontSize: '0.85rem', color: '#e2e8f0' }}>
                <strong>Policy Reasoning:</strong> {audit.decision_reasoning || 'Standard score thresholds applied.'}
              </div>
              {hardRules.length > 0 && (
                <div style={{ marginTop: '6px', color: 'var(--accent-danger)', fontWeight: 600, fontSize: '0.8rem' }}>
                  ⚠️ Hard Stopping Rules Applied: {hardRules.map(h => h.rule).join(', ')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
