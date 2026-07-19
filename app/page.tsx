'use client';

import { createClient } from '@/utils/supabase/client';
import { useState, useEffect } from 'react';

function DoubleChevronLogo({ className = "w-6 h-6 text-charcoal" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 10l-5-5-5 5" />
      <path d="M17 16l-5-5-5 5" />
    </svg>
  );
}

export default function LandingPage() {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = setInterval(() => {
      setActiveTab((prev) => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(timer);
  }, [isAutoPlaying]);

  const handleOAuthLogin = async (provider: 'github' | 'google') => {
    try {
      setLoadingProvider(provider);
      const supabase = createClient();
      const origin = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      alert(`Login failed: ${err.message || err}`);
      setLoadingProvider(null);
    }
  };

  return (
    <div className="w-screen min-h-screen md:h-screen overflow-hidden flex flex-col md:grid md:grid-cols-12 bg-offwhite text-charcoal font-sans relative select-none">
      {/* Subtle Background Glows */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-orchid/15 to-lavender/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-lavender/20 to-orchid/10 blur-[100px] pointer-events-none" />

      {/* Left Panel: Brand info & Auth */}
      <div className="col-span-12 md:col-span-5 flex flex-col justify-between h-full min-h-0 p-6 md:p-8 lg:p-10 z-10 bg-offwhite overflow-hidden">
        {/* Top: Logo & Branding */}
        <div className="flex items-center gap-2.5 shrink-0">
          <DoubleChevronLogo className="w-7 h-7 text-charcoal" />
          <span className="font-serif text-2xl font-semibold tracking-tight text-charcoal">
            MicroManus
          </span>
        </div>

        {/* Center: Main Copy & Switcher */}
        <div className="flex-1 flex flex-col justify-center py-6 max-w-md">
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-charcoal leading-[1.1] mb-4">
            Deep Research.<br />On Autopilot.
          </h1>
          
          <p className="text-charcoal/70 text-xs sm:text-sm leading-relaxed mb-6">
            An autonomous agent that executes Brave searches, scrapes pages, and compiles beautiful PDF reports. Simply bring your OpenRouter key.
          </p>

          {/* Stateful Button Switcher */}
          <div className="flex flex-col gap-2.5 w-full max-w-sm">
            <div className="text-[9px] font-bold tracking-widest text-charcoal/40 uppercase">
              Interactive Agent Workflow
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Research", step: "01" },
                { label: "Scrape", step: "02" },
                { label: "Synthesize", step: "03" }
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setActiveTab(idx);
                    setIsAutoPlaying(false);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-wider transition-all duration-200 border cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
                    activeTab === idx
                      ? "bg-charcoal text-offwhite border-charcoal shadow-md shadow-charcoal/15 scale-[1.01]"
                      : "bg-transparent text-charcoal/60 border-charcoal/10 hover:text-charcoal hover:border-charcoal/30"
                  }`}
                >
                  <span className="text-[8px] font-bold opacity-60">{item.step}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom: Auth Buttons */}
        <div className="flex flex-col gap-2.5 w-full max-w-sm pt-4 border-t border-charcoal/5 shrink-0">
          <button
            onClick={() => handleOAuthLogin('github')}
            disabled={!!loadingProvider}
            className="flex items-center justify-center gap-2.5 w-full bg-charcoal hover:bg-charcoal/90 hover:scale-[1.015] active:scale-[0.99] text-offwhite font-semibold py-2.5 px-4 rounded-xl border border-charcoal transition-all duration-200 shadow-md shadow-charcoal/5 cursor-pointer"
          >
            {loadingProvider === 'github' ? (
              <div className="h-4 w-4 border-2 border-offwhite border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.1.39-1.99 1.03-2.69-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.7 1.03 1.6 1.03 2.69 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z" />
              </svg>
            )}
            <span>Sign in with GitHub</span>
          </button>

          <button
            onClick={() => handleOAuthLogin('google')}
            disabled={!!loadingProvider}
            className="flex items-center justify-center gap-2.5 w-full bg-offwhite hover:bg-neutral-100 hover:scale-[1.015] active:scale-[0.99] text-charcoal font-semibold py-2.5 px-4 rounded-xl border border-charcoal/15 transition-all duration-200 shadow-sm cursor-pointer"
          >
            {loadingProvider === 'google' ? (
              <div className="h-4 w-4 border-2 border-charcoal border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="h-4.5 w-4.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69a5.79 5.79 0 0 1-2.49 3.81v3.13h3.97c2.3-2.13 3.57-5.26 3.57-8.79z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.97-3.13c-1.1.73-2.5 1.16-3.96 1.16-3.05 0-5.63-2.06-6.55-4.83H1.38v3.23A12 12 0 0 0 12 24z" />
                <path fill="#FBBC05" d="M5.45 14.29a7.12 7.12 0 0 1 0-4.58V6.48H1.38a12 12 0 0 0 0 11.04l4.07-3.23z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43A11.96 11.96 0 0 0 12 0 12 12 0 0 0 1.38 6.48l4.07 3.23c.92-2.77 3.5-4.96 6.55-4.96z" />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>
          
          <div className="text-[9.5px] text-charcoal/40 text-center mt-1 tracking-wide">
            By signing in, you agree to our usage-based credit terms.
          </div>
        </div>
      </div>

      {/* Right Panel: Interactive MacBook Demo */}
      <div className="col-span-12 md:col-span-7 h-full bg-gradient-to-br from-lavender/30 via-orchid/20 to-lavender/30 border-l border-charcoal/5 flex items-center justify-center p-6 md:p-12 relative overflow-hidden">
        {/* Abstract Background Design Element */}
        <div className="absolute w-[80%] aspect-square rounded-full border border-charcoal/[0.03] scale-110 pointer-events-none" />
        <div className="absolute w-[60%] aspect-square rounded-full border border-charcoal/[0.04] scale-90 pointer-events-none" />

        {/* MacBook Container */}
        <div className="w-full max-w-2xl flex flex-col items-center justify-center relative">
          {/* MacBook Screen */}
          <div className="w-[95%] md:w-full bg-[#1e1e1e] rounded-2xl p-2 pb-2.5 shadow-2xl border border-neutral-800/80 aspect-[16/10] flex flex-col relative overflow-hidden transition-all duration-500 hover:scale-[1.01]">
            {/* Gloss Reflection overlay */}
            <div className="absolute top-0 left-0 right-0 h-[45%] bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none transform -skew-y-6 origin-top-left z-20" />
            
            {/* Screen Header / Bezel dot */}
            <div className="flex items-center justify-center relative w-full mb-1.5 shrink-0">
              <div className="w-1.5 h-1.5 bg-black rounded-full border border-neutral-700/50" />
            </div>

            {/* Screen Inner Frame (Simulated Dashboard App) */}
            <div className="flex-1 bg-[#1a1a1a] rounded-lg overflow-hidden border border-neutral-900 flex relative text-left min-h-0 select-none">
              
              {/* Mock App Left Sidebar */}
              <div className="w-[130px] sm:w-[150px] bg-[#141414] border-r border-neutral-900 flex flex-col justify-between p-3.5 shrink-0">
                <div>
                  {/* Branding in mini form */}
                  <div className="flex items-center gap-1.5 mb-5">
                    <DoubleChevronLogo className="w-4 h-4 text-neutral-200" />
                    <span className="font-serif text-[10px] font-semibold text-neutral-200">
                      MicroManus
                    </span>
                  </div>

                  {/* New Research Button */}
                  <div className="w-full py-1.5 px-2 bg-neutral-900 border border-neutral-800 text-[8px] font-semibold text-neutral-400 rounded-md flex items-center justify-center gap-1">
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    New Research
                  </div>

                  {/* Simulated History list */}
                  <div className="mt-5 space-y-2">
                    <div className="text-[7.5px] font-bold text-neutral-600 uppercase tracking-widest">
                      Recent Queries
                    </div>
                    <div className="space-y-1">
                      <div className="px-2 py-1 bg-neutral-850 text-neutral-200 rounded text-[8px] flex items-center gap-1.5 font-medium truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-orchid shrink-0" />
                        Solid State Density
                      </div>
                      <div className="px-2 py-1 text-neutral-500 text-[8px] flex items-center gap-1.5 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-700 shrink-0" />
                        CA Forest Fires
                      </div>
                      <div className="px-2 py-1 text-neutral-500 text-[8px] flex items-center gap-1.5 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-700 shrink-0" />
                        Steel Carbon Footprint
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="space-y-1.5 border-t border-neutral-850/50 pt-2.5 text-neutral-500 text-[8px]">
                  <div className="flex items-center gap-1.5 px-1 py-0.5">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    API Key Manager
                  </div>
                  <div className="flex items-center gap-1.5 px-1 py-0.5">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Analytics & Billing
                  </div>
                </div>
              </div>

              {/* Mock App Chat/Main Interface Area */}
              <div className="flex-grow flex flex-col justify-between bg-[#191919] min-w-0">
                {/* Dashboard top header */}
                <div className="h-9 border-b border-neutral-900 flex justify-between items-center px-4 shrink-0 text-[8px] text-neutral-400">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-300">Model:</span>
                    <span className="inline-flex px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[7px] text-neutral-400">
                      claude-3.5-sonnet
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Budget:</span>
                    <span className="font-bold text-orchid bg-orchid/5 border border-orchid/15 px-2 py-0.5 rounded-full">
                      $4.8250
                    </span>
                  </div>
                </div>

                {/* Dashboard chat body feed */}
                <div className="flex-grow p-4 overflow-y-auto min-h-0 space-y-3 font-sans">
                  {/* User message is always visible in the simulated feed */}
                  <div className="flex flex-col items-end">
                    <div className="bg-[#242424] text-neutral-100 rounded-2xl rounded-tr-sm px-3.5 py-2 text-[9px] max-w-[85%] font-medium shadow-sm">
                      Compare solid-state and lithium-ion batteries.
                    </div>
                  </div>

                  {/* Animated Agent states */}
                  {activeTab === 0 && (
                    <div className="space-y-3 animate-fade-in text-[9px]">
                      {/* Thinking loop indicator */}
                      <div className="flex items-start gap-2 max-w-[90%]">
                        <div className="w-5 h-5 rounded-full bg-orchid/10 border border-orchid/20 flex items-center justify-center shrink-0">
                          <svg className="w-3 h-3 text-orchid" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </div>
                        <div className="bg-[#1e1e1e] border border-neutral-850 p-2.5 rounded-2xl rounded-tl-sm space-y-2 flex-1">
                          <div className="font-bold text-neutral-200">
                            Thinking...
                          </div>
                          <p className="text-neutral-400 italic text-[8.5px]">
                            "Formulating analytical search roadmap to query Brave Search API on volumetric densities (Wh/L), safety characteristics, and anode material constraints."
                          </p>
                        </div>
                      </div>

                      {/* Planning card */}
                      <div className="bg-[#1d1d1d] border border-neutral-850 rounded-xl p-3 max-w-[90%] ml-7 space-y-2">
                        <div className="font-bold text-neutral-300 text-[8.5px] uppercase tracking-wider">
                          Research Roadmap
                        </div>
                        <div className="space-y-1.5 text-[8px] text-neutral-400 font-mono">
                          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                            <span>✓</span> <span>01: Parse Query Objectives</span>
                          </div>
                          <div className="flex items-center gap-2 text-orchid font-semibold animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-orchid" /> <span>02: Brave Search Queries</span>
                          </div>
                          <div className="flex items-center gap-2 text-neutral-600">
                            <span>○</span> <span>03: Data Extraction & Page Scrapes</span>
                          </div>
                          <div className="flex items-center gap-2 text-neutral-600">
                            <span>○</span> <span>04: Compile Comparison Matrix & PDF</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 1 && (
                    <div className="space-y-3 animate-fade-in text-[9px]">
                      {/* Scraper / browser actions */}
                      <div className="flex items-start gap-2 max-w-[90%]">
                        <div className="w-5 h-5 rounded-full bg-orchid/10 border border-orchid/20 flex items-center justify-center shrink-0">
                          <svg className="w-3 h-3 text-orchid" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9-9c1.657 0 3 4.03 3 9s-1.343 9-3 9m0-18c-1.343 0-3 4.03-3 9s1.343 9 3 9m-9-9h18" />
                          </svg>
                        </div>
                        <div className="bg-[#1e1e1e] border border-neutral-850 p-2.5 rounded-2xl rounded-tl-sm space-y-2 flex-1">
                          <div className="font-bold text-neutral-200">
                            Executing Tool Loops
                          </div>
                          
                          {/* Active tool card */}
                          <div className="bg-[#151515] p-2 rounded-lg border border-neutral-850 font-mono text-[7.5px] space-y-1 text-neutral-450">
                            <div className="text-emerald-400 font-semibold">
                              brave_search("solid state battery density metrics Wh kg")
                            </div>
                            <div>- Fetched 8 web results. Querying links...</div>
                          </div>

                          <div className="space-y-1.5 font-mono text-[7px] text-neutral-400 pl-1 border-l-2 border-neutral-800">
                            <div className="flex items-center justify-between">
                              <span className="truncate max-w-[150px]">GET batteryjournal.org/solid-state-news</span>
                              <span className="text-emerald-400 font-bold">200 OK • 18kB</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="truncate max-w-[150px]">GET nature.com/articles/s41560-battery-review</span>
                              <span className="text-emerald-400 font-bold">200 OK • 22kB</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 2 && (
                    <div className="space-y-3 animate-fade-in text-[9px]">
                      {/* Synthesized Response */}
                      <div className="flex items-start gap-2 max-w-[95%]">
                        <div className="w-5 h-5 rounded-full bg-orchid/10 border border-orchid/20 flex items-center justify-center shrink-0">
                          <svg className="w-3 h-3 text-orchid" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="bg-[#1e1e1e] border border-neutral-850 p-3 rounded-2xl rounded-tl-sm space-y-3 flex-1">
                          <p className="text-neutral-200 leading-relaxed text-[8.5px]">
                            Based on nature and batteryjournal scrapes, solid-state batteries demonstrate a theoretical energy density of 480 Wh/kg, roughly doubling conventional lithium-ion cells which hover at 250 Wh/kg. I have compiled a detailed comparative safety matrix into a PDF report.
                          </p>

                          {/* PDF Report artifact card */}
                          <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-between gap-2 shadow-sm">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded bg-red-950/20 text-red-400 border border-red-900/10">
                                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                              </div>
                              <div className="text-left">
                                <div className="font-semibold text-neutral-300 text-[8px]">battery_comparison.pdf</div>
                                <div className="text-[7.5px] text-neutral-500 font-sans">3 pages • 242 KB • PDF</div>
                              </div>
                            </div>
                            <button className="px-2 py-1 bg-orchid hover:bg-orchid/90 text-charcoal font-bold text-[7.5px] uppercase tracking-wider rounded transition-colors duration-300">
                              Download
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Dashboard bottom composer input */}
                <div className="p-3.5 border-t border-neutral-900 bg-[#161616] flex items-center shrink-0">
                  <div className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-neutral-500 text-[8px]">
                    <span>Ask follow-up questions...</span>
                    <svg className="w-3.5 h-3.5 text-neutral-650" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                </div>

              </div>
            </div>
          </div>
          
          {/* MacBook Base */}
          <div className="w-[104%] h-2 bg-gradient-to-r from-neutral-800 via-neutral-700 to-neutral-800 rounded-b-xl relative shadow-lg shadow-black/20" />
          <div className="w-[20%] h-1 bg-neutral-900 rounded-b-md mx-auto relative -top-0.5" />
        </div>
      </div>
    </div>
  );
}
