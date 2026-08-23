import React, { useState, useEffect } from 'react';
import { Sliders, Shield, Lock, Save, RotateCcw } from 'lucide-react';
import { fetchPolicy, updatePolicy } from '../services/api';

export default function PolicyConfig() {
  const [config, setConfig] = useState({
    approve_max_score: 30,
    step_up_max_score: 65,
    hold_payout_max_score: 85,
    auto_block_threshold: 80
  });
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await fetchPolicy();
      if (res.data) setConfig(res.data);
    } catch (err) {
      console.warn('Policy fetch error:', err.message);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePolicy(config);
      setSavedMsg('Policy thresholds successfully updated!');
      setTimeout(() => setSavedMsg(''), 3000);
    } catch (err) {
      alert('Error updating policy: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>Policy Bounds & Hard Rules Configurator</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Adjust risk score boundaries, automated mitigation thresholds, and review mandatory safety hard stopping rules.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Dynamic Sliders */}
        <div className="glass-panel">
          <div className="panel-header">
            <div className="panel-title"><Sliders size={18} /> Dynamic Action Threshold Sliders</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Clean Approve Score Ceiling</label>
                <span className="mono" style={{ fontWeight: 700, color: 'var(--accent-success)' }}>0 – {config.approve_max_score}</span>
              </div>
              <input
                type="range"
                min="10"
                max="50"
                value={config.approve_max_score}
                onChange={(e) => setConfig({ ...config, approve_max_score: parseInt(e.target.value) })}
                style={{ width: '100%' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Transactions below this score pass cleanly without friction.</span>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>3DS Step-Up Auth Score Ceiling</label>
                <span className="mono" style={{ fontWeight: 700, color: 'var(--accent-warning)' }}>{config.approve_max_score} – {config.step_up_max_score}</span>
              </div>
              <input
                type="range"
                min="40"
                max="75"
                value={config.step_up_max_score}
                onChange={(e) => setConfig({ ...config, step_up_max_score: parseInt(e.target.value) })}
                style={{ width: '100%' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Transactions in this range require dynamic SMS OTP / 3DS challenge.</span>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Auto-Block Critical Threshold</label>
                <span className="mono" style={{ fontWeight: 700, color: 'var(--accent-danger)' }}>{config.auto_block_threshold} – 100</span>
              </div>
              <input
                type="range"
                min="65"
                max="95"
                value={config.auto_block_threshold}
                onChange={(e) => setConfig({ ...config, auto_block_threshold: parseInt(e.target.value) })}
                style={{ width: '100%' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Transactions meeting or exceeding this score are automatically rejected.</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                <Save size={16} /> {saving ? 'Saving Policy...' : 'Save Policy Settings'}
              </button>
              {savedMsg && <span style={{ fontSize: '0.85rem', color: 'var(--accent-success)' }}>{savedMsg}</span>}
            </div>
          </div>
        </div>

        {/* Hard Stopping Rules Matrix */}
        <div className="glass-panel">
          <div className="panel-header">
            <div className="panel-title"><Lock size={18} /> Enforced Hard Stopping Rules</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'rgba(255, 51, 102, 0.08)', border: '1px solid rgba(255, 51, 102, 0.3)', padding: '1rem', borderRadius: '10px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-danger)' }}>HARD_STOP_001: Blacklist & Mass Velocity</div>
              <div style={{ fontSize: '0.8rem', color: '#e2e8f0', marginTop: '4px' }}>
                If IP/Email matches blacklist or velocity &gt; 6 tx/min → Mandatory <strong style={{ color: 'var(--accent-danger)' }}>BLOCK_AND_FREEZE</strong>.
              </div>
            </div>

            <div style={{ background: 'rgba(255, 179, 0, 0.08)', border: '1px solid rgba(255, 179, 0, 0.3)', padding: '1rem', borderRadius: '10px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-warning)' }}>HARD_STOP_002: Offshore BIN High Value</div>
              <div style={{ fontSize: '0.8rem', color: '#e2e8f0', marginTop: '4px' }}>
                If international card &gt; ₹20,000 → Mandatory <strong style={{ color: 'var(--accent-warning)' }}>STEP_UP_AUTH</strong> (Cannot bypass 3DS).
              </div>
            </div>

            <div style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '1rem', borderRadius: '10px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-purple)' }}>HARD_STOP_003: Merchant Volume Spike</div>
              <div style={{ fontSize: '0.8rem', color: '#e2e8f0', marginTop: '4px' }}>
                If merchant volume spikes &gt; 8x hourly average → Mandatory <strong style={{ color: 'var(--accent-purple)' }}>HOLD_PAYOUT</strong>.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
