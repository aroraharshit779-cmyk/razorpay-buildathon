import axios from 'axios';

const API_BASE = '/api';

export async function fetchHealth() {
  const res = await axios.get(`${API_BASE}/health`);
  return res.data;
}

export async function evaluateSingleTx(txData) {
  const res = await axios.post(`${API_BASE}/risk/evaluate`, txData);
  return res.data;
}

export async function runBatchBenchmark(count = 75) {
  const res = await axios.post(`${API_BASE}/risk/batch`, { count });
  return res.data;
}

export async function fetchTransactions(limit = 100) {
  const res = await axios.get(`${API_BASE}/risk/transactions?limit=${limit}`);
  return res.data;
}

export async function fetchTransactionDetail(id) {
  const res = await axios.get(`${API_BASE}/risk/transactions/${id}`);
  return res.data;
}

export async function fetchPolicy() {
  const res = await axios.get(`${API_BASE}/risk/policy`);
  return res.data;
}

export async function updatePolicy(policyData) {
  const res = await axios.post(`${API_BASE}/risk/policy`, policyData);
  return res.data;
}

export async function clearData() {
  const res = await axios.post(`${API_BASE}/risk/clear`);
  return res.data;
}
