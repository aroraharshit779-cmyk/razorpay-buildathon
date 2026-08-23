const { GoogleGenerativeAI } = require('@google/generative-ai');
const { RISK_VECTOR, RISK_LABELS } = require('../config/constants');

/**
 * Stage B: Gemini LLM Agent for ambiguous / high-context risk diagnosis.
 * Analyzes complex multi-vector signals, returns structured JSON risk evaluation.
 */
async function evaluateWithGemini(transaction, stageAResults) {
  const apiKey = process.env.GEMINI_API_KEY;

  // Fallback heuristic evaluation if no Gemini API Key configured or if quota fails
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_gemini_api_key')) {
    return generateFallbackDiagnosis(transaction, stageAResults, 'GEMINI_KEY_MISSING');
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });
    
    const prompt = `
You are RazorGuard AI, an expert Fintech Risk & Fraud Analyst for Razorpay.
Analyze the following payment transaction and Stage A rule flags to determine the true risk profile, vector, confidence score, and clear audit explanation.

Transaction Details:
${JSON.stringify(transaction, null, 2)}

Stage A Rule Findings:
${JSON.stringify(stageAResults, null, 2)}

Valid Risk Vectors:
- CARDING_ATTACK (High velocity, small automated test payments, card testing)
- HIGH_AMOUNT_GEO_MISMATCH (Location mismatch, offshore BIN, abnormal payment size)
- RTO_COD_ABUSE (High risk return-to-origin, fake address pattern, COD fraud)
- ACCOUNT_TAKEOVER (Device shift, user session anomaly, credential stuffing)
- MERCHANT_VELOCITY_SPIKE (Sudden spike in merchant processing without history)
- CHARGEBACK_DISPUTE_ABUSE (Dispute abuse, friendly fraud attempt)
- SUSPICIOUS_BIN_ATTACK (Virtual card / prepaid card batch attack)
- LEGITIMATE_TRANSACTION (Safe, low risk user transaction)

Respond ONLY with a valid JSON object strictly matching this format:
{
  "risk_vector": "VECTOR_NAME",
  "risk_score": 0-100 integer score,
  "confidence_score": 0.0-1.0 float score,
  "summary": "Concise 1-sentence executive summary for risk analyst dashboard",
  "key_risk_indicators": ["Indicator 1", "Indicator 2"],
  "mitigation_recommendation": "Recommended step-up action or block guidance"
}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text);
    
    return {
      used_llm: true,
      model: 'gemini-1.5-flash',
      risk_vector: parsed.risk_vector || stageAResults.candidateVector,
      risk_score: Math.min(100, Math.max(0, parseInt(parsed.risk_score || stageAResults.rawScore))),
      confidence_score: parseFloat(parsed.confidence_score || 0.88),
      summary: parsed.summary || `Gemini diagnosed transaction as ${parsed.risk_vector}.`,
      key_risk_indicators: parsed.key_risk_indicators || [],
      mitigation_recommendation: parsed.mitigation_recommendation || 'Proceed per policy guidelines.'
    };
  } catch (error) {
    console.warn('Gemini API call warning/fallback:', error.message);
    return generateFallbackDiagnosis(transaction, stageAResults, error.message);
  }
}

/**
 * Intelligent Fallback Agent when LLM is offline / unconfigured
 */
function generateFallbackDiagnosis(transaction, stageAResults, reason = '') {
  const { rawScore, triggeredRules, candidateVector } = stageAResults;

  let confidence = 0.85;
  let summary = '';
  let indicators = triggeredRules.map(r => r.description);

  if (candidateVector === RISK_VECTOR.CARDING_ATTACK) {
    summary = 'Rapid velocity carding attack detected across short time window.';
    confidence = 0.92;
  } else if (candidateVector === RISK_VECTOR.HIGH_AMOUNT_GEO_MISMATCH) {
    summary = 'Unusual high-value order with geographic and card BIN anomaly.';
    confidence = 0.88;
  } else if (candidateVector === RISK_VECTOR.RTO_COD_ABUSE) {
    summary = 'Elevated return-to-origin (RTO) risk flag based on buyer address history.';
    confidence = 0.87;
  } else if (candidateVector === RISK_VECTOR.ACCOUNT_TAKEOVER) {
    summary = 'Device fingerprint and browser user-agent shift indicating potential takeover.';
    confidence = 0.85;
  } else if (candidateVector === RISK_VECTOR.LEGITIMATE_TRANSACTION) {
    summary = 'Transaction patterns align with low-risk consumer checkout profile.';
    confidence = 0.95;
    indicators = ['Normal velocity', 'Recognized device', 'Standard order value'];
  } else {
    summary = 'Multi-factor risk indicators flagged during pre-screen diagnostic.';
    confidence = 0.80;
  }

  return {
    used_llm: false,
    model: 'heuristic-diagnostic-fallback',
    fallback_reason: reason,
    risk_vector: candidateVector,
    risk_score: rawScore,
    confidence_score: confidence,
    summary: summary,
    key_risk_indicators: indicators,
    mitigation_recommendation: rawScore > 75 ? 'Initiate immediate transaction block and notify merchant.' : 'Require dynamic step-up 3DS authentication.'
  };
}

module.exports = {
  evaluateWithGemini
};
