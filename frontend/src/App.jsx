import React, { useState, useEffect } from 'react';
import { Shield, Activity, Sparkles, Cpu, Award, Sliders, RefreshCw } from 'lucide-react';
import { fetchTransactions, runBatchBenchmark, fetchHealth } from './services/api';

import CommandCenter from './components/CommandCenter';
import Simulator from './components/Simulator';
import AIInspector from './components/AIInspector';
import EvaluationView from './components/EvaluationView';
import PolicyConfig from './components/PolicyConfig';
import TransactionModal from './components/TransactionModal';

export default function App() {
  const [activeTab, setActiveTab] = useState('command');
  const [transactions, setTransactions] = useState([]);
  const [selectedTx, setSelectedTx] = useState(null);
  const [loading, setLoading] = useState(false);
  const [systemHealth, setSystemHealth] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const health = await fetchHealth();
      setSystemHealth(health);

      const res = await fetchTransactions(100);
      if (res.data && res.data.length > 0) {
        setTransactions(res.data);
      } else {
        // Run initial synthetic benchmark automatically if database is empty
        const benchRes = await runBatchBenchmark(75);
        if (benchRes.data && benchRes.data.results) {
          const fresh = await fetchTransactions(100);
          setTransactions(fresh.data || []);
        }
      }
    } catch (err) {
      console.warn('Initial data load notice:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRunQuickSim = async () => {
    setLoading(true);
    try {
      await runBatchBenchmark(75);
      const updated = await fetchTransactions(100);
      setTransactions(updated.data || []);
    } catch (err) {
      alert('Batch run error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshTransactions = async () => {
    try {
      const updated = await fetchTransactions(100);
      setTransactions(updated.data || []);
    } catch (err) {
      console.warn('Refresh error:', err.message);
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="brand-logo">
          <Shield size={28} />
          <div>
            <span>RazorGuard AI</span>
            <span className="brand-tag">Track 2: Risk Manager</span>
          </div>
        </div>

        {/* Nav Tabs */}
        <nav className="nav-tabs">
          <button className={`nav-tab ${activeTab === 'command' ? 'active' : ''}`} onClick={() => setActiveTab('command')}>
            <Activity size={16} /> Command Center
          </button>
          <button className={`nav-tab ${activeTab === 'simulator' ? 'active' : ''}`} onClick={() => setActiveTab('simulator')}>
            <Sparkles size={16} /> Simulator
          </button>
          <button className={`nav-tab ${activeTab === 'inspector' ? 'active' : ''}`} onClick={() => setActiveTab('inspector')}>
            <Cpu size={16} /> AI Inspector
          </button>
          <button className={`nav-tab ${activeTab === 'evaluation' ? 'active' : ''}`} onClick={() => setActiveTab('evaluation')}>
            <Award size={16} /> Metrics Audit
          </button>
          <button className={`nav-tab ${activeTab === 'policy' ? 'active' : ''}`} onClick={() => setActiveTab('policy')}>
            <Sliders size={16} /> Policy Matrix
          </button>
        </nav>

        {/* Status Indicator */}
        <div className="header-status">
          <div className="status-badge">
            <span className="status-dot"></span>
            <span>AI Pipeline Active</span>
          </div>
        </div>
      </header>

      {/* Main View */}
      <main className="main-content">
        {activeTab === 'command' && (
          <CommandCenter
            transactions={transactions}
            onSelectTx={(tx) => setSelectedTx(tx)}
            onRunQuickSim={handleRunQuickSim}
            loading={loading}
          />
        )}

        {activeTab === 'simulator' && (
          <Simulator onRefresh={handleRefreshTransactions} />
        )}

        {activeTab === 'inspector' && (
          <AIInspector
            transactions={transactions}
            selectedTx={selectedTx}
            onSelectTx={(tx) => setSelectedTx(tx)}
          />
        )}

        {activeTab === 'evaluation' && (
          <EvaluationView
            transactions={transactions}
            onRefresh={handleRefreshTransactions}
          />
        )}

        {activeTab === 'policy' && (
          <PolicyConfig />
        )}
      </main>

      {/* Transaction Inspection Drawer Modal */}
      {selectedTx && (
        <TransactionModal
          tx={selectedTx}
          onClose={() => setSelectedTx(null)}
        />
      )}

      {/* Footer */}
      <footer className="app-footer">
        <div>
          RazorGuard AI — Autonomous Risk Manager Submission for <strong>Razorpay AI Buildathon 2026</strong>
        </div>
        <div style={{ marginTop: '4px' }}>
          5-Stage Pipeline: Detect ➔ Diagnose ➔ Decide ➔ Act ➔ Audit
        </div>
      </footer>
    </div>
  );
}
