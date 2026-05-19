'use client';

import Sidebar from '@/components/Sidebar';
import {
  ArrowLeft, Headphones, Phone, FileAudio, CheckCircle2, RefreshCw,
  AlertCircle, Loader2, Hash, TrendingUp, MessageCircle, Clock
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface AgentInfo {
  agent_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  is_active: boolean;
  created_at: string;
}

interface AgentStats {
  total_calls: number;
  avg_qa: number | null;
  avg_csat: number | null;
  positive_calls: number;
  neutral_calls: number;
  negative_calls: number;
}

interface CallRecord {
  file_id: string;
  original_filename: string;
  customer_phone: string;
  call_direction: string;
  call_date: string;
  status: string;
  duration_seconds: number;
  sentiment: string | null;
  qa_score: number | null;
  csat_score: number | null;
  intent: string;
  brand_names: string[];
  summary_text: string;
}

export default function AgentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const agentId = params.id as string;

  const [agent, setAgent] = useState<AgentInfo | null>(null);
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agentId) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/api/v1/agents/detail/${encodeURIComponent(agentId)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setAgent(data.agent);
        setStats(data.stats);
        setCalls(data.calls || []);
      } catch {
        setError('ไม่พบ agent นี้ หรือไม่สามารถเชื่อมต่อ API ได้');
      } finally {
        setLoading(false);
      }
    })();
  }, [agentId]);

  const formatDate = (s: string) => {
    if (!s) return '-';
    try {
      return new Date(s).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch { return s; }
  };

  const formatDuration = (sec: number) => {
    if (!sec) return '-';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const qaColor = (qa: number | null) => {
    if (qa === null) return 'text-slate-400 dark:text-slate-500';
    if (qa >= 8) return 'text-emerald-600 dark:text-emerald-400';
    if (qa >= 6) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-500';
  };

  const csatColor = (csat: number | null) => {
    if (csat === null) return 'text-slate-400 dark:text-slate-500';
    if (csat >= 4) return 'text-emerald-600 dark:text-emerald-400';
    if (csat >= 3) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-500';
  };

  const sentimentBadge = (s: string | null) => {
    const lc = (s || '').toLowerCase();
    if (lc === 'positive') return { label: 'POSITIVE', cls: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' };
    if (lc === 'negative') return { label: 'NEGATIVE', cls: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' };
    if (lc === 'neutral')  return { label: 'NEUTRAL',  cls: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300' };
    return { label: '-', cls: 'bg-slate-50 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500' };
  };

  const statusBadge = (status: string) => {
    if (status === 'analyzed') return { label: 'COMPLETE', cls: 'text-emerald-500', icon: <CheckCircle2 size={14} /> };
    if (status === 'failed')   return { label: 'FAILED',   cls: 'text-red-500', icon: <AlertCircle size={14} /> };
    return { label: 'PROCESSING', cls: 'text-orange-500', icon: <RefreshCw size={14} className="animate-spin" /> };
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 size={32} className="animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400">กำลังโหลดข้อมูล Agent...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle size={32} className="text-red-500 mx-auto mb-3" />
            <p className="text-sm text-red-600 dark:text-red-400">{error || 'ไม่พบ agent'}</p>
            <button onClick={() => router.push('/agents')} className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
              กลับไปหน้า Agents
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Back */}
          <button
            onClick={() => router.push('/agents')}
            className="flex items-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer group"
          >
            <ArrowLeft size={18} className="mr-1.5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-[13px] font-bold">Back to Agents</span>
          </button>

          {/* Header — Agent Info */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 font-bold text-lg">
                {agent.first_name.charAt(0)}{agent.last_name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 truncate">
                  {agent.full_name}
                </h1>
                <div className="flex items-center gap-4 mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                  <span className="font-mono flex items-center gap-1.5">
                    <Hash size={13} className="text-slate-400 dark:text-slate-500" />
                    {agent.agent_id}
                  </span>
                  {agent.phone && (
                    <span className="font-mono flex items-center gap-1.5">
                      <Phone size={13} className="text-slate-400 dark:text-slate-500" />
                      {agent.phone}
                    </span>
                  )}
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                    agent.is_active
                      ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}>
                    {agent.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 bg-slate-50 dark:bg-slate-700/40 rounded-xl flex items-center justify-center text-slate-400 dark:text-slate-500 shrink-0">
                <Headphones size={22} />
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-4 shadow-sm">
              <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 mb-2">
                <FileAudio size={16} />
              </div>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Calls</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats?.total_calls ?? 0}</p>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-4 shadow-sm">
              <div className="w-8 h-8 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-2">
                <TrendingUp size={16} />
              </div>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Avg QA</p>
              <p className={`text-2xl font-bold ${qaColor(stats?.avg_qa ?? null)}`}>
                {stats?.avg_qa !== null && stats?.avg_qa !== undefined ? stats.avg_qa : '-'}
                {stats?.avg_qa !== null && stats?.avg_qa !== undefined && (
                  <span className="text-xs font-normal text-slate-400 dark:text-slate-500 ml-0.5">/10</span>
                )}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-4 shadow-sm">
              <div className="w-8 h-8 bg-amber-50 dark:bg-amber-900/30 rounded-lg flex items-center justify-center text-amber-600 dark:text-amber-400 mb-2">
                <CheckCircle2 size={16} />
              </div>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Avg CSAT</p>
              <p className={`text-2xl font-bold ${csatColor(stats?.avg_csat ?? null)}`}>
                {stats?.avg_csat !== null && stats?.avg_csat !== undefined ? stats.avg_csat : '-'}
                {stats?.avg_csat !== null && stats?.avg_csat !== undefined && (
                  <span className="text-xs font-normal text-slate-400 dark:text-slate-500 ml-0.5">/5</span>
                )}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-4 shadow-sm">
              <div className="w-8 h-8 bg-violet-50 dark:bg-violet-900/30 rounded-lg flex items-center justify-center text-violet-600 dark:text-violet-400 mb-2">
                <MessageCircle size={16} />
              </div>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sentiment</p>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1 flex gap-2">
                <span className="text-emerald-600 dark:text-emerald-400">+{stats?.positive_calls ?? 0}</span>
                <span className="text-slate-500 dark:text-slate-400">·{stats?.neutral_calls ?? 0}</span>
                <span className="text-red-500">-{stats?.negative_calls ?? 0}</span>
              </p>
            </div>
          </div>

          {/* Call Log */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileAudio className="text-slate-800 dark:text-slate-100" size={20} />
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Call Log</h2>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {calls.length} สาย
              </span>
            </div>

            {calls.length === 0 ? (
              <div className="p-12 text-center text-slate-400 dark:text-slate-500">
                <FileAudio size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">ยังไม่มีรายการสาย</p>
                <p className="text-xs mt-1">รายการจะปรากฏเมื่อ agent นี้รับสายและระบบวิเคราะห์เสร็จ</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50 dark:divide-slate-700">
                {calls.map((call) => {
                  const sb = sentimentBadge(call.sentiment);
                  const stb = statusBadge(call.status);
                  return (
                    <div
                      key={call.file_id}
                      onClick={() => router.push(`/files/${call.file_id}`)}
                      className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/40 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-start gap-4">
                        {/* Date col */}
                        <div className="w-32 shrink-0">
                          <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                            {formatDate(call.call_date)}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                            <Clock size={10} />
                            {formatDuration(call.duration_seconds)}
                          </p>
                        </div>

                        {/* Main info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full ${
                              call.call_direction === 'Inbound'
                                ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                : call.call_direction === 'Outbound'
                                  ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                            }`}>
                              {call.call_direction}
                            </span>
                            <span className="text-sm font-mono text-slate-700 dark:text-slate-200">
                              {call.customer_phone}
                            </span>
                            {call.brand_names && call.brand_names.length > 0 && (
                              <div className="flex gap-1">
                                {call.brand_names.map((b, i) => (
                                  <span key={i} className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-bold rounded">
                                    {b}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate group-hover:text-slate-700 dark:group-hover:text-slate-200">
                            {call.intent || call.summary_text || call.original_filename}
                          </p>
                        </div>

                        {/* QA / CSAT */}
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-center">
                            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">QA</p>
                            <p className={`text-sm font-bold ${qaColor(call.qa_score)}`}>
                              {call.qa_score !== null ? call.qa_score : '-'}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">CSAT</p>
                            <p className={`text-sm font-bold ${csatColor(call.csat_score)}`}>
                              {call.csat_score !== null ? call.csat_score : '-'}
                            </p>
                          </div>
                          <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${sb.cls}`}>
                            {sb.label}
                          </span>
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${stb.cls}`}>
                            {stb.icon}
                            {stb.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
