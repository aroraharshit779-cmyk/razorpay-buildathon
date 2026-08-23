import React from 'react';
import { X, ShieldAlert, ShieldCheck, Cpu, ArrowRight, Activity, Terminal } from 'lucide-react';

export default function TransactionModal({ tx, onClose }) {
  if (!tx) return null;

  const audit = tx.audit || {};
  const stageA = audit.stage_a_rules || [];
  const stageB = audit.stage_b_llm || {};
  const hardRules = audit.hard_rules_triggered || [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', pb: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Transaction Deep Dive Audit</span>
            <h2 style={{ fontSize: '1.25rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="mono">{tx.id}</span>
              <span className={`badge-action ${tx.action_taken || 'APPROVE'}`}>{tx.action_taken}</span>
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {/* Transaction Meta Card */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Amount</div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--accent-cyan)' }} className="mono">₹{tx.amount?.toLocaleString()}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Risk Score</div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: tx.risk_score > 60 ? 'var(--accent-danger)' : 'var(--accent-success)' }} className="mono">{tx.risk_score} / 100</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Risk Vector</div>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#fff' }}>{tx.risk_vector}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Ground Truth Label</div>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: tx.ground_truth === 'LEGITIMATE_TRANSACTION' ? 'var(--accent-success)' : 'var(--accent-warning)' }}>{tx.ground_truth}</div>
          </div>
        </div>

        {/* 5-Stage Audit Timeline */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={16} /> 5-Stage Pipeline Audit Trace
          </h3>

          {/* Stage A: Rules */}
          <div style={{ background: 'rgba(0, 210, 255, 0.05)', border: '1px solid rgba(0, 210, 255, 0.2)', padding: '1rem', borderRadius: '10px', marginBottom: '0.75rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-cyan)', marginBottom: '4px' }}>
              Stage A: Deterministic Pre-screen Rules
            </div>
            {stageA.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>No deterministic rules triggered (Clean pre-screen).</div>
            ) : (
              stageA.map((rule, idx) => (
                <div key={idx} style={{ fontSize: '0.8rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span style={{ color: 'var(--accent-warning)', fontWeight: 700 }}>[{rule.rule_id}]</span> {rule.description} (+{rule.weight} score)
                </div>
              ))
            )}
          </div>

          {/* Stage B: Gemini AI */}
          <div style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '1rem', borderRadius: '10px', marginBottom: '0.75rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-indigo)', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Stage B: Gemini LLM Diagnostic Reasoning</span>
              <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Engine: {stageB.model || 'Gemini 2.5 Flash'}</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#fff', fontStyle: 'italic', marginBottom: '8px' }}>
              "{stageB.summary || 'Transaction diagnostic evaluated.'}"
            </div>
            {stageB.key_risk_indicators && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                {stageB.key_risk_indicators.map((ind, i) => (
                  <span key={i} style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: '4px', color: '#cbd5e1' }}>
                    {ind}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Stage C: Hard Rules & Policy */}
          <div style={{ background: 'rgba(255, 179, 0, 0.05)', border: '1px solid rgba(255, 179, 0, 0.2)', padding: '1rem', borderRadius: '10px', marginBottom: '0.75rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-warning)', marginBottom: '4px' }}>
              Stage C & D: Policy Bounds & Automated Action
            </div>
            <div style={{ fontSize: '0.85rem', color: '#e2e8f0' }}>
              <strong>Policy Reasoning:</strong> {audit.decision_reasoning || 'Standard score thresholds applied.'}
            </div>
            {hardRules.length > 0 && (
              <div style={{ marginTop: '6px', color: 'var(--accent-danger)', fontWeight: 600, fontSize: '0.8rem' }}>
                ⚠️ Hard Stopping Rules Triggered: {hardRules.map(h => h.rule).join(', ')}
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <button className="btn-secondary" onClick={onClose}>Close Inspector</button>
        </div>
      </div>
    </div>
  );
}
