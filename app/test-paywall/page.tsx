'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { CreditCard, Tag, LogOut, ShieldCheck } from 'lucide-react';

function DoubleChevronLogo({ className = "w-6 h-6 text-charcoal" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 10l-5-5-5 5" />
      <path d="M17 16l-5-5-5 5" />
    </svg>
  );
}

export default function TestPaywallPage() {
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
        window.location.href = data.url;
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
    <div className="flex bg-offwhite text-charcoal flex-col justify-between font-sans relative select-none h-screen overflow-hidden">
      {/* Visual Gradients */}
      <div className="absolute top-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-gradient-to-br from-orchid/10 to-lavender/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[350px] h-[350px] rounded-full bg-gradient-to-tr from-lavender/15 to-orchid/5 blur-[90px] pointer-events-none" />
      
      <header className="border-b border-charcoal/5 bg-white/70 backdrop-blur-md py-3 px-6 md:px-12 flex justify-between items-center select-none shadow-sm shadow-charcoal/[0.01] shrink-0">
        <div className="flex items-center gap-2">
          <DoubleChevronLogo className="h-5.5 w-5.5 text-charcoal" />
          <span className="font-serif text-base font-semibold tracking-tight text-charcoal">MicroManus (Test View)</span>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 text-xs font-semibold text-charcoal/60 hover:text-charcoal transition py-1.5 px-2.5 hover:bg-charcoal/5 rounded-lg cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5 text-charcoal/50" />
          Sign Out
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6 flex-grow flex flex-col items-center justify-center text-center z-10 min-h-0 overflow-y-auto">
        <h1 className="font-serif text-2xl sm:text-3.5xl font-semibold mb-2 text-charcoal tracking-tight">
          Activate Your Account
        </h1>
        <p className="text-charcoal/60 max-w-md mb-8 text-[11.5px] leading-relaxed">
          MicroManus deep research agents run autonomous search loops that utilize LLM tokens. To start searching, unlock 5.0 credits ($5.00 value) below.
        </p>

        {/* Message Indicator */}
        {message && (
          <div
            className={`w-full max-w-md p-3 rounded-lg text-xs mb-4 border text-left flex gap-2.5 items-center animate-fade-in ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-650'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-600'
            }`}
          >
            <div className={`h-1.5 w-1.5 rounded-full ${message.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <p className="font-medium text-[11px]">{message.text}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl text-left">
          {/* Card Checkout Column */}
          <div className="bg-white border border-charcoal/5 rounded-xl p-5 flex flex-col justify-between shadow-md shadow-charcoal/[0.01]">
            <div>
              <div className="flex justify-between items-start mb-3 select-none">
                <span className="text-[9px] uppercase tracking-wider font-bold text-orchid">Card Payment</span>
                <span className="bg-orchid/5 px-2 py-0.5 rounded text-[8px] text-orchid font-bold border border-orchid/20">Test Mode</span>
              </div>
              <h3 className="font-serif text-base font-semibold mb-1 text-charcoal">Add 5.0 Credits</h3>
              <p className="text-charcoal/50 text-[10.5px] mb-4 leading-normal">
                Add credits using a test card. Unlocks 5.0 credits immediately to run deep research queries.
              </p>
              
              <div className="bg-offwhite border border-charcoal/5 p-3 rounded-lg mb-4 text-[10px] text-charcoal/65 space-y-1.5 font-sans select-none">
                <div className="flex items-center gap-1.5 text-charcoal font-semibold mb-0.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  Stripe Test Details
                </div>
                <div>Card: <code className="bg-white border border-charcoal/5 px-1 py-0.5 rounded text-orchid font-mono text-[9px]">4242 4242 4242 4242</code></div>
                <div>Expiry: <code className="bg-white border border-charcoal/5 px-1 py-0.5 rounded font-mono text-[9px]">Any future date</code></div>
                <div>CVC: <code className="bg-white border border-charcoal/5 px-1 py-0.5 rounded font-mono text-[9px]">Any 3 digits</code></div>
              </div>
            </div>

            <button
              onClick={handleStripeCheckout}
              disabled={loadingCheckout || loadingCoupon}
              className="flex items-center justify-center gap-1.5 w-full bg-charcoal hover:bg-charcoal/90 disabled:opacity-50 text-offwhite font-bold py-2 px-3 rounded-lg transition shadow-md shadow-charcoal/5 cursor-pointer active:scale-[0.99] text-[11px] font-semibold"
            >
              {loadingCheckout ? (
                <div className="h-3.5 w-3.5 border-2 border-offwhite border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CreditCard className="h-3.5 w-3.5" />
                  Pay $5.00 with Card
                </>
              )}
            </button>
          </div>

          {/* Coupon Redemption Column */}
          <div className="bg-white border border-charcoal/5 rounded-xl p-5 flex flex-col justify-between shadow-md shadow-charcoal/[0.01]">
            <div>
              <div className="flex justify-between items-start mb-3 select-none">
                <span className="text-[9px] uppercase tracking-wider font-bold text-orchid">Redeem Coupon</span>
                <span className="bg-[#f0e2f5] text-purple-750 px-2 py-0.5 rounded text-[8px] font-bold border border-purple-300">Free Unlock</span>
              </div>
              <h3 className="font-serif text-base font-semibold mb-1 text-charcoal">Redeem Promo Code</h3>
              <p className="text-charcoal/50 text-[10.5px] mb-4 leading-normal">
                Have an assignments coupon code? Enter it below to unlock your complimentary 5.0 credits instantly.
              </p>
              
              <div className="bg-offwhite border border-charcoal/5 p-3 rounded-lg mb-4 text-[10px] text-charcoal/65 font-sans select-none">
                <div className="text-charcoal font-semibold mb-0.5">Coupon Required for Verification</div>
                Use code <code className="bg-white border border-charcoal/5 px-1.5 py-0.5 rounded text-orchid font-mono font-bold text-[9px]">SID_DRDROID</code> to unlock 5 credits without billing.
              </div>
            </div>

            <form onSubmit={handleRedeemCoupon} className="space-y-2">
              <input
                type="text"
                placeholder="Enter coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                disabled={loadingCheckout || loadingCoupon}
                className="w-full bg-[#f3f3f3] border border-charcoal/10 focus:border-orchid focus:ring-1 focus:ring-orchid/20 rounded-lg px-3 py-2 text-xs focus:outline-none transition font-mono uppercase tracking-wider text-charcoal"
              />
              <button
                type="submit"
                disabled={loadingCheckout || loadingCoupon || !couponCode.trim()}
                className="flex items-center justify-center gap-1.5 w-full bg-orchid hover:bg-orchid/90 text-charcoal font-bold py-2 px-3 rounded-lg transition shadow-sm shadow-orchid/5 disabled:opacity-50 cursor-pointer active:scale-[0.99] text-[11px] font-semibold border-0"
              >
                {loadingCoupon ? (
                  <div className="h-3.5 w-3.5 border-2 border-charcoal border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Tag className="h-3.5 w-3.5" />
                    Redeem Code
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      <footer className="border-t border-charcoal/5 py-4 text-center text-[9px] text-charcoal/40 bg-white z-10 select-none shrink-0">
        Secured by Stripe. Powered by Supabase.
      </footer>
    </div>
  );
}
