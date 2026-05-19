'use client';

import Sidebar from '@/components/Sidebar';
import { ArrowLeft, User, MapPin, ShieldCheck, PhoneCall, ExternalLink } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface CustomerInfo {
  customer_id: number;
  first_name: string;
  last_name: string;
  nick_name: string | null;
  email: string;
  phone: string;
  gender: string;
  date_of_birth: string;
}

interface Address {
  address_line: string;
  subdistrict: string;
  district: string;
  city_province: string;
  country: string;
  postcode: string;
}

interface Warranty {
  registration_id: number;
  registration_no: string;
  certificate_no: string | null;
  brand_name: string;
  category_name: string;
  model: string;
  size: string;
  channel_name: string;
  warranty_period_months: number;
  date_of_purchase: string;
  expiry_date: string;
  status: string;
}

interface CallRecord {
  file_id: string;
  original_filename: string;
  call_direction: string;
  call_date: string;
  agent_id: string;
  sentiment: string;
  summary_text: string;
  key_insights: string;
}

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [callHistory, setCallHistory] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/v1/customers/detail/${customerId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setCustomer(data.customer);
        setAddress(data.address);
        setWarranties(data.warranties || []);
        setCallHistory(data.call_history || []);
      } catch {
        setCustomer(null);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [customerId]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return dateStr; }
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
        ', ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch { return dateStr; }
  };

  const formatGender = (g: string) => {
    if (!g) return '-';
    switch (g.toUpperCase()) {
      case 'MALE': return 'ชาย';
      case 'FEMALE': return 'หญิง';
      default: return g;
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-slate-50 dark:bg-slate-800">
        <Sidebar />
        <main className="flex-1 p-6 flex items-center justify-center">
          <p className="text-slate-400 dark:text-slate-500 text-sm">กำลังโหลดข้อมูล...</p>
        </main>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex h-screen bg-slate-50 dark:bg-slate-800">
        <Sidebar />
        <main className="flex-1 p-6 flex items-center justify-center">
          <p className="text-slate-400 dark:text-slate-500 text-sm">ไม่พบข้อมูลลูกค้า</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto">

          {/* Back button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-6 cursor-pointer transition-colors"
          >
            <ArrowLeft size={16} /> Back
          </button>

          {/* Customer Info Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                <User size={20} />
              </div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Customer Information</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-5 gap-x-6">
              <div>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">NAME</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{customer.first_name} {customer.last_name}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">NICKNAME</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{customer.nick_name || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">PHONE</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{customer.phone || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">EMAIL</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{customer.email || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">GENDER</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{formatGender(customer.gender)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">DATE OF BIRTH</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{formatDate(customer.date_of_birth)}</p>
              </div>
            </div>
          </div>

          {/* Two columns: Address + Warranty */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

            {/* Address */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
                  <MapPin size={16} />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Address</h3>
              </div>
              {address ? (
                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4">
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {address.address_line}
                    {address.subdistrict && <><br />{address.subdistrict}</>}
                    {address.district && <>, {address.district}</>}
                    {address.city_province && <><br />{address.city_province}</>}
                    {address.postcode && <> {address.postcode}</>}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">ไม่มีข้อมูลที่อยู่</p>
              )}
            </div>

            {/* Warranty Products */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-amber-50 dark:bg-amber-900/30 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <ShieldCheck size={16} />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Warranty Products</h3>
                {warranties.length > 0 && (
                  <span className="ml-auto text-[11px] text-slate-400 dark:text-slate-500">({warranties.length})</span>
                )}
              </div>
              {warranties.length > 0 ? (
                <div className="space-y-3">
                  {warranties.map((w) => (
                    <div
                      key={w.registration_id}
                      onClick={() => router.push(`/customers/warranty/${w.registration_id}`)}
                      className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-4 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-700 border border-transparent transition-all cursor-pointer group"
                    >
                      {/* Header: brand+model + status */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 flex items-center gap-1 truncate">
                            {w.brand_name || 'Unknown'} — {w.model || w.category_name || '-'}
                            <ExternalLink size={11} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </p>
                          {w.size && (
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Size: {w.size}</p>
                          )}
                        </div>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full shrink-0 ml-2 ${
                          w.status === 'ACTIVE'  ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
                          w.status === 'EXPIRED' ? 'bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400' :
                          'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                        }`}>
                          {w.status}
                        </span>
                      </div>

                      {/* Fields grid */}
                      <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-[11px]">
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">รหัสลงทะเบียน</p>
                          <p className="font-mono font-semibold text-slate-700 dark:text-slate-200 truncate">{w.registration_no || '-'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">รหัสรับประกัน</p>
                          <p className="font-mono font-semibold text-slate-700 dark:text-slate-200 truncate">{w.certificate_no || '-'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">ระยะรับประกัน</p>
                          <p className="font-semibold text-slate-700 dark:text-slate-200">
                            {w.warranty_period_months ? `${w.warranty_period_months} เดือน` : '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">ช่องทางการซื้อ</p>
                          <p className="font-semibold text-slate-700 dark:text-slate-200 truncate">{w.channel_name || '-'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">วันเริ่มรับประกัน</p>
                          <p className="font-semibold text-slate-700 dark:text-slate-200">
                            {w.date_of_purchase
                              ? new Date(w.date_of_purchase).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
                              : '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">วันหมดอายุ</p>
                          <p className="font-semibold text-slate-700 dark:text-slate-200">
                            {w.expiry_date
                              ? new Date(w.expiry_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
                              : '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500">ไม่มีข้อมูลการรับประกัน</p>
              )}
            </div>
          </div>

          {/* Call History */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                <PhoneCall size={16} />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">ประวัติการโทร</h3>
              <span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">({callHistory.length} รายการ)</span>
            </div>

            {callHistory.length > 0 ? (
              <div className="space-y-3">
                {callHistory.map((call, idx) => (
                  <div
                    key={call.file_id}
                    onClick={() => router.push(`/files/${call.file_id}`)}
                    className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-transparent dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 transition-all cursor-pointer group"
                  >
                    {/* Row 1: Direction, Agent, Sentiment, Date */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium w-5">{idx + 1}</span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          call.call_direction === 'Inbound'
                            ? 'bg-green-50 text-green-600'
                            : 'bg-orange-50 text-orange-600'
                        }`}>
                          {call.call_direction || 'Unknown'}
                        </span>
                        <span className="text-sm text-slate-600 dark:text-slate-300 dark:text-slate-600">{call.agent_id || '-'}</span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          call.sentiment?.toUpperCase() === 'POSITIVE' ? 'bg-emerald-50 text-emerald-500' :
                          call.sentiment?.toUpperCase() === 'NEGATIVE' ? 'bg-red-50 text-red-500' :
                          'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                        }`}>
                          {(call.sentiment || 'NEUTRAL').toUpperCase()}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">{formatDateTime(call.call_date)}</span>
                    </div>

                    {/* Row 2: Key Insights */}
                    {call.key_insights && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed pl-8">
                        💡 {call.key_insights}
                      </p>
                    )}
                    {!call.key_insights && call.summary_text && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed pl-8">
                        {call.summary_text}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">ไม่มีประวัติการโทร</p>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
