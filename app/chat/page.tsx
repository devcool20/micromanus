'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import {
  MessageSquare,
  Plus,
  Loader2,
  Key,
  BarChart3,
  FileText,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Check,
  Download,
  Settings,
  Sparkles,
  LogOut,
  Brain,
  History,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';

interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_name?: string;
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

interface ToolRun {
  name: string;
  arguments: any;
  status: 'running' | 'done' | 'failed';
  result?: string;
  error?: string;
}

const EXAMPLE_PROMPTS = [
  "Analyze the causes of California forest fires in recent years and compile a structured report.",
  "Summarize the recent breakthroughs in nuclear fusion research from early 2026.",
  "Compare solid-state and lithium-ion batteries for electric vehicle applications.",
  "Evaluate the global steel carbon footprint and summarize key decarbonization technologies.",
  "Research the history and current landscape of quantum computing hardware manufacturers.",
  "Analyze the economic impact of offshore wind energy in northern Europe.",
  "Compile a detailed study on current advances in CRISPR gene editing for therapeutics.",
  "Summarize the development of autonomous driving regulatory frameworks in California.",
  "Compare the efficiency and lifecycle cost of hydrogen fuel cells vs lithium batteries.",
  "Research the latest techniques in carbon capture, utilization, and storage (CCUS).",
  "Analyze the trends in decentralized finance (DeFi) security audits and major exploits.",
  "Evaluate the impact of high-frequency trading on stock market volatility."
];

function DoubleChevronLogo({ className = "w-6 h-6 text-charcoal" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 10l-5-5-5 5" />
      <path d="M17 16l-5-5-5 5" />
    </svg>
  );
}

const parseSourceLines = (lines: string[]) => {
  const sources: { title: string; url: string }[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Check for markdown links like [title](url)
    const mdLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/;
    const match = trimmed.match(mdLinkRegex);
    if (match) {
      sources.push({ title: match[1], url: match[2] });
      continue;
    }
    
    // Check for plain URLs with labels like "- Title: URL" or "• Title: URL"
    const urlRegex = /(https?:\/\/[^\s]+)/;
    const urlMatch = trimmed.match(urlRegex);
    if (urlMatch) {
      const url = urlMatch[1];
      let title = trimmed.replace(url, '').replace(/^[-*•\s]+/, '').replace(/:\s*$/, '').trim();
      if (!title) {
        title = url;
      }
      sources.push({ title, url });
    }
  }
  return sources;
};

interface ParsedMessage {
  body: string;
  sources: { title: string; url: string }[];
  notes: string[];
}

const parseMessageDetails = (text: string): ParsedMessage => {
  if (!text) return { body: '', sources: [], notes: [] };

  let currentText = text;
  const sources: { title: string; url: string }[] = [];
  const notes: string[] = [];

  // 1. Extract blockquotes/notes like "> ⚠️ Transparency note: ..." or similar
  const paragraphs = currentText.split('\n\n');
  const bodyParagraphs: string[] = [];

  for (const p of paragraphs) {
    const trimmed = p.trim();
    if (!trimmed) continue;

    // Check for transparency/sources note patterns
    const isTransparencyNote = /^(?:>\s*(?:⚠️\s*)?\*?Transparency note\*?:|Note on sources:|Note:\s+\*?Several|\*Note:)/i.test(trimmed);
    
    if (isTransparencyNote) {
      const cleanNote = trimmed.replace(/^>\s*/, '').replace(/^\*\s*/, '').replace(/^\-\s*/, '').trim();
      notes.push(cleanNote);
    } else {
      bodyParagraphs.push(p);
    }
  }

  currentText = bodyParagraphs.join('\n\n');

  // 2. Extract inline source links in paragraphs (Matches [Source: Title, URL] or [Source: URL] or (Source: URL) etc.)
  const inlinePatterns = [
    /\[Source:\s*([^,\]]+),\s*(https?:\/\/[^\s\]]+)\]/gi,
    /\[Source:\s*(https?:\/\/[^\s\]]+)\]/gi,
    /\(Source:\s*([^,\)]+),\s*(https?:\/\/[^\s\)]+)\)/gi,
    /\(Source:\s*(https?:\/\/[^\s\)]+)\)/gi,
    /\*Source:\s*(https?:\/\/[^\s\*]+)\*/gi,
    /\bSource:\s*(https?:\/\/[^\s\n]+)/gi
  ];

  for (const pattern of inlinePatterns) {
    let match;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(currentText)) !== null) {
      if (match.length >= 3) {
        sources.push({ title: match[1].trim(), url: match[2].trim() });
      } else {
        sources.push({ title: match[1].trim(), url: match[1].trim() });
      }
    }
  }

  // Clean them up from the main body text
  currentText = currentText
    .replace(/\[Source:\s*[^,\]]+,\s*https?:\/\/[^\s\]]+\]/gi, '')
    .replace(/\[Source:\s*https?:\/\/[^\s\]]+\]/gi, '')
    .replace(/\(Source:\s*[^,\)]+,\s*https?:\/\/[^\s\)]+\)/gi, '')
    .replace(/\(Source:\s*https?:\/\/[^\s\)]+\)/gi, '')
    .replace(/\*Source:\s*https?:\/\/[^\s\*]+\*/gi, '')
    .replace(/\bSource:\s*https?:\/\/[^\s\n]+/gi, '')
    .trim();

  // 3. Find and extract dedicated Sources/References sections, even in the middle of response
  const sourcesHeaderRegex = /^(?:#+\s*)?[\*_~]*(?:sources|references|sources\s*\/\s*links\s*consulted|sources\s*consulted|links\s*consulted)[\*_~]*\s*:?\s*$/im;
  const matchHeader = currentText.match(sourcesHeaderRegex);

  if (matchHeader && matchHeader.index !== undefined) {
    const headerPos = matchHeader.index;
    const matchedHeaderLabel = matchHeader[0];
    const beforeSources = currentText.slice(0, headerPos).trim();
    const afterSources = currentText.slice(headerPos + matchedHeaderLabel.length).trim();
    
    const lines = afterSources.split('\n');
    const remainingLines: string[] = [];
    let parsingSources = true;

    for (const line of lines) {
      const lineTrimmed = line.trim();
      
      if (parsingSources) {
        if (!lineTrimmed) {
          continue;
        }

        const hasUrl = /https?:\/\/[^\s]+/.test(lineTrimmed);
        const mdLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/;
        const hasMdLink = mdLinkRegex.test(lineTrimmed);
        const isBullet = /^[-*•\s\>]+/.test(lineTrimmed);

        if (hasUrl || hasMdLink || (isBullet && lineTrimmed.length < 150)) {
          const mdMatch = lineTrimmed.match(mdLinkRegex);
          if (mdMatch) {
            sources.push({ title: mdMatch[1], url: mdMatch[2] });
          } else {
            const urlRegex = /(https?:\/\/[^\s]+)/;
            const urlMatch = lineTrimmed.match(urlRegex);
            if (urlMatch) {
              const url = urlMatch[1];
              let title = lineTrimmed.replace(url, '').replace(/^[-*•\s\>]+/, '').replace(/:\s*$/, '').trim();
              if (!title) title = url;
              sources.push({ title, url });
            }
          }
        } else {
          // Hit a non-source line; stop parsing sources and collect the rest as main body text
          parsingSources = false;
          remainingLines.push(line);
        }
      } else {
        remainingLines.push(line);
      }
    }

    currentText = beforeSources + (remainingLines.length > 0 ? '\n\n' + remainingLines.join('\n') : '');
  }

  // Deduplicate sources by URL
  const uniqueSourcesMap = new Map<string, { title: string; url: string }>();
  for (const s of sources) {
    const normalizedUrl = s.url.trim().replace(/\/$/, '');
    if (!uniqueSourcesMap.has(normalizedUrl)) {
      uniqueSourcesMap.set(normalizedUrl, s);
    }
  }

  // Clean trailing horizontal rules and clean up double spaces
  currentText = currentText.replace(/\n\s*---\s*$/, '').trim();

  return {
    body: currentText,
    sources: Array.from(uniqueSourcesMap.values()),
    notes: notes
  };
};

function CollapsibleNote({ note }: { note: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <div className="bg-[#151515] border border-white/5 rounded-xl p-3 animate-fade-in text-[10.5px] leading-relaxed">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between gap-2 text-neutral-450 hover:text-neutral-300 font-sans font-semibold cursor-pointer"
      >
        <span className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Transparency Note
        </span>
        <span className="text-[9.5px] text-neutral-500 hover:text-neutral-300">
          {isExpanded ? 'Hide' : 'Show'}
        </span>
      </button>
      {isExpanded && (
        <div className="mt-2.5 text-neutral-500 border-t border-white/5 pt-2.5 font-sans leading-relaxed">
          {note}
        </div>
      )}
    </div>
  );
}

function CollapsibleSources({ sources }: { sources: { title: string; url: string }[] }) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  return (
    <div className="space-y-2 font-sans border-t border-white/5 pt-3.5 mt-3.5">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-[10px] font-bold text-neutral-400 hover:text-neutral-200 select-none cursor-pointer"
      >
        <span className="flex items-center gap-1.5 uppercase tracking-wider">
          <svg className="w-3.5 h-3.5 text-orchid" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.754 18 18.168 18.477 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Sources ({sources.length})
        </span>
        <span className="text-neutral-500 hover:text-neutral-300">
          {isExpanded ? 'Hide' : 'Show'}
        </span>
      </button>

      {isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 animate-fade-in">
          {sources.map((s, idx) => {
            let domain = '';
            try {
              domain = new URL(s.url).hostname;
            } catch {
              domain = 'external-link';
            }
            return (
              <a
                key={idx}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2.5 bg-[#141414] hover:bg-[#1c1c1c] border border-white/5 hover:border-orchid/20 rounded-xl transition-all duration-200 cursor-pointer group shadow-sm active:scale-[0.98]"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-grow">
                  <div className="w-7 h-7 rounded-lg bg-neutral-900 flex items-center justify-center border border-white/5 text-neutral-550 group-hover:text-orchid transition-colors duration-200">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <div className="text-left min-w-0 flex-1">
                    <div className="font-semibold text-neutral-350 group-hover:text-neutral-200 text-[10.5px] truncate leading-normal transition-colors duration-200">
                      {s.title}
                    </div>
                    <div className="text-[8.5px] text-neutral-550 truncate font-mono">
                      {domain}
                    </div>
                  </div>
                </div>
                <svg className="w-3 h-3 text-neutral-600 group-hover:text-orchid ml-2 transition-colors duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ChatComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [composerInput, setComposerInput] = useState('');
  
  // Collapsible Sidebar State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Custom Model Dropdown state
  const [modelMenuOpen, setModelMenuOpen] = useState(false);

  // Random welcome suggestions
  const [randomExamples, setRandomExamples] = useState<string[]>([]);
  
  // BYO Keys check
  const [hasKeys, setHasKeys] = useState<boolean>(true);
  const [userKeys, setUserKeys] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState('claude-sonnet-4-20250514');
  const [profileCredits, setProfileCredits] = useState<number | null>(null);

  // SSE/Streaming States
  const [isStreaming, setIsStreaming] = useState(false);
  const [agentStatus, setAgentStatus] = useState<string>('');
  const [streamingText, setStreamingText] = useState('');
  const [toolRuns, setToolRuns] = useState<ToolRun[]>([]);
  const [artifactUrl, setArtifactUrl] = useState<string | null>(null);
  
  // UI States
  const [expandedToolIndex, setExpandedToolIndex] = useState<number | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [collapsedObservations, setCollapsedObservations] = useState<Record<string, boolean>>({});

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState<'info' | 'error' | 'success'>('info');

  const showModal = (title: string, message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType(type);
    setModalOpen(true);
  };

  const toggleObservation = (idx: string | number) => {
    setCollapsedObservations((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const formatToolArguments = (args: any) => {
    if (!args) return '{}';
    if (typeof args === 'string') {
      try {
        return JSON.stringify(JSON.parse(args));
      } catch {
        return args;
      }
    }
    return JSON.stringify(args);
  };

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleGeneratePdf = async (messageContent: string) => {
    if (!activeThreadId || isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    try {
      const activeThread = threads.find((t) => t.id === activeThreadId);
      const title = activeThread ? activeThread.title : 'MicroManus Research Report';
      
      const res = await fetch(`/api/chats/${activeThreadId}/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markdownContent: messageContent,
          title,
        }),
      });
      const data = await res.json();
      if (data.url) {
        setArtifactUrl(data.url);
        // Also update local thread list to store the url
        setThreads((prev) =>
          prev.map((t) => (t.id === activeThreadId ? { ...t, artifact_url: data.url } : t))
        );
      } else {
        showModal('PDF Generation Failed', data.error || 'Unknown error', 'error');
      }
    } catch (err) {
      console.error('Error generating PDF:', err);
      showModal('PDF Compilation Error', 'An error occurred while compiling the PDF report.', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch threads and key configs on load
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

  const checkKeys = async () => {
    try {
      const res = await fetch('/api/keys');
      const data = await res.json();
      if (!data.error) {
        setHasKeys(data.keys && data.keys.length > 0);
        setUserKeys(data.keys || []);
        
        // Find default key's model
        const defaultKey = data.keys.find((k: any) => k.is_default);
        if (defaultKey) {
          setSelectedModel(defaultKey.model);
        } else if (data.keys.length > 0) {
          setSelectedModel(data.keys[0].model);
        }
      }
    } catch (err) {
      console.error('Error checking keys:', err);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      if (!data.error) {
        setProfileCredits(data.credits);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const init = async () => {
      await Promise.all([loadThreads(), checkKeys(), fetchProfile()]);
      
      // Read URL params directly from the browser (not React's searchParams)
      // so we're always in sync with window.history.replaceState changes
      const urlParams = new URLSearchParams(window.location.search);
      const paramId = urlParams.get('id') || urlParams.get('threadId');
      if (paramId) {
        await loadChatHistory(paramId);
      }
    };
    init();

    // Check Stripe checkout success URL param
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('checkout_success') === 'true') {
      showModal('Payment Confirmed', 'Payment successful! 5 credits added to your account.', 'success');
      window.history.replaceState(null, '', '/chat');
    }
  }, []);

  // Shuffle suggestion examples when activeThreadId changes or resets
  useEffect(() => {
    const shuffled = [...EXAMPLE_PROMPTS].sort(() => 0.5 - Math.random());
    setRandomExamples(shuffled.slice(0, 3));
  }, [activeThreadId]);

  // Scroll messages to bottom on update (skip when empty to avoid jitter)
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingText, agentStatus, toolRuns]);

  const loadChatHistory = async (threadId: string, isReloadingActive: boolean = false) => {
    try {
      setLoadingHistory(true);
      setActiveThreadId(threadId);
      
      // Update the URL bar silently (without triggering searchParams re-render)
      if (!isReloadingActive) {
        window.history.replaceState(null, '', `/chat?id=${threadId}`);
      }

      // Fetch FIRST, then swap state atomically — never clear messages before
      // the fetch completes, otherwise the empty state flashes the welcome screen.
      const res = await fetch(`/api/chats/${threadId}`);
      const data = await res.json();
      if (!data.error) {
        // Atomic swap: set all state at once after data is ready
        setStreamingText('');
        setToolRuns([]);
        setCollapsedObservations({});
        setMessages(data.messages || []);
        const activeThread = threads.find((t) => t.id === threadId);
        if (activeThread) {
          setSelectedModel(activeThread.model);
          setArtifactUrl(activeThread.artifact_url || null);
        } else {
          setArtifactUrl(null);
        }
      }
    } catch (err) {
      console.error('Error loading chat history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleNewChat = () => {
    setActiveThreadId(null);
    setMessages([]);
    setStreamingText('');
    setToolRuns([]);
    setArtifactUrl(null);
    setComposerInput('');
    setCollapsedObservations({});
    window.history.replaceState(null, '', '/chat');
  };

  const handleDeleteThread = async (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this conversation?')) return;

    try {
      const res = await fetch(`/api/chats/${threadId}`, { method: 'DELETE' });
      if (res.ok) {
        if (activeThreadId === threadId) {
          handleNewChat();
        }
        await loadThreads();
      }
    } catch (err) {
      console.error('Error deleting chat:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composerInput.trim() || isStreaming) return;
    const promptText = composerInput.trim();
    setComposerInput('');
    await submitPrompt(promptText);
  };

  const submitPrompt = async (promptText: string) => {
    setIsStreaming(true);
    setStreamingText('');
    setToolRuns([]);
    setAgentStatus('Starting research agent...');

    // Prepend user message visually
    const tempUserMsg: ChatMessage = { role: 'user', content: promptText };
    setMessages((prev) => [...prev, tempUserMsg]);

    let currentChatId = activeThreadId;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: currentChatId,
          prompt: promptText,
          model: selectedModel,
        }),
      });

      if (!response.ok) {
        throw new Error('Server returned an error.');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No stream reader available.');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || ''; // Keep partial last element

        for (const rawEvent of parts) {
          const eventLines = rawEvent.split('\n');
          let eventType = '';
          let dataStr = '';

          for (const line of eventLines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              dataStr = line.slice(6).trim();
            }
          }

          if (eventType && dataStr) {
            try {
              const data = JSON.parse(dataStr);

              switch (eventType) {
                case 'chat_created':
                  currentChatId = data.chatId;
                  setActiveThreadId(data.chatId);
                  window.history.replaceState(null, '', `/chat?id=${data.chatId}`);
                  break;

                case 'status':
                  setAgentStatus(data.message);
                  break;

                case 'token':
                  setStreamingText((prev) => prev + data.token);
                  break;

                case 'tool_start':
                  setToolRuns((prev) => [
                    ...prev,
                    {
                      name: data.name,
                      arguments: data.arguments,
                      status: 'running',
                    },
                  ]);
                  // Auto expand the running tool
                  setExpandedToolIndex(toolRuns.length);
                  break;

                case 'tool_done':
                  setToolRuns((prev) => {
                    const next = [...prev];
                    const run = next.find((r) => r.name === data.name && r.status === 'running');
                    if (run) {
                      run.status = data.error ? 'failed' : 'done';
                      run.result = data.result || '';
                      run.error = data.error || '';
                    }
                    return next;
                  });
                  break;

                case 'artifact':
                  setArtifactUrl(data.url);
                  break;

                case 'error':
                  showModal('Research Failure', data.message, 'error');
                  setAgentStatus(`Failed: ${data.message}`);
                  break;

                case 'done':
                  // Wrap up the stream
                  setAgentStatus('');
                  setStreamingText('');
                  setToolRuns([]);
                  setCollapsedObservations({});
                  // Reload message history to get correctly saved records
                  if (currentChatId) {
                    await loadChatHistory(currentChatId, true);
                  }
                  await Promise.all([loadThreads(), fetchProfile()]);
                  break;
              }
            } catch (jsonErr) {
              console.error('Error parsing SSE data:', jsonErr);
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Streaming error:', err);
      showModal('Search Error', 'An error occurred during search. Please check your credentials and credits.', 'error');
    } finally {
      setIsStreaming(false);
      setAgentStatus('');
    }
  };

  // Helper to render inline markdown-like highlights (**text** and list bullets)
  const renderFormattedText = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      
      // Headers
      if (trimmed.startsWith('### ')) {
        return <h4 key={idx} className="font-serif font-semibold text-base text-neutral-100 mt-4 mb-2">{trimmed.slice(4)}</h4>;
      }
      if (trimmed.startsWith('## ')) {
        return <h3 key={idx} className="font-serif font-semibold text-lg text-neutral-100 mt-5 mb-2">{trimmed.slice(3)}</h3>;
      }
      if (trimmed.startsWith('# ')) {
        return <h2 key={idx} className="font-serif font-semibold text-xl text-orchid mt-6 mb-3">{trimmed.slice(2)}</h2>;
      }

      // Bullets
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const content = trimmed.slice(2);
        return (
          <div key={idx} className="flex gap-2 ml-4 my-1.5 align-top text-neutral-350">
            <span className="text-orchid font-bold font-sans">•</span>
            <span>{parseInlineStyles(content)}</span>
          </div>
        );
      }

      // Default text block
      return (
        <p key={idx} className="my-2 leading-relaxed text-neutral-355 text-sm">
          {parseInlineStyles(line)}
        </p>
      );
    });
  };

  const parseInlineStyles = (text: string) => {
    if (!text) return '';
    
    // First, split by backticks to find inline code segments
    const codeParts = text.split(/`([^`]+)`/g);
    
    return codeParts.map((codePart, idx) => {
      const isCode = idx % 2 === 1;
      
      if (isCode) {
        return (
          <code key={`code-${idx}`} className="font-mono text-[10px] text-orchid bg-[#151515] px-1.5 py-0.5 rounded border border-white/5">
            {codePart}
          </code>
        );
      }
      
      // For non-code parts, split by double asterisks to find bold text
      const boldParts = codePart.split(/\*\*([\s\S]*?)\*\*/g);
      return boldParts.map((boldPart, bIdx) => {
        const isBold = bIdx % 2 === 1;
        if (isBold) {
          return (
            <strong key={`bold-${idx}-${bIdx}`} className="font-bold text-neutral-100">
              {boldPart}
            </strong>
          );
        }
        return boldPart;
      });
    });
  };

  const isStartScreen = messages.length === 0 && !streamingText && !agentStatus;

  return (
    <div className="flex-grow bg-[#181818] text-[#F9F9F9] flex font-sans h-screen overflow-hidden">
      
      {/* 1. Sidebar (Threads List) */}
      <aside className={`bg-[#131313] border-r border-neutral-900 flex flex-col justify-between shrink-0 transition-all duration-300 ${isSidebarCollapsed ? 'w-16' : 'w-64'}`}>
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
            <button
              onClick={handleNewChat}
              disabled={isStreaming}
              className={`bg-[#1e1e1e] hover:bg-[#252525] border border-white/5 text-neutral-450 hover:text-neutral-300 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
                isSidebarCollapsed ? 'w-8 h-8 mx-auto p-0' : 'w-full py-2 px-3 gap-1.5 text-[10px] font-semibold'
              }`}
              title={isSidebarCollapsed ? "New Research" : undefined}
            >
              <Plus className="h-3.5 w-3.5" />
              {!isSidebarCollapsed && <span>New Research</span>}
            </button>
          </div>

          {/* Threads List (Only shown when sidebar is open) */}
          <div className="p-2 space-y-2 flex-grow overflow-y-auto min-h-0">
            {!isSidebarCollapsed && (
              <>
                <div className="px-3 py-1.5 text-[8.5px] uppercase font-bold text-neutral-600 tracking-widest select-none">
                  Recent Queries
                </div>

                {loadingThreads ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-4 w-4 animate-spin text-neutral-505" />
                  </div>
                ) : threads.length === 0 ? (
                  <div className="text-center py-10 px-4 text-[10px] text-neutral-550 font-sans">
                    No recent queries.
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {threads.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => !isStreaming && loadChatHistory(t.id)}
                        className={`group px-3 py-2 rounded-lg flex items-center justify-between cursor-pointer transition text-[11px] font-sans truncate ${
                          activeThreadId === t.id
                            ? 'bg-neutral-900 text-neutral-205 font-semibold border-transparent'
                            : 'text-neutral-500 hover:bg-neutral-900/30 hover:text-neutral-300 border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate flex-grow">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeThreadId === t.id ? 'bg-orchid animate-pulse' : 'bg-neutral-700'}`} />
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
        <div className="p-4 border-t border-neutral-900 bg-neutral-950/20 space-y-1.5 text-[10px] text-neutral-455 font-sans shrink-0">
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

      {/* 2. Main Chat Workspace */}
      <section className="flex-1 flex flex-col justify-between overflow-hidden relative bg-[#181818]">
        {/* API Key Notification Banner */}
        {!hasKeys && (
          <div className="bg-amber-500/10 border-b border-amber-500/25 px-6 py-3 flex items-center justify-between text-xs text-amber-400 backdrop-blur-md z-20 shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span>You have not configured an OpenRouter API key. Deep research runs require an API key to complete.</span>
            </div>
            <Link
              href="/keys"
              className="bg-amber-650 hover:bg-amber-500 text-slate-950 font-bold px-3 py-1.5 rounded-lg transition"
            >
              Configure Key
            </Link>
          </div>
        )}

        {/* Chat Area Header */}
        <header className="border-b border-neutral-900 bg-[#161616]/70 backdrop-blur-md py-4 px-6 md:px-10 flex justify-between items-center z-30 shrink-0 select-none">
          <div className="relative flex items-center">
            <span className="text-[10px] text-neutral-550 font-bold uppercase tracking-wider font-sans mr-2.5">Model:</span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setModelMenuOpen(!modelMenuOpen)}
                className="flex items-center justify-between gap-2 bg-[#1e1e1e] hover:bg-[#252525] border border-white/5 hover:border-white/10 rounded-lg px-3 py-1.5 text-[11px] font-medium text-neutral-300 transition-all cursor-pointer min-w-[170px] shadow-sm active:scale-[0.98]"
              >
                <span className="truncate">{selectedModel}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-neutral-500 transition-transform duration-200 ${modelMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {modelMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setModelMenuOpen(false)} />
                  <div className="absolute left-0 mt-1.5 w-full bg-[#1c1c1c] border border-white/5 rounded-xl py-1.5 shadow-2xl z-50 animate-fade-in max-h-60 overflow-y-auto scrollbar-thin">
                    {userKeys.map((k) => (
                      <button
                        key={k.id}
                        type="button"
                        onClick={() => {
                          setSelectedModel(k.model);
                          setModelMenuOpen(false);
                        }}
                        className={`w-full px-3.5 py-2 text-left text-[11px] font-medium transition-colors hover:bg-white/5 flex items-center justify-between ${
                          selectedModel === k.model ? 'text-orchid' : 'text-neutral-400'
                        }`}
                      >
                        <span className="truncate">{k.model}</span>
                        {selectedModel === k.model && <Check className="h-3.5 w-3.5 text-orchid" />}
                      </button>
                    ))}
                    {userKeys.length === 0 && (
                      <div className="px-3.5 py-2 text-[10px] text-neutral-555">
                        No key configured
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-neutral-555 font-bold uppercase tracking-wider font-sans">Budget:</span>
            <span className="font-mono text-[10px] font-bold text-orchid bg-orchid/5 border border-orchid/20 px-2.5 py-0.5 rounded-full shadow-sm">
              ${profileCredits !== null ? profileCredits.toFixed(4) : '0.0000'}
            </span>
          </div>
        </header>

        {/* Messages Feed Area */}
        <div className={`flex-grow px-4 md:px-12 py-6 space-y-6 ${isStartScreen ? 'overflow-hidden flex items-center justify-center' : 'overflow-y-auto'}`}>
          {isStartScreen ? (
            <div className="max-w-3xl mx-auto text-center flex flex-col items-center justify-center select-none font-sans animate-fade-in w-full bg-[#181818]">
              {/* Copied Brain Animation GIF */}
              <img
                src="/brain-animation.gif"
                className="h-36 w-36 object-contain mb-6 select-none pointer-events-none"
                alt="Brain Animation"
              />
              
              <h1 className="font-serif text-3xl font-semibold mb-2 text-neutral-100">Deep Research Assistant</h1>
              <p className="text-neutral-450 text-xs max-w-lg leading-relaxed mb-8 font-sans">
                Enter a complex topic or research prompt. The agent will execute Brave Search calls, scrape articles, synthesize findings, and export a report.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 w-full max-w-3xl text-left text-xs">
                {randomExamples.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => submitPrompt(item)}
                    className="p-4 border border-white/5 hover:border-orchid/20 rounded-xl bg-[#131313] hover:bg-[#1c1c1c] transition-all duration-200 text-neutral-450 hover:text-neutral-200 cursor-pointer shadow-sm active:scale-[0.97] hover:scale-[1.01] text-[11px] leading-relaxed select-none"
                  >
                    "{item}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {(() => {
                // Pre-group messages: merge consecutive tool_call + tool observation messages
                // into grouped research blocks for a clean, collapsible UI
                const groups: Array<{
                  type: 'user' | 'assistant' | 'research';
                  messages: typeof messages;
                  startIndex: number;
                }> = [];

                let i = 0;
                while (i < messages.length) {
                  const m = messages[i];
                  const isToolCall = m.role === 'assistant' && m.content.startsWith('{"tool_calls"');
                  const isToolObs = m.role === 'tool';

                  if (isToolCall || isToolObs) {
                    // Start a research group: collect all consecutive tool calls and observations
                    const researchMsgs = [];
                    const startIdx = i;
                    while (i < messages.length) {
                      const cur = messages[i];
                      const curIsToolCall = cur.role === 'assistant' && cur.content.startsWith('{"tool_calls"');
                      const curIsToolObs = cur.role === 'tool';
                      if (curIsToolCall || curIsToolObs) {
                        researchMsgs.push(cur);
                        i++;
                      } else {
                        break;
                      }
                    }
                    groups.push({ type: 'research', messages: researchMsgs, startIndex: startIdx });
                  } else if (m.role === 'user') {
                    groups.push({ type: 'user', messages: [m], startIndex: i });
                    i++;
                  } else {
                    groups.push({ type: 'assistant', messages: [m], startIndex: i });
                    i++;
                  }
                }

                return groups.map((group, groupIdx) => {
                  // --- USER MESSAGE ---
                  if (group.type === 'user') {
                    return (
                      <div key={`g-${groupIdx}`} className="flex justify-end animate-fade-in">
                        <div className="bg-[#242424] text-neutral-100 rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-[11px] max-w-[85%] font-medium font-sans border border-white/5 shadow-sm">
                          {group.messages[0].content}
                        </div>
                      </div>
                    );
                  }

                  // --- RESEARCH GROUP (collapsed dropdown) ---
                  if (group.type === 'research') {
                    // Parse all tool calls and observations for summary
                    const steps: Array<{ type: 'search' | 'fetch' | 'unknown'; query: string; result?: string }> = [];
                    for (const msg of group.messages) {
                      if (msg.role === 'assistant' && msg.content.startsWith('{"tool_calls"')) {
                        try {
                          const calls = JSON.parse(msg.content).tool_calls || [];
                          for (const tc of calls) {
                            let args: any = {};
                            try { args = JSON.parse(tc.arguments || '{}'); } catch {}
                            if (tc.name === 'web_search') {
                              steps.push({ type: 'search', query: args.query || 'web search' });
                            } else if (tc.name === 'fetch_page') {
                              steps.push({ type: 'fetch', query: args.url || 'page' });
                            } else {
                              steps.push({ type: 'unknown', query: tc.name });
                            }
                          }
                        } catch {}
                      } else if (msg.role === 'tool') {
                        // Attach result summary to the last step
                        if (steps.length > 0 && !steps[steps.length - 1].result) {
                          const content = msg.content || '';
                          if (content.startsWith('[')) {
                            try {
                              const results = JSON.parse(content);
                              steps[steps.length - 1].result = `Found ${results.length} results`;
                            } catch {
                              steps[steps.length - 1].result = `${content.length} chars`;
                            }
                          } else if (content.startsWith('Error')) {
                            steps[steps.length - 1].result = 'Error';
                          } else {
                            steps[steps.length - 1].result = `${content.length} chars`;
                          }
                        }
                      }
                    }

                    const searchCount = steps.filter(s => s.type === 'search').length;
                    const fetchCount = steps.filter(s => s.type === 'fetch').length;
                    const summaryParts = [];
                    if (searchCount > 0) summaryParts.push(`${searchCount} search${searchCount > 1 ? 'es' : ''}`);
                    if (fetchCount > 0) summaryParts.push(`${fetchCount} page${fetchCount > 1 ? 's' : ''} fetched`);
                    const summaryText = summaryParts.join(', ') || `${steps.length} steps`;

                    const isExpanded = collapsedObservations[`research-${groupIdx}`] === true;

                    return (
                      <div key={`g-${groupIdx}`} className="flex gap-3 justify-start max-w-[95%] animate-fade-in">
                        <div className="w-8 h-8 rounded-full bg-orchid/5 border border-orchid/25 text-orchid flex items-center justify-center shrink-0 shadow-sm shadow-orchid/5">
                          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        <div className="bg-[#1e1e1e] border border-white/5 p-3 rounded-2xl rounded-tl-sm flex-grow">
                          <button
                            type="button"
                            onClick={() => setCollapsedObservations(prev => ({
                              ...prev,
                              [`research-${groupIdx}`]: !prev[`research-${groupIdx}`]
                            }))}
                            className="w-full flex items-center justify-between gap-2 cursor-pointer group"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-sans font-bold text-neutral-300 text-[11px] select-none">
                                Deep Research
                              </span>
                              <span className="text-[9px] text-neutral-550 font-sans bg-neutral-900 px-2 py-0.5 rounded-full border border-white/5">
                                {summaryText}
                              </span>
                            </div>
                            <div className="text-neutral-550 group-hover:text-neutral-300 transition-colors">
                              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="mt-3 space-y-1.5 border-t border-white/5 pt-3">
                              {steps.map((step, stepIdx) => (
                                <div key={stepIdx} className="flex items-start gap-2 text-[9.5px] font-mono">
                                  <span className="mt-0.5 shrink-0">
                                    {step.type === 'search' ? (
                                      <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                      </svg>
                                    ) : step.type === 'fetch' ? (
                                      <svg className="w-3 h-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                                      </svg>
                                    ) : (
                                      <span className="w-3 h-3 block rounded-full bg-neutral-700" />
                                    )}
                                  </span>
                                  <span className="text-neutral-400 truncate flex-grow">
                                    {step.type === 'search' ? `Searched: "${step.query}"` : step.type === 'fetch' ? `Fetched: ${step.query}` : step.query}
                                  </span>
                                  {step.result && (
                                    <span className="text-neutral-600 shrink-0 text-[8.5px]">
                                      {step.result}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // --- STANDARD ASSISTANT MESSAGE ---
                  const m = group.messages[0];
                  const parsedMsg = parseMessageDetails(m.content);
                  const isLastMessage = group.startIndex === messages.length - 1 ||
                    // Check if this is the last non-tool message
                    (() => {
                      for (let j = group.startIndex + 1; j < messages.length; j++) {
                        const next = messages[j];
                        if (next.role === 'user' || (next.role === 'assistant' && !next.content.startsWith('{"tool_calls"'))) return false;
                      }
                      return true;
                    })();

                  return (
                    <div key={`g-${groupIdx}`} className="flex gap-3 justify-start max-w-[95%] animate-fade-in">
                      <div className="w-8 h-8 rounded-full bg-orchid/5 border border-orchid/25 text-orchid flex items-center justify-center shrink-0 shadow-sm shadow-orchid/5">
                        <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="bg-[#1e1e1e] border border-white/5 p-3.5 rounded-2xl rounded-tl-sm flex-grow space-y-3.5 min-w-0">
                        <div className="text-neutral-250 leading-relaxed text-xs">
                          {renderFormattedText(parsedMsg.body)}
                        </div>

                        {/* Render Collapsible Transparency / Source Notes */}
                        {parsedMsg.notes.length > 0 && (
                          <div className="space-y-2 mt-2 pt-2 border-t border-white/5">
                            {parsedMsg.notes.map((note, noteIdx) => (
                              <CollapsibleNote key={noteIdx} note={note} />
                            ))}
                          </div>
                        )}

                        {/* Render Collapsible Clickable Sources Flow */}
                        {parsedMsg.sources.length > 0 && (
                          <CollapsibleSources sources={parsedMsg.sources} />
                        )}

                        {/* If this is the final assistant response */}
                        {isLastMessage && (
                          artifactUrl ? (
                            <div className="p-3 bg-[#171717] border border-white/5 flex items-center justify-between gap-3 shadow-md rounded-lg animate-slide-up">
                              <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded bg-red-950/20 text-red-400 border border-red-900/10">
                                  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                  </svg>
                                </div>
                                <div className="text-left">
                                  <div className="font-semibold text-neutral-300 text-[11px] truncate max-w-[150px] sm:max-w-xs">
                                    {threads.find((t) => t.id === activeThreadId)?.title ? `${threads.find((t) => t.id === activeThreadId)?.title.slice(0, 20)}.pdf` : 'research_report.pdf'}
                                  </div>
                                  <div className="text-[9.5px] text-neutral-550 font-sans">A4 format • PDF Report document</div>
                                </div>
                              </div>
                              <a
                                href={artifactUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3.5 py-1.5 bg-orchid hover:bg-orchid/90 text-charcoal font-bold text-[9px] uppercase tracking-wider rounded transition-colors duration-200 cursor-pointer font-sans shadow-sm"
                              >
                                DOWNLOAD
                              </a>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleGeneratePdf(parsedMsg.body)}
                              disabled={isGeneratingPdf}
                              className="w-full flex items-center justify-center gap-2 p-2.5 bg-[#171717] hover:bg-[#202020] border border-white/5 hover:border-orchid/20 text-neutral-350 hover:text-neutral-250 rounded-xl transition duration-200 cursor-pointer text-[10.5px] font-semibold active:scale-[0.98] disabled:opacity-50"
                            >
                              {isGeneratingPdf ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-orchid" />
                                  Compiling PDF Report...
                                </>
                              ) : (
                                <>
                                  <FileText className="w-3.5 h-3.5 text-orchid" />
                                  Generate PDF Report
                                </>
                              )}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                });
              })()}

              {/* Streaming Logs */}
              {toolRuns.map((tr, index) => (
                <div key={`tr-${index}`} className="flex gap-3 justify-start max-w-[95%] animate-fade-in">
                  <div className="w-8 h-8 rounded-full bg-orchid/5 border border-orchid/25 text-orchid flex items-center justify-center shrink-0 shadow-sm shadow-orchid/5">
                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9-9c1.657 0 3 4.03 3 9s-1.343 9-3 9m0-18c-1.343 0-3 4.03-3 9s1.343 9 3 9m-9-9h18" />
                    </svg>
                  </div>
                  <div className="bg-[#1e1e1e] border border-white/5 p-3.5 rounded-2xl rounded-tl-sm flex-grow space-y-2">
                    <div className="font-sans font-bold text-neutral-200 text-xs flex justify-between items-center select-none">
                      <span>Executing Tool Loops</span>
                      <button
                        onClick={() => setExpandedToolIndex(expandedToolIndex === index ? null : index)}
                        className="text-[9.5px] text-neutral-550 hover:text-neutral-300 flex items-center gap-0.5 cursor-pointer"
                      >
                        {expandedToolIndex === index ? 'Collapse' : 'Expand'}
                        {expandedToolIndex === index ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                    </div>
                    
                    <div className="bg-[#151515] p-2.5 rounded-lg border border-white/5 font-mono text-[9.5px] space-y-1 text-neutral-450">
                      <div className="text-emerald-400 font-semibold truncate">
                        {tr.name}({formatToolArguments(tr.arguments)})
                      </div>
                      <div className="text-[8.5px] text-neutral-505 font-sans">Status: {tr.status}...</div>
                    </div>

                    {expandedToolIndex === index && (
                      <div className="bg-neutral-950 border border-neutral-900 rounded-xl p-3 max-h-40 overflow-y-auto text-[9.5px] font-mono text-neutral-450 whitespace-pre-wrap leading-normal scrollbar-thin">
                        {tr.error ? `Error: ${tr.error}` : tr.result || 'Querying upstream endpoint logs...'}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Streaming Live Text */}
              {streamingText && (
                <div className="flex gap-3 justify-start max-w-[95%] animate-fade-in">
                  <div className="w-8 h-8 rounded-full bg-orchid/5 border border-orchid/25 text-orchid flex items-center justify-center shrink-0 shadow-sm shadow-orchid/5">
                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="bg-[#1e1e1e] border border-white/5 p-3.5 rounded-2xl rounded-tl-sm flex-grow text-neutral-255 leading-relaxed text-xs">
                    {renderFormattedText(streamingText)}
                  </div>
                </div>
              )}

              {/* Agent Status Timeline banner */}
              {agentStatus && (
                <div className="flex gap-3 justify-start max-w-[95%] animate-fade-in">
                  <div className="w-8 h-8 rounded-full bg-orchid/5 border border-orchid/25 text-orchid flex items-center justify-center shrink-0 shadow-sm shadow-orchid/5">
                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="bg-[#1e1e1e] border border-white/5 p-3.5 rounded-2xl rounded-tl-sm flex-grow space-y-3">
                    <div className="font-sans font-bold text-neutral-200 text-xs select-none">
                      Thinking...
                    </div>
                    <p className="text-neutral-455 italic text-[11px] font-sans">
                      "{agentStatus}"
                    </p>
                    
                    {/* Visual planning roadmap logs */}
                    <div className="bg-[#1d1d1d] border border-white/5 rounded-xl p-3.5 max-w-[90%] space-y-2 mt-2 select-none">
                      <div className="font-bold text-neutral-350 text-[9px] uppercase tracking-wider font-sans">
                        Research Roadmap
                      </div>
                      <div className="space-y-1.5 text-[8.5px] text-neutral-500 font-mono">
                        <div className={`flex items-center gap-2 ${agentStatus.toLowerCase().includes('starting') || agentStatus.toLowerCase().includes('initial') ? 'text-orchid animate-pulse' : 'text-emerald-400 font-semibold'}`}>
                          <span>{agentStatus.toLowerCase().includes('starting') || agentStatus.toLowerCase().includes('initial') ? '●' : '✓'}</span> <span>01: Parse Query Objectives</span>
                        </div>
                        <div className={`flex items-center gap-2 ${agentStatus.toLowerCase().includes('search') ? 'text-orchid animate-pulse font-semibold' : agentStatus.toLowerCase().includes('starting') || agentStatus.toLowerCase().includes('initial') ? 'text-neutral-605 font-sans' : 'text-emerald-400'}`}>
                          <span>{agentStatus.toLowerCase().includes('search') ? '●' : agentStatus.toLowerCase().includes('starting') || agentStatus.toLowerCase().includes('initial') ? '○' : '✓'}</span> <span>02: Brave Search Queries</span>
                        </div>
                        <div className={`flex items-center gap-2 ${agentStatus.toLowerCase().includes('scraping') || agentStatus.toLowerCase().includes('page') ? 'text-orchid animate-pulse font-semibold' : agentStatus.toLowerCase().includes('synthesis') || agentStatus.toLowerCase().includes('pdf') || agentStatus.toLowerCase().includes('report') ? 'text-emerald-400' : 'text-neutral-605 font-sans'}`}>
                          <span>{agentStatus.toLowerCase().includes('scraping') || agentStatus.toLowerCase().includes('page') ? '●' : agentStatus.toLowerCase().includes('synthesis') || agentStatus.toLowerCase().includes('pdf') || agentStatus.toLowerCase().includes('report') ? '✓' : '○'}</span> <span>03: Data Extraction & Page Scrapes</span>
                        </div>
                        <div className={`flex items-center gap-2 ${agentStatus.toLowerCase().includes('synthesis') || agentStatus.toLowerCase().includes('pdf') || agentStatus.toLowerCase().includes('report') ? 'text-orchid animate-pulse font-semibold' : 'text-neutral-605 font-sans'}`}>
                          <span>{agentStatus.toLowerCase().includes('synthesis') || agentStatus.toLowerCase().includes('pdf') || agentStatus.toLowerCase().includes('report') ? '●' : '○'}</span> <span>04: Compile Comparison Matrix & PDF</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Composer Form Section */}
        <footer className="p-4 md:p-6 bg-[#181818] shrink-0">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSubmit} className="bg-[#151515] border border-white/5 rounded-xl px-4 py-2.5 flex items-center justify-between shadow-lg focus-within:border-orchid transition-all duration-200">
              <input
                type="text"
                placeholder={hasKeys ? "Ask follow-up questions..." : "Configure API key to write prompts..."}
                value={composerInput}
                onChange={(e) => setComposerInput(e.target.value)}
                disabled={isStreaming || !hasKeys}
                className="flex-1 bg-transparent focus:outline-none text-xs text-neutral-205 pr-4 leading-relaxed font-sans placeholder-neutral-500"
              />
              <button
                type="submit"
                disabled={isStreaming || !composerInput.trim() || !hasKeys}
                className="text-neutral-500 hover:text-orchid disabled:text-neutral-700 disabled:opacity-40 transition-colors cursor-pointer p-1 rounded-lg active:scale-[0.90] hover:scale-[1.05]"
              >
                {isStreaming ? (
                  <Loader2 className="w-4 h-4 animate-spin text-orchid" />
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                )}
              </button>
            </form>
          </div>
        </footer>

        {/* Custom In-App Modal Dialog */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in font-sans p-4">
            <div className="bg-[#181818] border border-white/10 rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-scale-up space-y-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl border ${
                  modalType === 'error'
                    ? 'bg-rose-950/20 text-rose-400 border-rose-900/30'
                    : modalType === 'success'
                    ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/30'
                    : 'bg-orchid/10 text-orchid border-orchid/20'
                }`}>
                  {modalType === 'error' ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  ) : modalType === 'success' ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <h3 className="text-sm font-bold text-neutral-200 font-serif">{modalTitle}</h3>
              </div>
              
              <p className="text-[11px] text-neutral-400 leading-relaxed break-words font-sans">
                {modalMessage}
              </p>
              
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className={`w-full py-2 rounded-xl text-xs font-bold transition shadow-md active:scale-[0.98] cursor-pointer ${
                  modalType === 'error'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : modalType === 'success'
                    ? 'bg-emerald-650 hover:bg-emerald-555 text-white'
                    : 'bg-orchid hover:bg-orchid/90 text-charcoal'
                }`}
              >
                OK
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex-grow bg-charcoal text-neutral-400 flex flex-col items-center justify-center h-screen font-sans">
        <Loader2 className="h-8 w-8 animate-spin text-orchid mb-2" />
        <span className="text-xs">Loading Workspace...</span>
      </div>
    }>
      <ChatComponent />
    </Suspense>
  );
}
