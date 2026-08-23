import React, { useState } from 'react';
import { Play, Sparkles, AlertTriangle, ShieldAlert, CheckCircle2, RotateCcw } from 'lucide-react';
import { evaluateSingleTx, runBatchBenchmark } from '../services/api';

const SCENARIO_PRESETS = [
  {
    name: 'Carding Velocity Attack',
    vector: 'CARDING_ATTACK',
    data: { amount: 15, velocity_1min: 7, is_vpn: true, card_bin: '539920', ground_truth: 'CARDING_ATTACK' }
  },
  {
    name: 'High-Amount Offshore Geo Mismatch',
    vector: 'HIGH_AMOUNT_GEO_MISMATCH',
    data: { amount: 48000, card_country: 'US', merchant_country: 'IN', is_vpn: true, ground_truth: 'HIGH_AMOUNT_GEO_MISMATCH' }
  },
  {
    name: 'RTO / Return Fraud Abuse (COD)',
    vector: 'RTO_COD_ABUSE',
    data: { amount: 4500, payment_method: 'cod', rto_risk_score: 0.88, ground_truth: 'RTO_COD_ABUSE' }
  },
  {
    name: 'Device Takeover & Session Swap',
    vector: 'ACCOUNT_TAKEOVER',
    data: { amount: 16500, device_fingerprint_changed: true, is_vpn: true, ground_truth: 'ACCOUNT_TAKEOVER' }
  },
  {
    name: 'Merchant Volume Spike Anomaly',
    vector: 'MERCHANT_VELOCITY_SPIKE',
    data: { amount: 28000, merchant_volume_spike_ratio: 11.2, ground_truth: 'MERCHANT_VELOCITY_SPIKE' }
  },
  {
    name: 'Known Blacklist Identity Match',
    vector: 'CHARGEBACK_DISPUTE_ABUSE',
    data: { amount: 9500, is_blacklisted: true, ground_truth: 'CHARGEBACK_DISPUTE_ABUSE' }
  }
];

export default function Simulator({ onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  
  const [formData, setFormData] = useState({
    amount: 2500,
    velocity_1min: 1,
    is_vpn: false,
    is_blacklisted: false,
    card_country: 'IN',
    rto_risk_score: 0.1,
    device_fingerprint_changed: false,
    merchant_volume_spike_ratio: 1.0,
    ground_truth: 'LEGITIMATE_TRANSACTION'
  });

  const handleRunCustom = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await evaluateSingleTx(formData);
      setResult(res.data);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Error running evaluation: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPreset = (preset) => {
    setFormData({
      amount: preset.data.amount || 2500,
      velocity_1min: preset.data.velocity_1min || 1,
      is_vpn: Boolean(preset.data.is_vpn),
      is_blacklisted: Boolean(preset.data.is_blacklisted),
      card_country: preset.data.card_country || 'IN',
      rto_risk_score: preset.data.rto_risk_score || 0.1,
      device_fingerprint_changed: Boolean(preset.data.device_fingerprint_changed),
      merchant_volume_spike_ratio: preset.data.merchant_volume_spike_ratio || 1.0,
      ground_truth: preset.data.ground_truth || 'LEGITIMATE_TRANSACTION'
    });
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>Interactive Risk Simulator & Scenario Tester</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Inject custom edge-case payment vectors or choose pre-built fraud presets to evaluate how the AI pipeline responds.
        </p>
      </div>

      {/* Fraud Preset Selectors */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {SCENARIO_PRESETS.map((preset, idx) => (
          <button
            key={idx}
            className="glass-panel"
            style={{
              padding: '1rem',
              textAlign: 'left',
              cursor: 'pointer',
              border: '1px solid var(--border-subtle)',
              marginBottom: 0,
              transition: 'all 0.2s ease'
            }}
            onClick={() => loadPreset(preset)}
          >
            <div style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase' }}>Preset Vector #{idx + 1}</div>
            <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem', marginTop: '4px' }}>{preset.name}</div>
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Custom Input Form */}
        <div className="glass-panel">
          <div className="panel-header">
            <div className="panel-title"><Sparkles size={18} /> Transaction Parameters</div>
          </div>

          <form onSubmit={handleRunCustom}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Amount (INR)</label>
                <input
                  type="number"
                  style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '8px' }}
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Velocity (Tx / 60s)</label>
                <input
                  type="number"
                  style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '8px' }}
                  value={formData.velocity_1min}
                  onChange={(e) => setFormData({ ...formData, velocity_1min: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Card Issue Country</label>
                <input
                  type="text"
                  style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '8px' }}
                  value={formData.card_country}
                  onChange={(e) => setFormData({ ...formData, card_country: e.target.value.toUpperCase() })}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>RTO Risk Score (0.0 - 1.0)</label>
                <input
                  type="number"
                  step="0.05"
                  style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '8px' }}
                  value={formData.rto_risk_score}
                  onChange={(e) => setFormData({ ...formData, rto_risk_score: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={formData.is_vpn} onChange={(e) => setFormData({ ...formData, is_vpn: e.target.checked })} />
                Commercial VPN / Anonymizer IP
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={formData.is_blacklisted} onChange={(e) => setFormData({ ...formData, is_blacklisted: e.target.checked })} />
                Known Blacklist Match
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={formData.device_fingerprint_changed} onChange={(e) => setFormData({ ...formData, device_fingerprint_changed: e.target.checked })} />
                Device & Hardware Fingerprint Shift
              </label>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              <Play size={16} /> {loading ? 'Running AI Diagnostics...' : 'Evaluate Custom Payment'}
            </button>
          </form>
        </div>

        {/* Real-time Result Output */}
        <div className="glass-panel">
          <div className="panel-header">
            <div className="panel-title"><CheckCircle2 size={18} /> Evaluation Output</div>
          </div>

          {!result ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
              Click <strong>Evaluate Custom Payment</strong> or select a preset to view AI risk scoring output.
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Assigned Action</span>
                  <div className={`badge-action ${result.action}`}>{result.action}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Calculated Risk Score</span>
                  <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 800, color: result.final_risk_score > 60 ? 'var(--accent-danger)' : 'var(--accent-success)' }}>
                    {result.final_risk_score} / 100
                  </div>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 700 }}>DIAGNOSED VECTOR</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{result.risk_vector}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>{result.summary}</div>
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>
                <strong>Execution Time:</strong> {result.execution_time_ms}ms
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
