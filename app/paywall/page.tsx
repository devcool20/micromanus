'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { CreditCard, Tag, Sparkles, LogOut, ShieldCheck } from 'lucide-react';

function DoubleChevronLogo({ className = "w-6 h-6 text-charcoal" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 10l-5-5-5 5" />
      <path d="M17 16l-5-5-5 5" />
    </svg>
  );
}

export default function PaywallPage() {
  const router = useRouter();
  const [couponCode, setCouponCode] = useState('');
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [loadingCoupon, setLoadingCoupon] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleStripeCheckout = async () => {
    try {
      setLoadingCheckout(true);
      setMessage(null);

      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      if (data.url) {
        window.location.href = data.url; // Redirect to Stripe Checkout
      } else {
        throw new Error('No checkout URL returned.');
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Stripe initialization failed.', type: 'error' });
      setLoadingCheckout(false);
    }
  };

  const handleRedeemCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    try {
      setLoadingCoupon(true);
      setMessage(null);

      const response = await fetch('/api/billing/coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim() }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setMessage({ text: `Successfully redeemed! Granted ${data.creditsGranted} credits.`, type: 'success' });
      
      // Redirect to keys configuration or chat
      setTimeout(() => {
        router.refresh();
        router.push('/chat');
      }, 1500);
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to redeem coupon.', type: 'error' });
      setLoadingCoupon(false);
    }
  };

  return (
    <div className="flex bg-[#181818] text-[#F9F9F9] flex-col justify-between font-sans relative select-none min-h-screen">
      {/* Visual Gradients */}
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-orchid/10 to-lavender/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[450px] h-[450px] rounded-full bg-gradient-to-tr from-lavender/15 to-orchid/5 blur-[100px] pointer-events-none" />
      
      <header className="border-b border-neutral-900 bg-[#131313]/90 backdrop-blur-md sticky top-0 z-50 py-4 px-6 md:px-12 flex justify-between items-center select-none">
        <div className="flex items-center gap-2">
          <DoubleChevronLogo className="h-6 w-6 text-neutral-200" />
          <span className="font-serif text-lg font-semibold tracking-tight text-neutral-100">MicroManus</span>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-xs font-semibold text-neutral-450 hover:text-white transition py-2 px-3 hover:bg-neutral-900 rounded-lg cursor-pointer"
        >
          <LogOut className="h-4 w-4 text-neutral-500" />
          Sign Out
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 flex-1 flex flex-col items-center justify-center text-center z-10">
        <div className="h-12 w-12 rounded-2xl bg-orchid/5 border border-orchid/20 flex items-center justify-center text-orchid mb-6 shadow-md shadow-orchid/5 animate-pulse">
          <Sparkles className="h-6 w-6" />
        </div>

        <h1 className="font-serif text-3xl sm:text-5xl font-semibold mb-4 text-neutral-100">
          Activate Your Account
        </h1>
        <p className="text-neutral-450 max-w-lg mb-10 text-xs md:text-sm leading-relaxed">
          MicroManus deep research agents run autonomous search loops that utilize LLM tokens. To start searching, unlock 5.0 credits ($5.00 value) below.
        </p>

        {/* Message Indicator */}
        {message && (
          <div
            className={`w-full max-w-md p-4 rounded-xl text-xs mb-6 border text-left flex gap-3 items-center animate-fade-in ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            <div className={`h-2 w-2 rounded-full ${message.type === 'success' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            <p className="font-medium">{message.text}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl text-left">
          {/* Card Checkout Column */}
          <div className="bg-[#131313] border border-white/5 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex justify-between items-start mb-4 select-none">
                <span className="text-[10px] uppercase tracking-wider font-bold text-orchid">Card Payment</span>
                <span className="bg-orchid/5 px-2 py-0.5 rounded text-[9px] text-orchid font-bold border border-orchid/20">Test Mode</span>
              </div>
              <h3 className="font-serif text-xl font-semibold mb-2 text-neutral-200">Add 5.0 Credits</h3>
              <p className="text-neutral-450 text-xs mb-6 leading-relaxed">
                Add credits using a test card. Unlocks 5.0 credits immediately to run deep research queries.
              </p>
              
              <div className="bg-[#111] border border-white/5 p-4 rounded-xl mb-6 text-xs text-neutral-500 space-y-2 font-sans select-none">
                <div className="flex items-center gap-1.5 text-neutral-300 font-semibold mb-1">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Stripe Test Details
                </div>
                <div>Card: <code className="bg-neutral-950 px-1 py-0.5 rounded text-orchid font-mono">4242 4242 4242 4242</code></div>
                <div>Expiry: <code className="bg-neutral-950 px-1 py-0.5 rounded font-mono">Any future date</code></div>
                <div>CVC: <code className="bg-neutral-950 px-1 py-0.5 rounded font-mono">Any 3 digits</code></div>
              </div>
            </div>

            <button
              onClick={handleStripeCheckout}
              disabled={loadingCheckout || loadingCoupon}
              className="flex items-center justify-center gap-2 w-full bg-orchid hover:bg-orchid/90 disabled:opacity-50 text-charcoal font-bold py-3 px-4 rounded-xl transition shadow-lg shadow-orchid/5 cursor-pointer active:scale-[0.99] text-xs font-semibold"
            >
              {loadingCheckout ? (
                <div className="h-4 w-4 border-2 border-charcoal border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  Pay $5.00 with Card
                </>
              )}
            </button>
          </div>

          {/* Coupon Redemption Column */}
          <div className="bg-[#131313] border border-white/5 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex justify-between items-start mb-4 select-none">
                <span className="text-[10px] uppercase tracking-wider font-bold text-lavender">Redeem Coupon</span>
                <span className="bg-lavender/5 text-lavender px-2 py-0.5 rounded text-[9px] font-bold border border-lavender/20">Free Unlock</span>
              </div>
              <h3 className="font-serif text-xl font-semibold mb-2 text-neutral-200">Redeem Promo Code</h3>
              <p className="text-neutral-450 text-xs mb-6 leading-relaxed">
                Have an assignments coupon code? Enter it below to unlock your complimentary 5.0 credits instantly.
              </p>
              
              <div className="bg-[#111] border border-white/5 p-4 rounded-xl mb-6 text-xs text-neutral-500 font-sans select-none">
                <div className="text-neutral-300 font-semibold mb-1">Coupon Required for Verification</div>
                Use code <code className="bg-neutral-950 px-1.5 py-0.5 rounded text-lavender font-mono font-bold">SID_DRDROID</code> to unlock 5 credits without billing.
              </div>
            </div>

            <form onSubmit={handleRedeemCoupon} className="space-y-3">
              <input
                type="text"
                placeholder="Enter coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                disabled={loadingCheckout || loadingCoupon}
                className="w-full bg-[#111] border border-white/5 focus:border-orchid rounded-xl px-4 py-3 text-xs focus:outline-none transition font-mono uppercase tracking-wider text-neutral-200 focus:ring-1 focus:ring-orchid/20"
              />
              <button
                type="submit"
                disabled={loadingCheckout || loadingCoupon || !couponCode.trim()}
                className="flex items-center justify-center gap-2 w-full bg-[#1a1a1a] hover:bg-neutral-900 text-offwhite font-bold py-3 px-4 rounded-xl transition border border-white/5 hover:border-white/10 disabled:opacity-50 cursor-pointer active:scale-[0.99] text-xs font-semibold"
              >
                {loadingCoupon ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Tag className="h-4 w-4" />
                    Redeem Code
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      <footer className="border-t border-neutral-900 py-6 text-center text-[10px] text-neutral-600 bg-[#131313] z-10 select-none">
        Secured by Stripe. Powered by Supabase.
      </footer>
    </div>
  );
}
