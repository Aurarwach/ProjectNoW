'use client';

import Sidebar from '@/components/Sidebar';
import { Search, RotateCw, Headphones, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, Phone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Agent {
  agent_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  is_active: boolean;
  total_calls: number;
  avg_qa: number | null;
  avg_csat: number | null;
  positive_calls: number;
  neutral_calls: number;
  negative_calls: number;
}

type SortKey = 'qa' | 'csat' | 'name';
type SortOrder = 'asc' | 'desc';

export default function AgentsPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('qa');
  const [order, setOrder] = useState<SortOrder>('desc');

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ sort_by: sortBy, order });
      if (search) params.set('search', search);
      const res = await fetch(`${API_BASE}/api/v1/agents/list?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAgents(data.agents || []);
    } catch {
      setError('ไม่สามารถเชื่อมต่อ API ได้');
      setAgents([]);
    } finally {
      setLoading(false);
    }
  }, [search, sortBy, order]);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  // กดที่ header ในตาราง → toggle sort
  const toggleSort = (key: SortKey) => {
    if (sortBy === key) {
      setOrder(order === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(key);
      setOrder('desc');
    }
  };

  const SortIcon = ({ active, order }: { active: boolean; order: SortOrder }) => {
    if (!active) return <ArrowUpDown size={12} className="text-slate-300 dark:text-slate-600" />;
    return order === 'desc'
      ? <ArrowDown size={12} className="text-blue-600 dark:text-blue-400" />
      : <ArrowUp size={12} className="text-blue-600 dark:text-blue-400" />;
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

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span className="text-blue-600 dark:text-blue-400"><Headphones size={24} /></span>
              Agents
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              ทั้งหมด <span className="font-bold text-slate-800 dark:text-slate-100">{agents.length}</span> คน
            </p>
          </div>

          {/* Toolbar */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-t-2xl flex items-center space-x-4 shadow-sm border-b border-slate-100 dark:border-slate-700">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={20} />
              <input
                type="text"
                placeholder="ค้นหาด้วย ชื่อ, นามสกุล หรือ รหัส agent..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 text-sm dark:text-slate-200"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              onClick={fetchAgents}
              className="p-3 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors"
              title="Refresh"
            >
              <RotateCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Sort Pills */}
          <div className="bg-white dark:bg-slate-800 px-4 py-3 flex items-center space-x-2 shadow-sm border-b border-slate-100 dark:border-slate-700">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-2">เรียงตาม:</span>
            {([
              { key: 'qa' as const, label: 'QA Score' },
              { key: 'csat' as const, label: 'CSAT' },
              { key: 'name' as const, label: 'ชื่อ' },
            ]).map((opt) => {
              const active = sortBy === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => toggleSort(opt.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    active
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 border border-transparent'
                  }`}
                >
                  {opt.label}
                  <SortIcon active={active} order={order} />
                </button>
              );
            })}
            <span className="text-[11px] text-slate-400 dark:text-slate-500 ml-auto">
              {order === 'desc' ? 'มาก → น้อย' : 'น้อย → มาก'}
            </span>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 m-4 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Table */}
          <div className="bg-white dark:bg-slate-800 rounded-b-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
                  <th className="p-4 pl-6">Agent</th>
                  <th className="p-4">เบอร์โทร</th>
                  <th className="p-4 text-center">
                    <button onClick={() => toggleSort('qa')} className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                      QA <SortIcon active={sortBy === 'qa'} order={order} />
                    </button>
                  </th>
                  <th className="p-4 text-center">
                    <button onClick={() => toggleSort('csat')} className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                      CSAT <SortIcon active={sortBy === 'csat'} order={order} />
                    </button>
                  </th>
                  <th className="p-4 text-center">จำนวนสาย</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400 dark:text-slate-500">
                      <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
                      <p className="text-sm">กำลังโหลด...</p>
                    </td>
                  </tr>
                ) : agents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400 dark:text-slate-500">
                      <Headphones size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm font-medium">ไม่พบ agent</p>
                      <p className="text-xs mt-1">ลองค้นหาด้วยคำอื่น</p>
                    </td>
                  </tr>
                ) : (
                  agents.map((a) => (
                    <tr
                      key={a.agent_id}
                      onClick={() => router.push(`/agents/${a.agent_id}`)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer group"
                    >
                      <td className="p-4 pl-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 font-bold text-xs">
                            {a.first_name.charAt(0)}{a.last_name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">
                              {a.full_name}
                            </p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                              {a.agent_id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-300 font-mono">
                        {a.phone ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Phone size={12} className="text-slate-400 dark:text-slate-500" />
                            {a.phone}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`text-base font-bold ${qaColor(a.avg_qa)}`}>
                          {a.avg_qa !== null ? `${a.avg_qa}` : '-'}
                          {a.avg_qa !== null && <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500 ml-0.5">/10</span>}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`text-base font-bold ${csatColor(a.avg_csat)}`}>
                          {a.avg_csat !== null ? `${a.avg_csat}` : '-'}
                          {a.avg_csat !== null && <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500 ml-0.5">/5</span>}
                        </span>
                      </td>
                      <td className="p-4 text-center text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {a.total_calls}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
