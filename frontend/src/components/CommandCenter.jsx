import React from 'react';
import { ShieldCheck, ShieldAlert, Zap, DollarSign, Activity, Eye, ArrowUpRight } from 'lucide-react';

export default function CommandCenter({ transactions, onSelectTx, onRunQuickSim, loading }) {
  const totalCount = transactions.length;
  const approvedCount = transactions.filter(t => t.action_taken === 'APPROVE').length;
  const stepUpCount = transactions.filter(t => t.action_taken === 'STEP_UP_AUTH').length;
  const heldCount = transactions.filter(t => t.action_taken === 'HOLD_PAYOUT').length;
  const blockedCount = transactions.filter(t => t.action_taken === 'BLOCK_AND_FREEZE').length;

  const totalValueBlocked = transactions
    .filter(t => t.action_taken !== 'APPROVE')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  return (
    <div>
      {/* Top Banner & Quick Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>Live Risk Command Center</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Real-time Razorpay payment stream, autonomous 5-stage risk evaluation, and step-up auth trigger monitor.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-primary" onClick={onRunQuickSim} disabled={loading}>
            <Zap size={16} /> {loading ? 'Running Benchmark...' : 'Run Synthetic Batch (75 Tx)'}
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-info">
            <label>Total Transactions Evaluated</label>
            <div className="kpi-value">{totalCount}</div>
            <div className="kpi-sub">Continuous stream prescreen</div>
          </div>
          <div className="kpi-icon cyan">
            <Activity size={24} />
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-info">
            <label>Saved Fraud Value</label>
            <div className="kpi-value">₹{Math.round(totalValueBlocked).toLocaleString()}</div>
            <div className="kpi-sub">Protected merchant revenue</div>
          </div>
          <div className="kpi-icon success">
            <DollarSign size={24} />
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-info">
            <label>Blocked & Frozen</label>
            <div className="kpi-value">{blockedCount}</div>
            <div className="kpi-sub">{totalCount > 0 ? ((blockedCount / totalCount) * 100).toFixed(1) : 0}% block rate</div>
          </div>
          <div className="kpi-icon danger">
            <ShieldAlert size={24} />
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-info">
            <label>3DS Step-Up / Holds</label>
            <div className="kpi-value">{stepUpCount + heldCount}</div>
            <div className="kpi-sub">Friction auth & payout holds</div>
          </div>
          <div className="kpi-icon warning">
            <Zap size={24} />
          </div>
        </div>
      </div>

      {/* Live Transaction Stream Table */}
      <div className="glass-panel">
        <div className="panel-header">
          <div className="panel-title">
            <ShieldCheck size={20} /> Live Payment Stream & Risk Diagnostics
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Click row for deep-dive AI inspection</span>
        </div>

        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Payment ID</th>
                <th>Amount (INR)</th>
                <th>Risk Score</th>
                <th>Diagnosed Risk Vector</th>
                <th>Action Taken</th>
                <th>Ground Truth</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>
                    No transactions evaluated yet. Click <strong>Run Synthetic Batch</strong> to generate test data!
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} onClick={() => onSelectTx(tx)}>
                    <td className="mono" style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>{tx.id}</td>
                    <td className="mono" style={{ fontWeight: 700 }}>₹{tx.amount?.toLocaleString()}</td>
                    <td>
                      <span className="mono" style={{ 
                        fontWeight: 700,
                        color: tx.risk_score >= 80 ? 'var(--accent-danger)' : tx.risk_score >= 35 ? 'var(--accent-warning)' : 'var(--accent-success)'
                      }}>
                        {tx.risk_score} / 100
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{tx.risk_vector}</td>
                    <td>
                      <span className={`badge-action ${tx.action_taken || 'APPROVE'}`}>
                        {tx.action_taken}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: tx.ground_truth === 'LEGITIMATE_TRANSACTION' ? 'var(--accent-success)' : 'var(--accent-warning)' }}>
                      {tx.ground_truth}
                    </td>
                    <td>
                      <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={(e) => { e.stopPropagation(); onSelectTx(tx); }}>
                        <Eye size={14} /> Audit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
