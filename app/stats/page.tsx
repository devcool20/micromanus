'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import {
  ArrowLeft,
  Coins,
  Cpu,
  Receipt,
  FileText,
  Download,
  Loader2,
  Calendar,
  Layers,
  TrendingUp,
  BrainCircuit,
  Key,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  LogOut,
  Brain,
  Menu
} from 'lucide-react';

interface StatsChat {
  id: string;
  title: string;
  model: string;
  tokens_input: number;
  tokens_cached: number;
  tokens_output: number;
  cost_usd: number;
  artifact_url?: string;
  created_at: string;
}

interface StatsData {
  credits: number;
  status: string;
  summary: {
    totalCost: number;
    totalTokensInput: number;
    totalTokensCached: number;
    totalTokensOutput: number;
    totalTokens: number;
  };
  chats: StatsChat[];
}

interface ChatThread {
  id: string;
  title: string;
  model: string;
  cost_usd: number;
  artifact_url?: string;
  created_at: string;
  updated_at: string;
}

function DoubleChevronLogo({ className = "w-6 h-6 text-charcoal" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 10l-5-5-5 5" />
      <path d="M17 16l-5-5-5 5" />
    </svg>
  );
}

export default function StatsPage() {
  const router = useRouter();

  // Sidebar states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  useEffect(() => {
    const checkMobile = () => {
      if (window.innerWidth < 768) {
        setIsSidebarCollapsed(true);
      } else {
        setIsSidebarCollapsed(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);

  // Stats data states
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<StatsChat | null>(null);

  // Fetch threads for the sidebar history
  const loadThreads = async () => {
    try {
      const res = await fetch('/api/chats');
      const data = await res.json();
      if (!data.error) {
        setThreads(data.chats || []);
      }
    } catch (err) {
      console.error('Error loading threads:', err);
    } finally {
      setLoadingThreads(false);
    }
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/stats');
      const resData = await response.json();
      if (!resData.error) {
        setData(resData);
        if (resData.chats && resData.chats.length > 0) {
          setSelectedChat(resData.chats[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await Promise.all([loadThreads(), fetchStats()]);
    };
    init();
  }, []);

  const handleDeleteThread = async (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this conversation?')) return;

    try {
      const res = await fetch(`/api/chats/${threadId}`, { method: 'DELETE' });
      if (res.ok) {
        await loadThreads();
      }
    } catch (err) {
      console.error('Error deleting chat:', err);
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  // Compute percentages for bar chart rendering
  const getBarChartPercentages = (chat: StatsChat) => {
    const total = chat.tokens_input + chat.tokens_output;
    if (total === 0) return { inputPct: 0, cachedPct: 0, outputPct: 0 };
    
    // Cached is subset of input
    const inputActive = Math.max(0, chat.tokens_input - chat.tokens_cached);
    
    return {
      inputPct: (inputActive / total) * 100,
      cachedPct: (chat.tokens_cached / total) * 100,
      outputPct: (chat.tokens_output / total) * 100,
    };
  };

  return (
    <div className="flex bg-[#181818] text-[#F9F9F9] font-sans h-screen overflow-hidden w-screen">
      
      {/* Mobile Sidebar backdrop */}
      {!isSidebarCollapsed && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={() => setIsSidebarCollapsed(true)}
        />
      )}

      {/* 1. Sidebar (Threads List) */}
      <aside className={`bg-[#131313] border-r border-neutral-900 flex flex-col justify-between shrink-0 transition-all duration-300 fixed inset-y-0 left-0 z-50 md:relative ${
        isSidebarCollapsed ? '-translate-x-full md:translate-x-0 md:w-16' : 'translate-x-0 w-64'
      }`}>
        <div className="flex flex-col flex-1 overflow-y-auto min-h-0 scrollbar-none">
          {/* Sidebar Header */}
          <div className={`p-4 flex items-center justify-between border-b border-neutral-900/50 bg-[#131313] ${isSidebarCollapsed ? 'flex-col gap-3 py-4' : ''}`}>
            <div className="flex items-center gap-2">
              <DoubleChevronLogo className="h-5.5 w-5.5 text-neutral-200" />
              {!isSidebarCollapsed && (
                <span className="font-serif text-sm font-semibold tracking-tight text-neutral-100">MicroManus</span>
              )}
            </div>
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="text-neutral-500 hover:text-neutral-300 transition p-1 hover:bg-neutral-900 rounded cursor-pointer"
            >
              {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          {/* New Research Button Box */}
          <div className="p-4 shrink-0">
            <Link
              href="/chat"
              className={`bg-[#1e1e1e] hover:bg-[#252525] border border-white/5 text-neutral-455 hover:text-neutral-300 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
                isSidebarCollapsed ? 'w-8 h-8 mx-auto p-0' : 'w-full py-2 px-3 gap-1.5 text-[10px] font-semibold'
              }`}
              title={isSidebarCollapsed ? "New Research" : undefined}
            >
              <Plus className="h-3.5 w-3.5" />
              {!isSidebarCollapsed && <span>New Research</span>}
            </Link>
          </div>

          {/* Threads List */}
          <div className="p-2 space-y-2 flex-grow overflow-y-auto min-h-0">
            {!isSidebarCollapsed && (
              <>
                <div className="px-3 py-1.5 text-[8.5px] uppercase font-bold text-neutral-600 tracking-widest select-none">
                  Recent Queries
                </div>

                {loadingThreads ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-4 w-4 animate-spin text-neutral-500" />
                  </div>
                ) : threads.length === 0 ? (
                  <div className="text-center py-10 px-4 text-[10px] text-neutral-555 font-sans">
                    No recent queries.
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {threads.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => router.push(`/chat?id=${t.id}`)}
                        className="group px-3 py-2 rounded-lg flex items-center justify-between cursor-pointer transition text-[11px] font-sans truncate text-neutral-500 hover:bg-neutral-900/30 hover:text-neutral-300"
                      >
                        <div className="flex items-center gap-2 truncate flex-grow">
                          <span className="w-1.5 h-1.5 rounded-full bg-neutral-700 shrink-0" />
                          <span className="truncate">{t.title}</span>
                        </div>
                        <button
                          onClick={(e) => handleDeleteThread(e, t.id)}
                          className="opacity-0 group-hover:opacity-100 text-neutral-650 hover:text-rose-400 p-0.5 rounded transition shrink-0 cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer Links */}
        <div className="p-4 border-t border-neutral-900 bg-neutral-955/20 space-y-1.5 text-[10px] text-neutral-455 font-sans shrink-0">
          <Link
            href="/keys"
            className={`flex items-center hover:bg-neutral-900 hover:text-neutral-200 rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
              isSidebarCollapsed ? 'w-8 h-8 justify-center p-0 mx-auto' : 'gap-2.5 px-2 py-2'
            }`}
            title={isSidebarCollapsed ? "API Key Manager" : undefined}
          >
            <Key className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
            {!isSidebarCollapsed && <span>API Key Manager</span>}
          </Link>
          
          <Link
            href="/stats"
            className={`flex items-center hover:bg-neutral-905 text-orchid hover:text-orchid rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer bg-neutral-900/50 ${
              isSidebarCollapsed ? 'w-8 h-8 justify-center p-0 mx-auto' : 'gap-2.5 px-2 py-2 font-semibold'
            }`}
            title={isSidebarCollapsed ? "Analytics & Billing" : undefined}
          >
            <BarChart3 className="w-3.5 h-3.5 text-orchid shrink-0" />
            {!isSidebarCollapsed && <span>Analytics & Billing</span>}
          </Link>

          {!isSidebarCollapsed && (
            <div className="pt-2 border-t border-neutral-900/60 mt-1 flex justify-between items-center text-[9px] text-neutral-600 select-none">
              <span>Secure Shell</span>
              <button
                onClick={handleSignOut}
                className="text-neutral-600 hover:text-neutral-400 p-0.5 rounded cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* 2. Main content Area */}
      <section className="flex-grow flex flex-col justify-between overflow-hidden relative bg-[#181818]">
        {/* Navigation Header */}
        {/* Navigation Header */}
        <header className="border-b border-neutral-900 bg-[#161616]/70 backdrop-blur-md py-4 px-4 md:px-10 flex justify-between items-center z-50 shrink-0 select-none">
          <div className="flex items-center gap-3 sm:gap-6 min-w-0">
            {/* Mobile Hamburger menu toggle */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="md:hidden text-neutral-400 hover:text-white transition p-1 hover:bg-neutral-900 rounded cursor-pointer mr-1 shrink-0"
            >
              <Menu className="h-4.5 w-4.5" />
            </button>
            <Link href="/chat" className="flex items-center gap-1.5 text-neutral-400 hover:text-white transition-colors duration-200 shrink-0">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-xs font-semibold hidden sm:inline">Back</span>
            </Link>
            <div className="h-px w-3 sm:w-6 bg-neutral-800 shrink-0" />
            <div className="flex items-center gap-2 min-w-0">
              <DoubleChevronLogo className="h-5.5 w-5.5 text-neutral-200 shrink-0" />
              <span className="font-serif text-sm font-semibold tracking-tight text-neutral-100 hidden sm:inline">Stats & Billing Analytics</span>
              <span className="font-serif text-sm font-semibold tracking-tight text-neutral-100 inline sm:hidden">Stats</span>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex-grow flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-orchid" />
          </div>
        ) : !data ? (
          <div className="flex-grow flex flex-col items-center justify-center text-neutral-500 text-sm">
            No stats data could be retrieved.
          </div>
        ) : (
          /* Scrollable stats content */
          <div className="flex-grow overflow-y-auto">
            <main className="max-w-6xl mx-auto px-6 md:px-12 py-10 w-full flex flex-col gap-8 z-10 select-none">
              {/* Summary Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-[#131313] border border-white/5 p-6 rounded-2xl flex items-center gap-4 shadow-xl">
                  <div className="h-12 w-12 rounded-xl bg-emerald-950/20 border border-emerald-900/10 text-emerald-400 flex items-center justify-center shrink-0">
                    <Coins className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Remaining Budget</div>
                    <div className="text-2xl font-black text-emerald-400 font-mono">${data.credits.toFixed(4)}</div>
                    <div className="text-[10px] text-neutral-450 mt-0.5">Status: <span className="uppercase font-bold text-orchid">{data.status}</span></div>
                  </div>
                </div>

                <div className="bg-[#131313] border border-white/5 p-6 rounded-2xl flex items-center gap-4 shadow-xl">
                  <div className="h-12 w-12 rounded-xl bg-orchid/5 border border-orchid/20 text-orchid flex items-center justify-center shrink-0">
                    <Receipt className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Total Spent</div>
                    <div className="text-2xl font-black text-neutral-100 font-mono">${data.summary.totalCost.toFixed(4)}</div>
                    <div className="text-[10px] text-neutral-450 mt-0.5">Based on catalog rules</div>
                  </div>
                </div>

                <div className="bg-[#131313] border border-white/5 p-6 rounded-2xl flex items-center gap-4 shadow-xl">
                  <div className="h-12 w-12 rounded-xl bg-lavender/5 border border-lavender/20 text-lavender flex items-center justify-center shrink-0">
                    <Cpu className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Total Tokens Consumed</div>
                    <div className="text-2xl font-black text-neutral-100 font-mono">{(data.summary.totalTokens / 1000).toFixed(1)}k</div>
                    <div className="text-[10px] text-neutral-450 mt-0.5">
                      Input: {(data.summary.totalTokensInput / 1000).toFixed(1)}k | Cached: {(data.summary.totalTokensCached / 1000).toFixed(1)}k
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Side: Table of Chat Runs */}
                <div className="lg:col-span-8 bg-[#131313] border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-serif font-semibold mb-6 text-neutral-200 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-orchid" />
                      Research Execution Log
                    </h3>

                    {data.chats.length === 0 ? (
                      <div className="text-center py-16 border border-dashed border-white/5 rounded-xl bg-neutral-900/10">
                        <p className="text-neutral-400 text-sm font-semibold">No execution records found</p>
                        <p className="text-neutral-505 text-xs mt-1 leading-normal font-sans">Complete deep research runs to populate analytics.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-neutral-800 text-neutral-505 font-bold uppercase tracking-wider">
                              <th className="pb-3.5 pl-2 font-sans">Research Topic</th>
                              <th className="pb-3.5 font-sans">Model</th>
                              <th className="pb-3.5 font-sans">Tokens (In/Out)</th>
                              <th className="pb-3.5 font-sans">Cost</th>
                              <th className="pb-3.5 pr-2 font-sans">Report</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-900">
                            {data.chats.map((c) => (
                              <tr
                                key={c.id}
                                onClick={() => setSelectedChat(c)}
                                className={`cursor-pointer transition duration-150 group ${
                                  selectedChat?.id === c.id
                                    ? 'bg-orchid/5 text-orchid font-medium'
                                    : 'hover:bg-neutral-900/40 text-neutral-300'
                                }`}
                              >
                                <td className="py-4 pl-2 font-medium max-w-[200px] truncate pr-4">
                                  {c.title}
                                </td>
                                <td className="py-4">
                                  <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#111] border border-white/5 text-neutral-450 uppercase font-sans">
                                    {c.model}
                                  </span>
                                </td>
                                <td className="py-4 font-mono text-[10px]">
                                  {c.tokens_input} / {c.tokens_output}
                                </td>
                                <td className="py-4 font-mono font-bold text-neutral-200">
                                  ${Number(c.cost_usd).toFixed(4)}
                                </td>
                                <td className="py-4 pr-2" onClick={(e) => e.stopPropagation()}>
                                  {c.artifact_url ? (
                                    <a
                                      href={c.artifact_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-orchid hover:text-orchid/90 transition-colors"
                                    >
                                      <Download className="h-3.5 w-3.5" />
                                      PDF
                                    </a>
                                  ) : (
                                    <span className="text-neutral-600 font-sans">—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side: Detailed Cost & Graph Panel */}
                <div className="lg:col-span-4 bg-[#131313] border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                  {selectedChat ? (
                    <div className="space-y-6 animate-fade-in">
                      <div className="flex items-start gap-2.5 pb-4 border-b border-neutral-800">
                        <BrainCircuit className="h-5 w-5 text-orchid shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-serif text-sm font-semibold text-neutral-255 max-w-[220px] truncate">
                            {selectedChat.title}
                          </h4>
                          <p className="text-[10px] text-neutral-500 flex items-center gap-1 mt-0.5 font-mono">
                            <Calendar className="h-3.5 w-3.5 text-neutral-605" />
                            {new Date(selectedChat.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Cost breakdown metrics */}
                      <div className="space-y-4">
                        <h5 className="text-[10px] font-bold uppercase tracking-wider text-neutral-505 font-sans">Usage Details</h5>
                        
                        <div className="space-y-3 font-mono text-xs">
                          <div className="flex justify-between items-center py-1.5 border-b border-neutral-800/40">
                            <span className="text-neutral-450 font-sans">Model Badge</span>
                            <span className="text-neutral-300 uppercase font-semibold text-[9.5px]">{selectedChat.model}</span>
                          </div>

                          <div className="flex justify-between items-center py-1.5 border-b border-neutral-800/40">
                            <span className="text-neutral-450 font-sans">Active Input Tokens</span>
                            <span className="text-neutral-300">{selectedChat.tokens_input - selectedChat.tokens_cached}</span>
                          </div>

                          <div className="flex justify-between items-center py-1.5 border-b border-neutral-800/40 text-orchid/90">
                            <span className="font-bold font-sans">Prompt-Cached Tokens</span>
                            <span className="font-semibold">{selectedChat.tokens_cached}</span>
                          </div>

                          <div className="flex justify-between items-center py-1.5 border-b border-neutral-800/40">
                            <span className="text-neutral-455 font-sans">Output Tokens</span>
                            <span className="text-neutral-300">{selectedChat.tokens_output}</span>
                          </div>

                          <div className="flex justify-between items-center py-2 text-sm text-orchid font-bold border-b border-orchid/15">
                            <span className="font-sans">Total Cost (USD)</span>
                            <span className="bg-orchid/5 text-orchid px-2.5 py-0.5 border border-orchid/20 rounded font-bold">${Number(selectedChat.cost_usd).toFixed(6)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Mini Cost Bar Chart representation */}
                      <div className="space-y-3 pt-2">
                        <h5 className="text-[10px] font-bold uppercase tracking-wider text-neutral-505 flex items-center gap-1.5 font-sans">
                          <Layers className="h-3.5 w-3.5 text-orchid" />
                          Token Cost Allocation
                        </h5>
                        
                        {/* Visual Segment Bar */}
                        <div className="h-4.5 w-full flex rounded-full overflow-hidden bg-neutral-950 border border-white/5 p-0.5">
                          {(() => {
                            const { inputPct, cachedPct, outputPct } = getBarChartPercentages(selectedChat);
                            return (
                              <>
                                {inputPct > 0 && (
                                  <div
                                    style={{ width: `${inputPct}%` }}
                                    className="h-full bg-orchid rounded-l-full"
                                    title={`Active Input: ${inputPct.toFixed(1)}%`}
                                  />
                                )}
                                {cachedPct > 0 && (
                                  <div
                                    style={{ width: `${cachedPct}%` }}
                                    className="h-full bg-lavender"
                                    title={`Cached: ${cachedPct.toFixed(1)}%`}
                                  />
                                )}
                                {outputPct > 0 && (
                                  <div
                                    style={{ width: `${outputPct}%` }}
                                    className="h-full bg-neutral-200 rounded-r-full"
                                    title={`Output: ${outputPct.toFixed(1)}%`}
                                  />
                                )}
                              </>
                            );
                          })()}
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-neutral-450 font-medium font-sans">
                          <div className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded bg-orchid shrink-0" />
                            <span>Active Input ({getBarChartPercentages(selectedChat).inputPct.toFixed(0)}%)</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded bg-lavender shrink-0" />
                            <span>Cached Input ({getBarChartPercentages(selectedChat).cachedPct.toFixed(0)}%)</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded bg-neutral-200 shrink-0" />
                            <span>Output ({getBarChartPercentages(selectedChat).outputPct.toFixed(0)}%)</span>
                          </div>
                        </div>
                      </div>

                      {selectedChat.artifact_url && (
                        <div className="pt-6">
                          <a
                            href={selectedChat.artifact_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full bg-orchid hover:bg-orchid/90 text-charcoal font-bold py-2.5 rounded-xl transition text-xs shadow-md shadow-orchid/5 cursor-pointer active:scale-[0.99]"
                          >
                            <FileText className="h-4 w-4" />
                            Download PDF Report
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-neutral-500 text-center py-20 text-xs font-medium font-sans">
                      Select a research execution row to audit billing breakdowns.
                    </div>
                  )}
                </div>
              </div>
            </main>
          </div>
        )}
      </section>
    </div>
  );
}
