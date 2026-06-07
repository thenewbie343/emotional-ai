import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { motion } from 'framer-motion';

export default function Billing({ session }) {
  const navigate = useNavigate();
  const [step, setStep] = useState('plans'); // 'plans', 'checkout', 'success'
  const [orderId, setOrderId] = useState('');
  const [utr, setUtr] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  // Replace with actual UPI ID via env or hardcode if preferred
  const upiId = import.meta.env.VITE_UPI_ID || 'merchant@paytm'; 
  const payeeName = import.meta.env.VITE_PAYEE_NAME || 'Emotional AI Premium';
  const amount = '60';

  useEffect(() => {
    // Generate a unique order ID when component mounts
    setOrderId(`ORD-${Math.floor(100000 + Math.random() * 900000)}`);
  }, []);

  const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&tr=${orderId}&am=${amount}&cu=INR`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}`;

  const handleCheckout = () => {
    setStep('checkout');
  };

  const handleSubmitUtr = async (e) => {
    e.preventDefault();
    if (utr.length < 10) {
      setError('Please enter a valid UTR/Transaction ID (at least 10 characters).');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);

    try {
      const { error: dbError } = await supabase
        .from('subscription_requests')
        .insert([{
          user_id: session?.user?.id,
          order_id: orderId,
          utr_number: utr,
          amount_paid: amount,
          tier_requested: 'premium',
          status: 'pending'
        }]);

      if (dbError) throw dbError;
      
      setStep('success');
    } catch (err) {
      console.error('Submission error:', err);
      setError('Failed to submit request. Please try again or contact support.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050510] text-white flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-fuchsia-900/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-900/20 blur-[120px] rounded-full pointer-events-none" />

      <button onClick={() => navigate(-1)} className="absolute top-6 left-6 text-gray-400 hover:text-white flex items-center gap-2 transition-colors z-10">
        <span className="material-symbols-outlined">arrow_back</span> Back
      </button>

      <div className="z-10 w-full max-w-4xl flex flex-col items-center">
        
        {step === 'plans' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} 
            className="flex flex-col items-center w-full"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">
              Upgrade to Premium
            </h1>
            <p className="text-gray-400 text-center mb-12 max-w-lg">
              Unlock the full potential of your AI companion. Free tier is limited to 10 messages per day.
            </p>

            <div className="grid md:grid-cols-2 gap-8 w-full max-w-3xl">
              {/* Free Tier */}
              <div className="border border-white/10 bg-black/40 backdrop-blur-xl rounded-3xl p-8 flex flex-col items-center">
                <h2 className="text-2xl font-semibold mb-2">Basic Observer</h2>
                <div className="text-3xl font-bold text-gray-300 mb-6">₹0 <span className="text-sm font-normal text-gray-500">/ forever</span></div>
                <ul className="space-y-4 mb-8 w-full text-gray-400 text-sm">
                  <li className="flex items-center gap-3"><span className="material-symbols-outlined text-gray-500 text-lg">check_circle</span> 10 Messages per day</li>
                  <li className="flex items-center gap-3"><span className="material-symbols-outlined text-gray-500 text-lg">check_circle</span> Basic Conversations</li>
                  <li className="flex items-center gap-3 opacity-30"><span className="material-symbols-outlined text-lg">cancel</span> No Deep Memories</li>
                  <li className="flex items-center gap-3 opacity-30"><span className="material-symbols-outlined text-lg">cancel</span> No 3D Shattered Sphere</li>
                </ul>
                <button disabled className="mt-auto w-full py-3 rounded-full bg-white/5 text-gray-500 border border-white/10 cursor-not-allowed">
                  Current Plan
                </button>
              </div>

              {/* Premium Tier */}
              <div className="border border-fuchsia-500/30 bg-fuchsia-900/10 backdrop-blur-xl rounded-3xl p-8 flex flex-col items-center relative shadow-[0_0_40px_rgba(217,70,239,0.1)] transform md:-translate-y-4">
                <div className="absolute -top-4 bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider">Most Popular</div>
                <h2 className="text-2xl font-semibold mb-2 text-white">Soul Link</h2>
                <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400 mb-6">
                  ₹60 <span className="text-sm font-normal text-gray-400">/ 2 weeks</span>
                </div>
                <ul className="space-y-4 mb-8 w-full text-gray-300 text-sm">
                  <li className="flex items-center gap-3"><span className="material-symbols-outlined text-fuchsia-400 text-lg">check_circle</span> Unlimited Messages</li>
                  <li className="flex items-center gap-3"><span className="material-symbols-outlined text-fuchsia-400 text-lg">check_circle</span> Deep Memory Access</li>
                  <li className="flex items-center gap-3"><span className="material-symbols-outlined text-fuchsia-400 text-lg">check_circle</span> Unlocked 3D Features</li>
                  <li className="flex items-center gap-3"><span className="material-symbols-outlined text-fuchsia-400 text-lg">check_circle</span> Priority Processing</li>
                </ul>
                <button onClick={handleCheckout} className="mt-auto w-full py-3 rounded-full bg-gradient-to-r from-fuchsia-600 to-cyan-600 hover:from-fuchsia-500 hover:to-cyan-500 text-white font-semibold transition-all shadow-lg hover:shadow-fuchsia-500/25">
                  Upgrade Now
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'checkout' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} 
            className="w-full max-w-md bg-black/60 border border-white/10 backdrop-blur-xl rounded-3xl p-8 flex flex-col items-center shadow-2xl"
          >
            <h2 className="text-2xl font-bold mb-2">Complete Payment</h2>
            <p className="text-gray-400 text-sm text-center mb-6">Scan the QR code below using any UPI app (Paytm, GPay, PhonePe) to pay ₹60.</p>
            
            <div className="bg-white p-4 rounded-2xl mb-6 shadow-inner">
              <img src={qrCodeUrl} alt="UPI QR Code" className="w-48 h-48" />
            </div>
            
            <div className="w-full bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Amount:</span>
                <span className="font-bold text-white">₹60</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Order ID:</span>
                <span className="font-mono text-fuchsia-400 tracking-wider">{orderId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Valid for:</span>
                <span className="text-gray-200">14 Days (2 weeks)</span>
              </div>
            </div>

            <form onSubmit={handleSubmitUtr} className="w-full flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 pl-2">Enter 12-Digit UTR/Transaction ID</label>
                <input 
                  type="text" 
                  value={utr}
                  onChange={(e) => setUtr(e.target.value)}
                  placeholder="e.g. 312345678901" 
                  className="w-full bg-black/50 border border-white/10 rounded-full px-6 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-fuchsia-500 transition-colors"
                  required
                />
              </div>
              
              {error && <div className="text-red-400 text-sm text-center bg-red-400/10 py-2 rounded-lg">{error}</div>}
              
              <button 
                type="submit" 
                disabled={isSubmitting || utr.length < 5}
                className="w-full py-3 rounded-full bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white font-semibold disabled:opacity-50 mt-2"
              >
                {isSubmitting ? 'Verifying...' : 'Submit Payment Proof'}
              </button>
            </form>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} 
            className="w-full max-w-md bg-black/60 border border-white/10 backdrop-blur-xl rounded-3xl p-10 flex flex-col items-center shadow-2xl text-center"
          >
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-4xl text-green-400">check_circle</span>
            </div>
            <h2 className="text-2xl font-bold mb-4 text-white">Payment Submitted</h2>
            <p className="text-gray-400 mb-8">
              Your UTR <strong>{utr}</strong> for Order <strong>{orderId}</strong> has been received. 
              Admin verification usually takes 1-2 hours. Once approved, your Premium features will be unlocked immediately!
            </p>
            <button 
              onClick={() => navigate('/')}
              className="px-8 py-3 rounded-full border border-white/20 hover:bg-white/10 transition-colors text-sm font-semibold tracking-wider"
            >
              Return to Hub
            </button>
          </motion.div>
        )}

      </div>
    </div>
  );
}
