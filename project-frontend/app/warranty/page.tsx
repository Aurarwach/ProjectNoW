'use client';

import Sidebar from '@/components/Sidebar';
import { Search, RotateCw, ShieldCheck, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface WarrantyRecord {
  registration_id: number;
  registration_no: string;
  status: string;
  warranty_period_months: number;
  date_of_purchase: string;
  date_of_delivery: string;
  expiry_date: string;
  order_number: string;
  customer_id: number;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  brand_name: string;
  category_name: string;
  model: string;
  size: string;
  channel_name: string;
  created_at: string;
}

export default function WarrantyPage() {
  const router = useRouter();
  const [warranties, setWarranties] = useState<WarrantyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchWarranties = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`${API_BASE}/api/v1/customers/warranty-list?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setWarranties(data.warranties || []);
    } catch {
      setWarranties([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchWarranties(); }, [fetchWarranties]);

  const formatDate = (d: string) => {
    if (!d) return '-';
    try {
      return new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return d; }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400';
      case 'EXPIRED': return 'bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400';
      default: return 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400';
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-full mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span className="text-amber-500"><ShieldCheck size={24} /></span> Warranty Storage
            </h1>
          </div>

          {/* Search */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl flex items-center space-x-4 shadow-sm border border-slate-100 dark:border-slate-700 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={20} />
              <input
                type="text"
                placeholder="ค้นหา (ชื่อ, นามสกุล, เบอร์โทร, รหัสรับประกัน, แบรนด์)..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 text-sm dark:text-slate-200"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') fetchWarranties(); }}
              />
            </div>
            <button
              onClick={fetchWarranties}
              className="p-3 bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer transition-colors"
            >
              <RotateCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* List */}
          <div className="space-y-2">
            {loading ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center shadow-sm border border-slate-100 dark:border-slate-700">
                <RotateCw size={24} className="animate-spin mx-auto mb-2 text-slate-400 dark:text-slate-500" />
                <p className="text-sm text-slate-400 dark:text-slate-500">กำลังโหลดข้อมูล...</p>
              </div>
            ) : warranties.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center shadow-sm border border-slate-100 dark:border-slate-700">
                <ShieldCheck size={32} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-medium text-slate-400 dark:text-slate-500">ไม่พบข้อมูลการรับประกัน</p>
              </div>
            ) : (
              warranties.map((w) => (
                <div
                  key={w.registration_id}
                  onClick={() => router.push(`/customers/warranty/${w.registration_id}`)}
                  className="bg-white dark:bg-slate-800 rounded-xl px-4 py-3 shadow-sm border border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 flex items-center gap-1">
                          {w.registration_no}
                          <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </p>
                        <span className={`px-1.5 py-px text-[9px] font-bold rounded-full ${getStatusStyle(w.status)}`}>
                          {w.status}
                        </span>
                        <span className="text-[11px] text-slate-600 dark:text-slate-300">{w.brand_name} — {w.category_name} ({w.model})</span>
                      </div>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        {w.first_name} {w.last_name} · {w.phone} · {w.warranty_period_months} เดือน · {w.channel_name || '-'} · หมด {formatDate(w.expiry_date)}
                      </p>
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0 ml-4">{formatDate(w.date_of_purchase)}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Count */}
          {!loading && warranties.length > 0 && (
            <div className="mt-4 text-center">
              <p className="text-xs text-slate-400 dark:text-slate-500">
                ทั้งหมด <span className="font-bold text-slate-600 dark:text-slate-300">{warranties.length}</span> รายการ
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
