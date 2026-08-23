const Razorpay = require('razorpay');

let razorpayInstance = null;

function getRazorpayClient() {
  if (razorpayInstance) return razorpayInstance;

  const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_test_demo';
  const key_secret = process.env.RAZORPAY_KEY_SECRET || 'demo_secret';

  try {
    razorpayInstance = new Razorpay({
      key_id,
      key_secret
    });
  } catch (err) {
    console.warn('Razorpay SDK initialization notice:', err.message);
  }

  return razorpayInstance;
}

async function createRazorpayOrder(amountInRupees, receiptId = `rcpt_${Date.now()}`) {
  const instance = getRazorpayClient();
  if (!instance) {
    return {
      id: `order_mock_${Date.now()}`,
      entity: 'order',
      amount: amountInRupees * 100,
      currency: 'INR',
      receipt: receiptId,
      status: 'created'
    };
  }

  try {
    const order = await instance.orders.create({
      amount: Math.round(amountInRupees * 100), // amount in paise
      currency: 'INR',
      receipt: receiptId,
      notes: {
        system: 'RazorGuard AI Risk Screen'
      }
    });
    return order;
  } catch (err) {
    console.warn('Razorpay live order create fallback:', err.message);
    return {
      id: `order_sim_${Date.now()}`,
      amount: amountInRupees * 100,
      currency: 'INR',
      receipt: receiptId,
      status: 'created'
    };
  }
}

module.exports = {
  getRazorpayClient,
  createRazorpayOrder
};
