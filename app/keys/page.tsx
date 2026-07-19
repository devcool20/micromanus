'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import {
  Key,
  Plus,
  Check,
  Trash2,
  ShieldAlert,
  ArrowLeft,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  LogOut,
  Brain,
  Menu
} from 'lucide-react';
import Link from 'next/link';

interface ApiKeyItem {
  id: string;
  provider: string;
  model: string;
  endpoint: string;
  label: string;
  is_default: boolean;
  created_at: string;
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

export default function KeysPage() {
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

  // Key configurations states
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Form State
  const [label, setLabel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('claude-sonnet-4-20250514');
  const [endpoint, setEndpoint] = useState('https://openrouter.ai/api/v1');
  const [isDefault, setIsDefault] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);
  const [profileCredits, setProfileCredits] = useState<number | null>(null);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [provider, setProvider] = useState<'openrouter' | 'openai' | 'kimi' | 'custom'>('openrouter');
  const [customModel, setCustomModel] = useState('');

  // Model catalog with prices for display
  const modelCatalog = [
    { id: 'gpt-5', name: 'GPT-5 (gpt-4o)', in: '$1.25', out: '$10.00', cached: '$0.625' },
    { id: 'gpt-5-mini', name: 'GPT-5 Mini (gpt-4o-mini)', in: '$0.40', out: '$3.20', cached: '$0.20' },
    { id: 'gpt-4.1', name: 'GPT-4.1 (gpt-4-turbo)', in: '$2.00', out: '$8.00', cached: '$1.00' },
    { id: 'claude-opus-4-20250514', name: 'Claude 4 Opus (claude-3-opus)', in: '$15.00', out: '$75.00', cached: '$7.50' },
    { id: 'claude-sonnet-4-20250514', name: 'Claude 4 Sonnet (claude-3.5-sonnet)', in: '$3.00', out: '$15.00', cached: '$1.50' },
    { id: 'claude-haiku-4-20250514', name: 'Claude 4 Haiku (claude-3-haiku)', in: '$0.80', out: '$4.00', cached: '$0.40' },
    { id: 'kimi-k2-0905', name: 'Kimi K2 (moonshot-v1-8k)', in: '$0.60', out: '$2.50', cached: '$0.30' },
    { id: 'kimi-k2-thinking', name: 'Kimi K2 Thinking (moonshot-v1-32k)', in: '$1.20', out: '$5.00', cached: '$0.60' },
    { id: 'tencent/hy3:free', name: 'Tencent Hy3 (Tencent Hy3 Free)', in: 'Free', out: 'Free', cached: 'Free' },
  ];

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

  const fetchKeys = async () => {
    try {
      const response = await fetch('/api/keys');
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setKeys(data.keys || []);
    } catch (err) {
      console.error('Error fetching keys:', err);
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/stats');
      const data = await response.json();
      if (!data.error) {
        setProfileCredits(data.credits);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadThreads(), fetchKeys(), fetchProfile()]);
      setLoading(false);
    };
    init();
  }, []);

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setFormError('API Key is required.');
      return;
    }

    if (provider === 'custom' && !customModel.trim()) {
      setFormError('Custom Model Identifier is required.');
      return;
    }

    try {
      setFormError(null);
      setFormSuccess(false);
      setActionLoading('add');

      const finalModel = provider === 'custom' ? customModel.trim() : selectedModel;
      const finalLabel = label.trim() || `${provider.toUpperCase()} (${finalModel})`;

      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          model: finalModel,
          endpoint: endpoint.trim(),
          api_key: apiKey.trim(),
          label: finalLabel,
          is_default: isDefault,
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setFormSuccess(true);
      setApiKey('');
      setLabel('');
      setCustomModel('');
      await fetchKeys();
      router.refresh();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save API key.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSetDefault = async (keyId: string) => {
    try {
      setActionLoading(`default-${keyId}`);
      const response = await fetch(`/api/keys/${keyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_default: true }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      await fetchKeys();
    } catch (err: any) {
      alert(`Error updating default key: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;

    try {
      setActionLoading(`delete-${keyId}`);
      const response = await fetch(`/api/keys/${keyId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      await fetchKeys();
    } catch (err: any) {
      alert(`Error deleting key: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

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
              className={`bg-[#1e1e1e] hover:bg-[#252525] border border-white/5 text-neutral-450 hover:text-neutral-300 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
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
                          className="opacity-0 group-hover:opacity-100 text-neutral-600 hover:text-rose-400 p-0.5 rounded transition shrink-0 cursor-pointer"
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
            className={`flex items-center hover:bg-neutral-900 text-orchid hover:text-orchid rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer bg-neutral-900/50 ${
              isSidebarCollapsed ? 'w-8 h-8 justify-center p-0 mx-auto' : 'gap-2.5 px-2 py-2 font-semibold'
            }`}
            title={isSidebarCollapsed ? "API Key Manager" : undefined}
          >
            <Key className="w-3.5 h-3.5 text-orchid shrink-0" />
            {!isSidebarCollapsed && <span>API Key Manager</span>}
          </Link>
          
          <Link
            href="/stats"
            className={`flex items-center hover:bg-neutral-900 hover:text-neutral-200 rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
              isSidebarCollapsed ? 'w-8 h-8 justify-center p-0 mx-auto' : 'gap-2.5 px-2 py-2'
            }`}
            title={isSidebarCollapsed ? "Analytics & Billing" : undefined}
          >
            <BarChart3 className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
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
      <section className="flex-1 flex flex-col justify-between overflow-hidden relative bg-[#181818]">
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
              <span className="font-serif text-sm font-semibold tracking-tight text-neutral-100 hidden sm:inline">API Key Manager</span>
              <span className="font-serif text-sm font-semibold tracking-tight text-neutral-100 inline sm:hidden">Keys</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-neutral-450">Remaining budget:</span>
            <span className="font-mono font-bold text-xs bg-orchid/5 text-orchid px-3 py-1 rounded-full border border-orchid/20 shadow-sm">
              ${profileCredits !== null ? profileCredits.toFixed(4) : '0.0000'}
            </span>
          </div>
        </header>

        {/* Scrollable Form Content */}
        <div className="flex-grow overflow-y-auto">
          <main className="max-w-5xl mx-auto px-6 md:px-12 py-10 w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Side: Add API Key Form */}
            <div className="lg:col-span-5 bg-[#131313] border border-white/5 rounded-2xl p-6 shadow-xl h-fit">
              <div className="flex items-center gap-2.5 mb-6 select-none">
                <Key className="h-5 w-5 text-orchid" />
                <h2 className="text-xl font-serif font-semibold text-neutral-200">
                  {provider === 'custom' ? 'Add Custom API Key' : `Add ${provider === 'openai' ? 'OpenAI' : provider === 'kimi' ? 'Kimi' : 'OpenRouter'} Key`}
                </h2>
              </div>

              {formError && (
                <div className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 font-medium animate-fade-in">
                  {formError}
                </div>
              )}

              {formSuccess && (
                <div className="mb-4 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 font-medium animate-fade-in">
                  API key successfully saved as default!
                </div>
              )}

              <form onSubmit={handleAddKey} className="space-y-4 font-sans">
                {/* Provider Selector tabs */}
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1.5 uppercase tracking-wider select-none font-sans">Provider</label>
                  <div className="grid grid-cols-4 gap-1 p-1 bg-[#111] border border-white/5 rounded-xl select-none">
                    {[
                      { id: 'openrouter', name: 'OpenRouter' },
                      { id: 'openai', name: 'OpenAI' },
                      { id: 'kimi', name: 'Kimi' },
                      { id: 'custom', name: 'Custom' },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setProvider(p.id as any);
                          setFormError(null);
                          if (p.id === 'openrouter') {
                            setEndpoint('https://openrouter.ai/api/v1');
                            setSelectedModel('claude-sonnet-4-20250514');
                          } else if (p.id === 'openai') {
                            setEndpoint('https://api.openai.com/v1');
                            setSelectedModel('gpt-5');
                          } else if (p.id === 'kimi') {
                            setEndpoint('https://api.moonshot.cn/v1');
                            setSelectedModel('kimi-k2-0905');
                          } else {
                            setEndpoint('https://api.deepseek.com/v1');
                            setSelectedModel('custom');
                          }
                        }}
                        className={`py-1.5 rounded-lg text-[9.5px] font-bold transition cursor-pointer select-none text-center ${
                          provider === p.id
                            ? 'bg-orchid text-charcoal shadow-sm'
                            : 'text-neutral-500 hover:text-neutral-350'
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1.5 uppercase tracking-wider select-none font-sans">Key Label</label>
                  <input
                    type="text"
                    placeholder={`e.g. My ${provider === 'custom' ? 'Custom' : provider.toUpperCase()} Key`}
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    className="w-full bg-[#111] border border-white/5 focus:border-orchid/40 focus:outline-none transition rounded-xl px-4 py-2.5 text-xs text-neutral-200 focus:ring-1 focus:ring-orchid/10"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1.5 uppercase tracking-wider select-none font-sans">API Key</label>
                  <input
                    type="password"
                    placeholder="sk-..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full bg-[#111] border border-white/5 focus:border-orchid/40 focus:outline-none transition rounded-xl px-4 py-2.5 text-xs font-mono text-neutral-250 focus:ring-1 focus:ring-orchid/10"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1.5 uppercase tracking-wider select-none font-sans">API Endpoint</label>
                  <input
                    type="text"
                    value={endpoint}
                    disabled={provider !== 'custom'}
                    onChange={(e) => setEndpoint(e.target.value)}
                    className={`w-full bg-[#111] border border-white/5 focus:border-orchid/40 focus:outline-none transition rounded-xl px-4 py-2.5 text-xs font-mono focus:ring-1 focus:ring-orchid/10 ${
                      provider !== 'custom' ? 'text-neutral-550 opacity-60 cursor-not-allowed' : 'text-neutral-250'
                    }`}
                  />
                </div>

                {provider === 'custom' ? (
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 mb-1.5 uppercase tracking-wider select-none font-sans">Custom Model Identifier</label>
                    <input
                      type="text"
                      placeholder="e.g. deepseek-chat or llama3"
                      value={customModel}
                      onChange={(e) => setCustomModel(e.target.value)}
                      className="w-full bg-[#111] border border-white/5 focus:border-orchid/40 focus:outline-none transition rounded-xl px-4 py-2.5 text-xs font-mono text-neutral-250 focus:ring-1 focus:ring-orchid/10"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 mb-1.5 uppercase tracking-wider select-none font-sans">Target Model</label>
                    <div className="relative z-30 select-none">
                      <button
                        type="button"
                        onClick={() => setModelMenuOpen(!modelMenuOpen)}
                        className="flex items-center justify-between w-full bg-[#111] border border-white/5 focus:border-orchid/40 focus:outline-none transition rounded-xl px-4 py-2.5 text-xs text-neutral-250 cursor-pointer text-left shadow-sm hover:bg-[#151515]"
                      >
                        <span>{modelCatalog.find(m => m.id === selectedModel)?.name || selectedModel}</span>
                        <ChevronDown className={`w-4 h-4 text-neutral-505 transition-transform duration-200 ${modelMenuOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {modelMenuOpen && (
                        <>
                          <div className="fixed inset-0 z-45" onClick={() => setModelMenuOpen(false)} />
                          <div className="absolute left-0 mt-1.5 w-full bg-[#1c1c1c] border border-white/5 rounded-xl py-1.5 shadow-2xl z-50 max-h-60 overflow-y-auto scrollbar-thin animate-fade-in">
                            {modelCatalog
                              .filter((m) => {
                                if (provider === 'openai') return m.id.startsWith('gpt-');
                                if (provider === 'kimi') return m.id.startsWith('kimi-');
                                return true; // Show all for OpenRouter
                              })
                              .map((m) => (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedModel(m.id);
                                    setModelMenuOpen(false);
                                  }}
                                  className={`w-full px-3.5 py-2 text-left text-xs transition-colors hover:bg-white/5 flex items-center justify-between ${
                                    selectedModel === m.id ? 'text-orchid font-semibold' : 'text-neutral-450'
                                  }`}
                                >
                                  <span>{m.name}</span>
                                  {selectedModel === m.id && <Check className="h-3.5 w-3.5 text-orchid" />}
                                </button>
                              ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 py-1.5">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="rounded border-neutral-800 text-orchid bg-[#111] focus:ring-orchid/20 cursor-pointer"
                  />
                  <label htmlFor="isDefault" className="text-xs text-neutral-400 select-none cursor-pointer">
                    Make this my default search key
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={actionLoading === 'add'}
                  className="flex items-center justify-center gap-2 w-full bg-orchid hover:bg-orchid/90 text-charcoal font-bold py-2.5 rounded-xl transition text-xs shadow-md active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading === 'add' ? (
                    <Loader2 className="h-4 w-4 animate-spin text-charcoal" />
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Save Key
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 border-t border-neutral-900 pt-4 flex gap-2.5 items-start">
                <ShieldAlert className="h-4 w-4 text-orchid shrink-0 mt-0.5" />
                <p className="text-[11px] text-neutral-555 leading-normal">
                  Keys are encrypted locally on the server using AES-256-GCM. We never log, save, or return raw decrypted keys to client browsers.
                </p>
              </div>
            </div>

            {/* Right Side: Keys List & Catalog */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              {/* Key List Card */}
              <div className="bg-[#131313] border border-white/5 rounded-2xl p-6 shadow-xl flex-grow">
                <h3 className="text-lg font-serif font-semibold mb-4 text-neutral-205 select-none">Configured API Keys</h3>

                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
                  </div>
                ) : keys.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-white/5 rounded-xl bg-neutral-900/10">
                    <Key className="h-8 w-8 text-neutral-600 mx-auto mb-3" />
                    <p className="text-neutral-400 text-sm font-semibold mb-1">No API keys found</p>
                    <p className="text-neutral-555 text-xs max-w-xs mx-auto leading-normal">
                      Add an OpenRouter API key on the left to activate deep research chats.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {keys.map((k) => (
                      <div
                        key={k.id}
                        className={`p-4 border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                          k.is_default ? 'border-orchid/30 bg-orchid/5' : 'border-white/5 hover:border-white/10 bg-[#111]'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-neutral-200">{k.label}</span>
                            {k.is_default && (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-orchid/10 text-orchid border border-orchid/30">
                                <Check className="h-2.5 w-2.5" />
                                Default
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-neutral-500 font-mono space-y-0.5">
                            <div>Model: <span className="text-neutral-450">{k.model}</span></div>
                            <div>Endpoint: <span className="text-neutral-455">{k.endpoint}</span></div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {!k.is_default && (
                            <button
                              onClick={() => handleSetDefault(k.id)}
                              disabled={!!actionLoading}
                              className="text-[10px] bg-[#1a1a1a] border border-white/5 hover:border-white/10 text-neutral-400 hover:text-white px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                            >
                              Set Default
                        </button>
                          )}
                          <button
                            onClick={() => handleDeleteKey(k.id)}
                            disabled={!!actionLoading}
                            className="text-neutral-555 hover:text-rose-400 p-2 hover:bg-rose-500/5 rounded-lg border border-transparent hover:border-rose-900/30 transition cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Model Pricing reference */}
              <div className="bg-[#131313]/30 border border-white/5 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
                <div className="flex items-center gap-1.5 text-xs text-orchid font-bold mb-3 uppercase tracking-wider select-none">
                  <Sparkles className="h-4 w-4" />
                  Token Pricing reference (per 1M tokens)
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {modelCatalog.map((m) => (
                    <div key={m.id} className="p-3 border border-white/5 rounded-xl bg-neutral-950/20 text-xs">
                      <div className="font-bold text-neutral-300 mb-1.5 truncate">{m.name}</div>
                      <div className="grid grid-cols-3 gap-2 text-[10px] text-neutral-550 font-mono">
                        <div>
                          <div className="font-semibold text-neutral-450 font-sans">Input</div>
                          {m.in}
                        </div>
                        <div>
                          <div className="font-semibold text-neutral-450 font-sans">Cached</div>
                          {m.cached}
                        </div>
                        <div>
                          <div className="font-semibold text-neutral-450 font-sans">Output</div>
                          {m.out}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </main>
        </div>
      </section>
    </div>
  );
}
