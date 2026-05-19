'use client';

import Sidebar from '@/components/Sidebar';
import { ArrowLeft, ShieldCheck, User, MapPin, FileImage, MessageSquare } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function WarrantyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const regId = params.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/v1/customers/warranty/${regId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setData(await res.json());
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [regId]);

  const formatDate = (d: string) => {
    if (!d || d === 'N/A') return 'N/A';
    try {
      return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return d; }
  };

  const formatDateTime = (d: string) => {
    if (!d) return '-';
    try {
      const dt = new Date(d);
      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
        ', ' + dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch { return d; }
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

  if (!data?.warranty) {
    return (
      <div className="flex h-screen bg-slate-50 dark:bg-slate-800">
        <Sidebar />
        <main className="flex-1 p-6 flex items-center justify-center">
          <p className="text-slate-400 dark:text-slate-500 text-sm">ไม่พบข้อมูลการรับประกัน</p>
        </main>
      </div>
    );
  }

  const w = data.warranty;
  const c = data.customer;
  const addr = data.address;
  const proofs = data.proofs || [];
  const activities = data.activities || [];

  const warrantyFields = [
    ['Registration No.', w.registration_no],
    ['Ref ID', w.ref_id || 'N/A'],
    ['Certificate No.', w.certificate_no || 'N/A'],
    ['Brand', w.brand_name],
    ['Category', w.category_name],
    ['Model', w.model || 'N/A'],
    ['Size', w.size || 'N/A'],
    ['SKU', w.sku || 'N/A'],
    ['Serial No.', w.serial_no || 'N/A'],
    ['Label No.', w.label_no || 'N/A'],
    ['Warranty Period', w.warranty_period_months ? `${w.warranty_period_months} Months` : 'N/A'],
    ['Date of Purchase', formatDate(w.date_of_purchase)],
    ['Date of Delivery', formatDate(w.date_of_delivery)],
    ['Purchase Channel', w.channel_name || 'N/A'],
    ['Order Number', w.order_number || 'N/A'],
    ['Expiry Date', formatDate(w.expiry_date)],
    ['Remark', w.remark || '-'],
  ];

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-3xl mx-auto">

          {/* Back */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-6 cursor-pointer transition-colors"
          >
            <ArrowLeft size={16} /> Back
          </button>

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">#{w.registration_no}</h1>
              <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                w.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' :
                w.status === 'EXPIRED' ? 'bg-red-50 text-red-500' :
                'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              }`}>
                {w.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">Created {formatDateTime(w.created_at)}</p>
          </div>

          {/* Warranty Information */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 mb-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 bg-amber-50 rounded-full flex items-center justify-center text-amber-600">
                <ShieldCheck size={16} />
              </div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Warranty Information</h2>
            </div>
            <div className="space-y-0">
              {warrantyFields.map(([label, value], idx) => (
                <div key={label as string} className={`flex py-3 px-4 ${idx % 2 === 0 ? 'bg-slate-50 dark:bg-slate-700/40' : ''} rounded-lg`}>
                  <span className="w-44 shrink-0 text-sm text-slate-500 dark:text-slate-400">{label}</span>
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Registrant Information */}
          {c && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 mb-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                  <User size={16} />
                </div>
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Registrant Information</h2>
              </div>
              <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                {[
                  ['First Name', c.first_name],
                  ['Last Name', c.last_name],
                  ['Phone', c.phone],
                  ['Email', c.email],
                  ['Gender', c.gender],
                  ['Date of Birth', formatDate(c.date_of_birth)],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">{label}</p>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{value || '-'}</p>
                  </div>
                ))}
              </div>

              {/* Address */}
              {addr && (
                <div className="mt-5 pt-5 border-t border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin size={14} className="text-slate-400 dark:text-slate-500" />
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Address</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4">
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {addr.address_line}
                      {addr.subdistrict && `, ${addr.subdistrict}`}
                      {addr.district && `, ${addr.district}`}
                      {addr.city_province && `, ${addr.city_province}`}
                      {addr.postcode && ` ${addr.postcode}`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Proof of Purchase */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-violet-50 rounded-full flex items-center justify-center text-violet-600">
                <FileImage size={16} />
              </div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Proof / Evidence of Purchase</h2>
            </div>
            {proofs.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {proofs.map((p: any) => (
                  <a key={p.proof_id} href={`${API_BASE}/api/v1/customers/proof/${p.proof_id}`} target="_blank" rel="noopener noreferrer" className="block group">
                    <div className="w-28 h-28 bg-slate-50 rounded-xl overflow-hidden border border-slate-200 group-hover:border-blue-300 transition-colors">
                      <img
                        src={`${API_BASE}/api/v1/customers/proof/${p.proof_id}`}
                        alt="proof"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 truncate w-28">{p.file_type}</p>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">ไม่มีหลักฐานการซื้อ</p>
            )}
          </div>

          {/* Activities */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-cyan-50 rounded-full flex items-center justify-center text-cyan-600">
                <MessageSquare size={16} />
              </div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Activities</h2>
            </div>
            {activities.length > 0 ? (
              <div className="space-y-3">
                {activities.map((act: any) => (
                  <div key={act.activity_id} className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-600">
                        {act.admin_name || 'System'}
                        {act.is_internal_note ? <span className="ml-2 text-[10px] text-amber-500 font-bold">Internal Note</span> : null}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">{formatDateTime(act.created_at)}</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 dark:text-slate-600">{act.comment}</p>
                    {act.attached_file_url && (
                      <p className="text-xs text-blue-500 mt-1 truncate">📎 {act.attached_file_url}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">ยังไม่มีกิจกรรม</p>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
