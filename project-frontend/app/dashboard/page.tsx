'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import { useRouter } from 'next/navigation';
import {
  FileAudio, CheckCircle2, RefreshCw, AlertTriangle,
  RotateCw, Smile, Meh, Frown, Hash, Lightbulb, Tag,
  Headphones, AlertCircle, Download
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ----- types -----
interface SentimentDist { positive: number; neutral: number; negative: number }
interface TopicItem    { topic: string; count: number; percentage: number }
interface KeywordItem  { keyword: string; count: number; percentage: number }
interface BrandItem    { brand: string; count: number; percentage: number }
interface BrandIssue   { topic: string; count: number }
interface AgentItem {
  agent_id: string; full_name: string;
  total_calls: number; avg_qa: number | null; avg_csat: number | null;
  positive_calls: number; neutral_calls: number; negative_calls: number;
}
interface InsightsData {
  period: string;
  ref_date: string;
  kpi: { total_files: number; analyzed: number; processing: number; failed: number };
  sentiment_distribution: SentimentDist;
  topic_distribution: TopicItem[];
  keyword_frequency: KeywordItem[];
  brand_volume: BrandItem[];
  brand_issues: Record<string, BrandIssue[]>;
  agent_performance: AgentItem[];
}

type Period = 'day' | 'month' | 'year' | 'all';
type BrandView = 'volume' | 'issues';

const TOPIC_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#F97316'];
const BRAND_COLORS = [
  { bar: '#F97316' }, { bar: '#3B82F6' }, { bar: '#10B981' },
  { bar: '#EC4899' }, { bar: '#8B5CF6' }, { bar: '#F59E0B' },
];

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('all');
  const [brandView, setBrandView] = useState<BrandView>('volume');
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

  // ===== date selection per period =====
  const todayISO   = new Date().toISOString().slice(0, 10);  // YYYY-MM-DD
  const monthISO   = todayISO.slice(0, 7);                    // YYYY-MM
  const yearStr    = todayISO.slice(0, 4);                    // YYYY
  const [selectedDay,   setSelectedDay]   = useState<string>(todayISO);
  const [selectedMonth, setSelectedMonth] = useState<string>(monthISO);
  const [selectedYear,  setSelectedYear]  = useState<string>(yearStr);
  const [availableYears, setAvailableYears] = useState<string[]>([yearStr]);

  // ===== export =====
  const [showExport, setShowExport] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // โหลด available years ครั้งเดียวตอน mount
  useEffect(() => {
    (async () => {
      // เริ่มจาก 5 ปีย้อนหลัง (รวมปีปัจจุบัน) — ผู้ใช้เลือกได้แม้ DB ยังไม่มีข้อมูลปีนั้น
      const currentYear = new Date().getFullYear();
      const fallback: string[] = [];
      for (let y = currentYear; y >= currentYear - 4; y--) fallback.push(String(y));

      try {
        const res = await fetch(`${API_BASE}/api/v1/dashboard/insights/available-years`);
        if (res.ok) {
          const j = await res.json();
          if (Array.isArray(j.years)) {
            // รวมปีจาก DB + fallback แล้วเรียงใหม่→เก่า
            const merged = Array.from(new Set([...j.years.map(String), ...fallback]))
              .sort((a, b) => Number(b) - Number(a));
            setAvailableYears(merged);
            return;
          }
        }
      } catch { /* fall through */ }
      setAvailableYears(fallback);
    })();
  }, []);

  // Close export menu เมื่อคลิกนอก
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setShowExport(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ค่า date ที่จะส่งไป backend ตาม period
  const currentDateParam = useMemo(() => {
    if (period === 'day')   return selectedDay;
    if (period === 'month') return selectedMonth;
    if (period === 'year')  return selectedYear;
    return '';
  }, [period, selectedDay, selectedMonth, selectedYear]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const insightsUrl = period === 'all'
        ? `${API_BASE}/api/v1/dashboard/insights?period=all`
        : `${API_BASE}/api/v1/dashboard/insights?period=${period}&date=${encodeURIComponent(currentDateParam)}`;
      const insightsRes = await fetch(insightsUrl);
      if (insightsRes.ok) {
        const d: InsightsData = await insightsRes.json();
        setData(d);
        if (!selectedBrand && d.brand_volume.length > 0) {
          setSelectedBrand(d.brand_volume[0].brand);
        }
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  // ดึงข้อมูลใหม่เมื่อ period หรือค่า date เปลี่ยน
  useEffect(() => { fetchAll(); /* eslint-disable-next-line */ }, [period, currentDateParam]);

  const C = 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700';
  const T = 'text-slate-800 dark:text-slate-100';
  const S = 'text-slate-500 dark:text-slate-400';
  const S2 = 'text-slate-400 dark:text-slate-500';

  const kpi = data?.kpi;
  const sentiments = data?.sentiment_distribution || { positive: 0, neutral: 0, negative: 0 };
  const sentMax = Math.max(sentiments.positive, sentiments.neutral, sentiments.negative, 1);
  const topicTotal = useMemo(() => data?.topic_distribution.reduce((s, t) => s + t.count, 0) || 0, [data]);

  const donutSegments = useMemo(() => {
    if (!data || topicTotal === 0) return [];
    let cumPct = 0;
    const cx = 60, cy = 60, r = 45;
    return data.topic_distribution.slice(0, 8).map((t, i) => {
      const pct = t.count / topicTotal;
      const startAngle = cumPct * 2 * Math.PI;
      const endAngle = (cumPct + pct) * 2 * Math.PI;
      cumPct += pct;
      const x1 = cx + r * Math.sin(startAngle);
      const y1 = cy - r * Math.cos(startAngle);
      const x2 = cx + r * Math.sin(endAngle);
      const y2 = cy - r * Math.cos(endAngle);
      const largeArc = pct > 0.5 ? 1 : 0;
      return {
        d: `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
        color: TOPIC_COLORS[i % TOPIC_COLORS.length],
        topic: t.topic,
        count: t.count,
        percentage: t.percentage,
      };
    });
  }, [data, topicTotal]);

  const topKeyword = data?.keyword_frequency[0];
  const currentBrandIssues = selectedBrand && data?.brand_issues[selectedBrand]
    ? data.brand_issues[selectedBrand]
    : [];
  const brandIssuesTotal = currentBrandIssues.reduce((s, it) => s + it.count, 0);

  const qaColor = (qa: number | null) => {
    if (qa === null) return S2;
    if (qa >= 8) return 'text-emerald-600 dark:text-emerald-400';
    if (qa >= 6) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-500';
  };
  const csatColor = (c: number | null) => {
    if (c === null) return S2;
    if (c >= 4) return 'text-emerald-600 dark:text-emerald-400';
    if (c >= 3) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-500';
  };

  // Export handler
  const handleExport = (type: 'calls' | 'agents', format: 'xlsx' | 'csv') => {
    const url = `${API_BASE}/api/v1/dashboard/export-${type}?format=${format}`;
    window.open(url, '_blank');
    setShowExport(false);
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-full mx-auto">

          {/* Header */}
          <div className="flex justify-between items-center mb-5">
            <div>
              <h1 className={`text-xl font-bold ${T}`}>Voice Analytics Dashboard</h1>
              <p className={`text-xs ${S2}`}>ข้อมูลจาก AI Analysis (real-time)</p>
            </div>

            {/* ขวาบน: [Period+Date] [Export] [Refresh] — เว้นระยะกันชนธีม */}
            <div className="flex items-center gap-2 mr-12">

              {/* Period Pills */}
              <div className="flex items-center gap-0.5 bg-slate-50 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-100 dark:border-slate-700">
                {([
                  { v: 'day' as const, label: 'วัน' },
                  { v: 'month' as const, label: 'เดือน' },
                  { v: 'year' as const, label: 'ปี' },
                  { v: 'all' as const, label: 'ทั้งหมด' },
                ]).map(opt => (
                  <button
                    key={opt.v}
                    onClick={() => setPeriod(opt.v)}
                    className={`px-3 py-1.5 text-[11px] font-bold rounded-lg cursor-pointer transition-colors ${
                      period === opt.v
                        ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                        : `${S} hover:bg-slate-100 dark:hover:bg-slate-800`
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Date picker (เฉพาะ day / month / year) */}
              {period === 'day' && (
                <input
                  type="date"
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value || todayISO)}
                  className={`px-3 py-2 ${C} border rounded-xl text-xs ${T} outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 cursor-pointer shadow-sm`}
                />
              )}
              {period === 'month' && (
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value || monthISO)}
                  className={`px-3 py-2 ${C} border rounded-xl text-xs ${T} outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 cursor-pointer shadow-sm`}
                />
              )}
              {period === 'year' && (
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className={`px-3 py-2 ${C} border rounded-xl text-xs font-medium ${T} outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 cursor-pointer shadow-sm`}
                >
                  {availableYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              )}

              {/* Export Dropdown */}
              <div className="relative" ref={exportRef}>
                <button
                  onClick={() => setShowExport(!showExport)}
                  className={`flex items-center gap-2 px-3 py-2 ${C} border rounded-xl text-xs ${S} hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors shadow-sm`}
                >
                  <Download size={16} /> Export
                </button>
                {showExport && (
                  <div className={`absolute right-0 mt-1 w-52 ${C} border rounded-xl shadow-lg z-10 overflow-hidden`}>
                    <button onClick={() => handleExport('calls', 'xlsx')} className="w-full text-left px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors flex items-center gap-2">
                      <Download size={14} /> Call Analysis (XLSX)
                    </button>
                    <button onClick={() => handleExport('calls', 'csv')} className="w-full text-left px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors flex items-center gap-2 border-t border-slate-100 dark:border-slate-700">
                      <Download size={14} /> Call Analysis (CSV)
                    </button>
                    <button onClick={() => handleExport('agents', 'xlsx')} className="w-full text-left px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors flex items-center gap-2 border-t border-slate-100 dark:border-slate-700">
                      <Download size={14} /> Agent Performance (XLSX)
                    </button>
                    <button onClick={() => handleExport('agents', 'csv')} className="w-full text-left px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors flex items-center gap-2 border-t border-slate-100 dark:border-slate-700">
                      <Download size={14} /> Agent Performance (CSV)
                    </button>
                  </div>
                )}
              </div>

              {/* Refresh */}
              <button onClick={() => fetchAll()} className={`flex items-center gap-2 px-3 py-2 ${C} border rounded-xl text-xs ${S} hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors shadow-sm`}>
                <RotateCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>
          </div>

          {/* Row 1: KPI Cards */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            {[
              { label: 'Total Files', value: kpi?.total_files || 0, icon: <FileAudio size={18} />, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30' },
              { label: 'Analyzed',    value: kpi?.analyzed || 0,    icon: <CheckCircle2 size={18} />, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
              { label: 'Processing',  value: kpi?.processing || 0,  icon: <RefreshCw size={18} />, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/30' },
              { label: 'Failed',      value: kpi?.failed || 0,      icon: <AlertTriangle size={18} />, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/30' },
            ].map((card) => (
              <div key={card.label} className={`${C} border rounded-xl p-4 shadow-sm`}>
                <div className={`w-8 h-8 ${card.bg} rounded-lg flex items-center justify-center ${card.color} mb-2`}>{card.icon}</div>
                <p className={`text-[10px] font-bold ${S} uppercase tracking-wider`}>{card.label}</p>
                <p className={`text-2xl font-bold ${T}`}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* Row 2: Sentiment + Topic Distribution */}
          <div className="grid grid-cols-3 gap-4 mb-5">

            {/* Sentiment Distribution */}
            <div className={`${C} border rounded-2xl p-5 shadow-sm col-span-2`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1 h-4 bg-orange-400 rounded" />
                <h2 className={`text-sm font-bold ${T}`}>Sentiment Analysis Distribution</h2>
              </div>
              <p className={`text-[11px] ${S2} mb-5`}>การกระจายของอารมณ์ลูกค้าจากสายทั้งหมด</p>

              <div className="space-y-3">
                {[
                  { label: 'POSITIVE', count: sentiments.positive, color: 'bg-emerald-500', bgLight: 'bg-emerald-50 dark:bg-emerald-900/10', icon: <Smile size={18} />, iconColor: 'text-emerald-500' },
                  { label: 'NEUTRAL',  count: sentiments.neutral,  color: 'bg-slate-500',   bgLight: 'bg-slate-100 dark:bg-slate-700/50', icon: <Meh size={18} />,   iconColor: 'text-slate-500' },
                  { label: 'NEGATIVE', count: sentiments.negative, color: 'bg-red-500',     bgLight: 'bg-red-50 dark:bg-red-900/10',     icon: <Frown size={18} />, iconColor: 'text-red-500' },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-3">
                    <div className="w-14 text-center shrink-0">
                      <div className={`${s.iconColor} mx-auto mb-0.5 flex justify-center`}>{s.icon}</div>
                      <p className={`text-[9px] font-bold ${S} tracking-wider`}>{s.label}</p>
                    </div>
                    <div className={`flex-1 h-7 ${s.bgLight} rounded-full overflow-hidden relative`}>
                      <div
                        className={`h-full ${s.color} rounded-full flex items-center justify-end pr-3 transition-all`}
                        style={{ width: `${Math.max((s.count / sentMax) * 100, 6)}%`, minWidth: '40px' }}
                      >
                        <span className="text-[11px] font-bold text-white">{s.count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Topic Distribution */}
            <div className={`${C} border rounded-2xl p-5 shadow-sm`}>
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="w-1 h-4 bg-pink-400 rounded" />
                  <h2 className={`text-sm font-bold ${T}`}>Topic Distribution</h2>
                </div>
                <span className="px-2 py-0.5 text-[9px] font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 rounded-full">
                  {data?.topic_distribution.length || 0} Topics
                </span>
              </div>
              <p className={`text-[11px] ${S2} mb-3`}>สัดส่วนหัวข้อที่ลูกค้าติดต่อเข้ามา</p>

              {topicTotal > 0 ? (
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <svg width="120" height="120" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="45" fill="none" stroke="currentColor" className="text-slate-100 dark:text-slate-700" strokeWidth="18" />
                      {donutSegments.map((seg, i) => (
                        <path key={i} d={seg.d} fill="none" stroke={seg.color} strokeWidth="18" />
                      ))}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p className={`text-lg font-bold ${T}`}>{topicTotal}</p>
                      <p className={`text-[9px] ${S2}`}>Files</p>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 max-h-[150px] overflow-y-auto space-y-1.5">
                    {donutSegments.map((seg, i) => (
                      <button
                        key={i}
                        onClick={() => router.push(`/files?topic=${encodeURIComponent(seg.topic)}`)}
                        className="flex items-center gap-1.5 w-full text-left px-1.5 py-1 -mx-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer transition-colors group"
                        title={`ดูไฟล์ที่มี topic: ${seg.topic}`}
                      >
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                        <span className={`text-[10px] flex-1 truncate ${T} group-hover:text-blue-600 dark:group-hover:text-blue-400`}>{seg.topic}</span>
                        <span className={`text-[10px] font-bold ${S2}`}>{seg.percentage}%</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className={`text-xs ${S2}`}>ไม่มีข้อมูลในช่วงเวลานี้</p>
                </div>
              )}
            </div>
          </div>

          {/* Row 3: Keyword Frequency (Top 10) */}
          <div className={`${C} border rounded-2xl p-5 shadow-sm mb-5`}>
            <div className="flex items-center gap-2 mb-1">
              <Hash className="text-blue-500" size={18} />
              <h2 className={`text-sm font-bold ${T}`}>Keyword Frequency (Top 10)</h2>
            </div>
            <p className={`text-[11px] ${S2} mb-5`}>แสดง 10 คำที่ถูกกล่าวถึงมากที่สุดในช่วงเวลาที่เลือก</p>

            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 space-y-2">
                {(data?.keyword_frequency || []).length === 0 ? (
                  <p className={`text-xs ${S2} text-center py-8`}>ไม่มีข้อมูล keywords</p>
                ) : (
                  data!.keyword_frequency.map((kw, i) => (
                    <div key={kw.keyword} className="flex items-center gap-3">
                      <span className={`w-5 text-[11px] font-bold ${S2} text-center shrink-0`}>{i + 1}</span>
                      <span className={`w-28 text-[12px] ${T} truncate shrink-0`}>{kw.keyword}</span>
                      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${Math.max(kw.percentage, 2)}%` }}
                        />
                      </div>
                      <span className={`text-[11px] font-bold ${S} w-10 text-right shrink-0`}>{kw.percentage}%</span>
                    </div>
                  ))
                )}
              </div>

              <div className="bg-blue-50/40 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-5 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center mb-3 shadow-sm">
                  <Lightbulb size={20} className="text-blue-500" />
                </div>
                <div className="px-3 py-1 bg-white dark:bg-slate-800 rounded-full border border-blue-100 dark:border-blue-900/30 mb-4">
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">Key Insight</span>
                </div>
                {topKeyword ? (
                  <>
                    <p className={`text-xs ${S}`}>คำว่า <span className={`font-bold ${T}`}>&ldquo;{topKeyword.keyword}&rdquo;</span></p>
                    <p className={`text-xs ${S} mt-1`}>ถูกกล่าวถึงมากที่สุด</p>
                    <p className={`text-xs ${S}`}>คิดเป็น <span className="font-bold text-blue-600 dark:text-blue-400">{topKeyword.percentage}%</span> ของทั้งหมด</p>
                  </>
                ) : (
                  <p className={`text-xs ${S2}`}>ยังไม่มี keyword ที่บ่งชี้</p>
                )}
              </div>
            </div>
          </div>

          {/* Row 4: Find by Brand / Brand Issues */}
          <div className={`${C} border rounded-2xl p-5 shadow-sm mb-5`}>
            <div className="flex items-start justify-between mb-1">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-1 h-4 bg-orange-400 rounded" />
                  <h2 className={`text-sm font-bold ${T}`}>
                    {brandView === 'volume' ? 'Find by Brand' : 'Brand Issues'}
                  </h2>
                </div>
                <p className={`text-[11px] ${S2}`}>
                  {brandView === 'volume'
                    ? 'ดูว่าแบรนด์ไหนถูกโทรมาบ่อยที่สุด'
                    : 'หัวข้อปัญหาที่พบบ่อยของแต่ละแบรนด์'}
                </p>
              </div>
              <div className="flex bg-slate-50 dark:bg-slate-900/50 p-1 rounded-lg">
                <button
                  onClick={() => setBrandView('volume')}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-md cursor-pointer transition-colors ${
                    brandView === 'volume'
                      ? 'bg-white dark:bg-slate-700 text-orange-500 shadow-sm'
                      : `${S} hover:bg-slate-100 dark:hover:bg-slate-800`
                  }`}
                >
                  Find by Brand
                </button>
                <button
                  onClick={() => setBrandView('issues')}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-md cursor-pointer transition-colors ${
                    brandView === 'issues'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : `${S} hover:bg-slate-100 dark:hover:bg-slate-800`
                  }`}
                >
                  Brand Issues
                </button>
              </div>
            </div>

            {brandView === 'volume' && (
              <>
                <div className="flex items-center gap-2 mt-4 mb-4">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full text-[11px] font-bold">
                    <Tag size={11} />
                    {data?.brand_volume.length || 0} Brands
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-700/50 ${S} rounded-full text-[11px] font-bold`}>
                    <FileAudio size={11} />
                    {data?.brand_volume.reduce((s, b) => s + b.count, 0) || 0} Files
                  </span>
                </div>

                {(data?.brand_volume || []).length === 0 ? (
                  <p className={`text-xs ${S2} text-center py-8`}>ยังไม่มีข้อมูลแบรนด์</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {data!.brand_volume.map((b, i) => {
                      const c = BRAND_COLORS[i % BRAND_COLORS.length];
                      return (
                        <div key={b.brand} className="bg-slate-50/50 dark:bg-slate-900/30 rounded-xl p-4 border border-slate-100 dark:border-slate-700/50">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold ${S2}`}>{(i + 1).toString().padStart(2, '0')}</span>
                              <span className={`text-[13px] font-bold tracking-wider ${T} uppercase`}>{b.brand}</span>
                            </div>
                            <div className="text-right">
                              <p className={`text-xl font-bold ${T} leading-none`}>{b.count}</p>
                              <p className={`text-[10px] ${S2}`}>files</p>
                            </div>
                          </div>
                          <p className={`text-[10px] ${S2} mb-2`}>{b.percentage}% of visible recordings</p>
                          <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${b.percentage}%`, backgroundColor: c.bar }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {brandView === 'issues' && (
              <>
                <div className="flex items-center gap-2 flex-wrap mt-4 mb-4">
                  {(data?.brand_volume || []).length === 0 ? (
                    <p className={`text-xs ${S2}`}>ยังไม่มีข้อมูลแบรนด์</p>
                  ) : (
                    data!.brand_volume.map((b, i) => {
                      const c = BRAND_COLORS[i % BRAND_COLORS.length];
                      const isSelected = selectedBrand === b.brand;
                      return (
                        <button
                          key={b.brand}
                          onClick={() => setSelectedBrand(b.brand)}
                          className={`px-3 py-1.5 text-[11px] font-bold rounded-full border cursor-pointer transition-colors ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                              : `border-slate-200 dark:border-slate-600 ${S} hover:bg-slate-50 dark:hover:bg-slate-700`
                          }`}
                        >
                          <span className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle" style={{ backgroundColor: c.bar }} />
                          {b.brand}
                          <span className={`ml-1.5 ${S2}`}>({b.count})</span>
                        </button>
                      );
                    })
                  )}
                </div>

                {selectedBrand && currentBrandIssues.length > 0 ? (
                  <div className="bg-slate-50/50 dark:bg-slate-900/30 rounded-xl p-4 border border-slate-100 dark:border-slate-700/50">
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                      <p className={`text-xs font-bold ${T}`}>หัวข้อปัญหาที่พบบ่อยของ <span className="text-blue-600 dark:text-blue-400">{selectedBrand}</span></p>
                      <span className={`text-[10px] ${S2}`}>Top {currentBrandIssues.length}</span>
                    </div>
                    <div className="space-y-2.5">
                      {currentBrandIssues.map((issue, i) => {
                        const pct = brandIssuesTotal > 0 ? Math.round((issue.count / brandIssuesTotal) * 100) : 0;
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <span className={`w-5 text-[11px] font-bold ${S2} text-center`}>{i + 1}</span>
                            <span className={`text-[12px] ${T} w-48 truncate shrink-0`}>{issue.topic}</span>
                            <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.max(pct, 3)}%` }} />
                            </div>
                            <span className={`text-[11px] font-bold ${T} w-12 text-right`}>{issue.count} ครั้ง</span>
                            <span className={`text-[10px] ${S2} w-10 text-right`}>{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : selectedBrand ? (
                  <div className="bg-slate-50/50 dark:bg-slate-900/30 rounded-xl p-8 border border-slate-100 dark:border-slate-700/50 text-center">
                    <AlertCircle size={20} className={`mx-auto mb-2 ${S2}`} />
                    <p className={`text-xs ${S2}`}>ไม่มีข้อมูล topic ของแบรนด์ <span className="font-bold">{selectedBrand}</span></p>
                  </div>
                ) : (
                  <p className={`text-xs ${S2} text-center py-8`}>เลือกแบรนด์เพื่อดูหัวข้อปัญหา</p>
                )}
              </>
            )}
          </div>

          {/* Row 5: Agent Performance */}
          <div className={`${C} border rounded-2xl shadow-sm overflow-hidden`}>
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-1 h-4 bg-orange-400 rounded" />
                  <h2 className={`text-sm font-bold ${T}`}>Agent Performance</h2>
                </div>
                <p className={`text-[11px] ${S2}`}>คะแนน QA, CSAT และ sentiment ของแต่ละ Agent · กดเพื่อดูรายละเอียด</p>
              </div>
              <span className={`text-[10px] font-bold ${S} bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-full`}>
                <Headphones size={11} className="inline mr-1" />
                {data?.agent_performance.length || 0} Agents
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className={`text-[10px] font-bold ${S2} uppercase tracking-wider bg-slate-50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-700`}>
                    <th className="p-4 pl-6">Agent</th>
                    <th className="p-4 text-center">Calls</th>
                    <th className="p-4 text-center">QA</th>
                    <th className="p-4 text-center">CSAT</th>
                    <th className="p-4 text-center">Sentiment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                  {(data?.agent_performance || []).length === 0 ? (
                    <tr><td colSpan={5} className={`p-12 text-center ${S2}`}>
                      <Headphones size={28} className="mx-auto mb-2 opacity-40" />
                      <p className="text-xs">ยังไม่มีข้อมูล agent</p>
                    </td></tr>
                  ) : (
                    data!.agent_performance.map((a) => (
                      <tr
                        key={a.agent_id}
                        onClick={() => router.push(`/agents/${a.agent_id}`)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700/40 cursor-pointer transition-colors group"
                      >
                        <td className="p-4 pl-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-[10px] shrink-0">
                              {a.full_name
                                ? `${a.full_name.split(' ')[0]?.charAt(0) || ''}${a.full_name.split(' ')[1]?.charAt(0) || ''}`
                                : a.agent_id.slice(-2)}
                            </div>
                            <div className="min-w-0">
                              <p className={`text-sm font-semibold ${T} truncate group-hover:text-blue-600 dark:group-hover:text-blue-400`}>
                                {a.full_name || a.agent_id}
                              </p>
                              <p className={`text-[10px] ${S2} font-mono`}>{a.agent_id}</p>
                            </div>
                          </div>
                        </td>
                        <td className={`p-4 text-center text-sm font-semibold ${T}`}>{a.total_calls}</td>
                        <td className={`p-4 text-center text-base font-bold ${qaColor(a.avg_qa)}`}>
                          {a.avg_qa !== null ? a.avg_qa : '-'}
                          {a.avg_qa !== null && <span className={`text-[10px] font-normal ${S2} ml-0.5`}>/10</span>}
                        </td>
                        <td className={`p-4 text-center text-base font-bold ${csatColor(a.avg_csat)}`}>
                          {a.avg_csat !== null ? a.avg_csat : '-'}
                          {a.avg_csat !== null && <span className={`text-[10px] font-normal ${S2} ml-0.5`}>/5</span>}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2 text-[11px] font-mono">
                            <span className="text-emerald-600 dark:text-emerald-400" title="Positive">●{a.positive_calls}</span>
                            <span className={S2} title="Neutral">●{a.neutral_calls}</span>
                            <span className="text-red-500" title="Negative">●{a.negative_calls}</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
