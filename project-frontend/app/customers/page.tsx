'use client';

import Sidebar from '@/components/Sidebar';
import { Search, Users, RotateCw, Phone, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Customer {
  customer_id: number;
  first_name: string;
  last_name: string;
  nick_name: string | null;
  phone: string;
  email: string;
  gender: string;
  date_of_birth: string;
}

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`${API_BASE}/api/v1/customers/list?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-full mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span className="text-blue-600"><Users size={24} /></span> Customer Information
            </h1>
          </div>

          {/* Search */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl flex items-center space-x-4 shadow-sm mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={20} />
              <input
                type="text"
                placeholder="ค้นหา (ชื่อ, นามสกุล, เบอร์โทร, อีเมล)..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 text-sm dark:text-slate-200"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') fetchCustomers(); }}
              />
            </div>
            <button
              onClick={fetchCustomers}
              className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors"
            >
              <RotateCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Customer List */}
          <div className="space-y-3">
            {loading ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center shadow-sm">
                <RotateCw size={24} className="animate-spin mx-auto mb-2 text-slate-400 dark:text-slate-500" />
                <p className="text-sm text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">กำลังโหลดข้อมูล...</p>
              </div>
            ) : customers.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center shadow-sm">
                <Users size={32} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-medium text-slate-400 dark:text-slate-500">ไม่พบข้อมูลลูกค้า</p>
              </div>
            ) : (
              customers.map((c) => (
                <div
                  key={c.customer_id}
                  onClick={() => router.push(`/customers/${c.customer_id}`)}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 hover:border-blue-200 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm group-hover:bg-blue-100 transition-colors">
                        {c.first_name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {c.first_name} {c.last_name}
                          {c.nick_name && <span className="text-slate-400 dark:text-slate-500 font-normal ml-1">({c.nick_name})</span>}
                        </p>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
                            <Phone size={12} /> {c.phone || '-'}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
                            <Mail size={12} /> {c.email || '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-slate-300 dark:text-slate-600 group-hover:text-blue-400 transition-colors">ดูรายละเอียด →</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
