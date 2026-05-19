'use client';

import Sidebar from '@/components/Sidebar';
import { ArrowLeft, User, MapPin, ShieldCheck, PhoneCall, ExternalLink, Phone, Pencil, Hash, FileText } from 'lucide-react';
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
  created_at: string;
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

  /* __RETURN_PLACEHOLDER__ */
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto">

          {/* Back button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-5 cursor-pointer transition-colors"
          >
            <ArrowLeft size={16} /> Back
          </button>

          {/* ===================================================== */}
          {/* Row 1 — Header: Avatar+Name | Warranties | Calls | Address */}
          {/* ===================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-5">

            {/* col 1-2: Avatar + Name + Phone */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-900/30 border-2 border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-500 dark:text-emerald-400 shrink-0">
                  <User size={40} strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 truncate">
                    {customer.first_name} {customer.last_name}
                  </h1>
                  <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-2">เบอร์โทรศัพท์</p>
                  <p className="text-lg font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 mt-0.5">
                    <Phone size={16} className="text-blue-500" />
                    {customer.phone || '-'}
                  </p>
                </div>
              </div>
            </div>

            {/* col 3: Warranties */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
              <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-500 dark:text-emerald-400 mb-2">
                <ShieldCheck size={20} />
              </div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Warranties</p>
              <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 leading-tight">{warranties.length}</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">รายการประกันสินค้าทั้งหมด</p>
            </div>

            {/* col 4: Calls */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-500 dark:text-blue-400 mb-2">
                <PhoneCall size={20} />
              </div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Calls</p>
              <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 leading-tight">{callHistory.length}</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">ประวัติการติดต่อศูนย์บริการ</p>
            </div>

            {/* col 5: Address */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
              <div className="w-10 h-10 bg-pink-50 dark:bg-pink-900/30 rounded-xl flex items-center justify-center text-pink-500 dark:text-pink-400 mb-2">
                <MapPin size={20} />
              </div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Address</p>
              {address ? (
                <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed line-clamp-3">
                  {address.address_line}
                  {address.subdistrict && <>, {address.subdistrict}</>}
                  {address.district && <>, {address.district}</>}
                  {address.city_province && <> {address.city_province}</>}
                  {address.postcode && <> {address.postcode}</>}
                </p>
              ) : (
                <p className="text-xs text-slate-400 dark:text-slate-500">-</p>
              )}
            </div>
          </div>

          {/* ===================================================== */}
          {/* Row 2 — 2 Columns: Personal Info | Warranty List      */}
          {/* ===================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">

            {/* ===== Left: Personal Info (col-span 1) ===== */}
            <div className="lg:col-span-1 space-y-4">

              {/* ข้อมูลส่วนตัว */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">ข้อมูลส่วนตัว</h3>
                  <button className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg text-[11px] font-medium text-slate-600 dark:text-slate-300 cursor-pointer transition-colors">
                    <Pencil size={11} />
                    แก้ไขข้อมูล
                  </button>
                </div>

                <div className="space-y-4 text-[12px]">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                    <div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1 flex items-center gap-1">
                        <User size={10} /> FIRST NAME / ชื่อ
                      </p>
                      <p className="text-slate-800 dark:text-slate-100 font-semibold">{customer.first_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1 flex items-center gap-1">
                        <User size={10} /> LAST NAME / นามสกุล
                      </p>
                      <p className="text-slate-800 dark:text-slate-100 font-semibold">{customer.last_name || '-'}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1">NICKNAME / ชื่อเล่น</p>
                    <p className="text-slate-800 dark:text-slate-100 font-semibold">{customer.nick_name || '-'}</p>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1 flex items-center gap-1">
                      <Phone size={10} /> PHONE / เบอร์โทร
                    </p>
                    <p className="text-slate-800 dark:text-slate-100 font-semibold">{customer.phone || '-'}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                    <div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1">GENDER / เพศ</p>
                      <p className="text-slate-800 dark:text-slate-100 font-semibold">{formatGender(customer.gender)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1">BIRTHDAY / วันเกิด</p>
                      <p className="text-slate-800 dark:text-slate-100 font-semibold">{formatDate(customer.date_of_birth)}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1">EMAIL / อีเมล</p>
                    <p className="text-slate-800 dark:text-slate-100 font-semibold break-all">{customer.email || '-'}</p>
                  </div>

                  {address && (
                    <>
                      <div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1 flex items-center gap-1">
                          <MapPin size={10} /> ADDRESS / ที่อยู่
                        </p>
                        <p className="text-slate-800 dark:text-slate-100 font-semibold">
                          {address.address_line || '-'}
                        </p>
                      </div>
                      {(address.district || address.city_province) && (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                          {address.district && (
                            <div>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1">DISTRICT / เขต-อำเภอ</p>
                              <p className="text-slate-800 dark:text-slate-100 font-semibold">{address.district}</p>
                            </div>
                          )}
                          {address.city_province && (
                            <div>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1">PROVINCE / จังหวัด</p>
                              <p className="text-slate-800 dark:text-slate-100 font-semibold">{address.city_province}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {customer.created_at && (
                    <div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1">REGISTERED / ลงทะเบียนเมื่อ</p>
                      <p className="text-slate-800 dark:text-slate-100 font-semibold">
                        {new Date(customer.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* ประวัติการติดต่อ */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <PhoneCall size={16} className="text-blue-500" />
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">ประวัติการติดต่อ</h3>
                  <span className="ml-auto px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold rounded-full">
                    {callHistory.length}
                  </span>
                </div>

                {callHistory.length > 0 ? (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {callHistory.map((call) => (
                      <div
                        key={call.file_id}
                        onClick={() => router.push(`/files/${call.file_id}`)}
                        className="bg-slate-50 dark:bg-slate-900/40 rounded-lg p-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-transparent hover:border-blue-200 dark:hover:border-blue-700 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full ${
                            call.call_direction === 'Inbound'
                              ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                              : 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                          }`}>
                            {(call.call_direction || 'Unknown').toUpperCase()}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">{formatDateTime(call.call_date)}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                          ID: {call.file_id}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-6">ไม่มีประวัติการติดต่อ</p>
                )}
              </div>
            </div>

            {/* ===== Right: Warranty List (col-span 2) ===== */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    รายการประกันสินค้า <span className="text-slate-400 dark:text-slate-500">({warranties.length})</span>
                  </h3>
                </div>

                {warranties.length === 0 ? (
                  <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-12">ไม่มีข้อมูลการรับประกัน</p>
                ) : (
                  <div className="space-y-3">
                    {warranties.map((w) => (
                      <div
                        key={w.registration_id}
                        className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700 transition-all"
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                              {w.brand_name || 'Unknown'} {w.model ? ` - ${w.model}` : (w.category_name ? ` - ${w.category_name}` : '')}
                            </h4>
                            {w.size && (
                              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Size: {w.size}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                              w.status === 'ACTIVE' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
                              w.status === 'EXPIRED' ? 'bg-red-50 dark:bg-red-900/30 text-red-500' :
                              'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                            }`}>
                              {w.status}
                            </span>
                            <button
                              onClick={() => router.push(`/customers/warranty/${w.registration_id}`)}
                              className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg text-[11px] font-medium text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                            >
                              <Pencil size={11} />
                              Edit
                            </button>
                          </div>
                        </div>

                        {/* ID badges */}
                        <div className="flex flex-wrap items-center gap-2 mb-3 pb-3 border-b border-slate-100 dark:border-slate-700">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-mono font-bold rounded">
                            <Hash size={10} />
                            {w.registration_no || '-'}
                          </span>
                          {w.certificate_no && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                              <FileText size={10} />
                              {w.certificate_no}
                            </span>
                          )}
                        </div>

                        {/* Fields */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-3 gap-x-4 text-[11px]">
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">DELIVERY DATE</p>
                            <p className="font-semibold text-slate-700 dark:text-slate-200">
                              {w.date_of_purchase
                                ? new Date(w.date_of_purchase).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
                                : '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">WARRANTY</p>
                            <p className="font-semibold text-slate-700 dark:text-slate-200">
                              {w.warranty_period_months ? `${w.warranty_period_months} Months` : '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">CHANNEL</p>
                            <p className="font-semibold text-slate-700 dark:text-slate-200 truncate">{w.channel_name || '-'}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">EXPIRY</p>
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
                )}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
