'use client';

import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/components/AuthProvider';
import { Search, RotateCw, Calendar, Tag, CheckCircle2, RefreshCw, FileAudio, Package, AlertCircle, ChevronDown, X, Trash2, CheckSquare, Square, Download, Upload, Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback, useRef, Suspense } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const BRANDS = ['LOTUS', 'OMAZZ', 'DUNLOPILLO', 'MIDAS', 'BEDGEAR', 'LALABED', 'ZINUS', 'EASTMAN HOUSE', 'MALOUF', 'LOTO MOBILI', 'WOODFIELD', 'RESTONIC'];
const PRODUCTS = ['Mattress', 'Pillow', 'Bedding', 'Bed Frame', 'Topper', 'Protector'];

interface FileRecord {
  file_id: string;
  name: string;
  customer: string;
  agent: string;
  agent_name: string;
  brand: string;
  brands: string[];
  product: string;
  sentiment: string;
  status: string;
  date: string;
  call_direction: string;
}

export default function FilesPage() {
  return (
    <Suspense fallback={<div className="page-bg-dark flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900"><Loader2 className="animate-spin text-blue-600" size={32} /></div>}>
      <FilesPageInner />
    </Suspense>
  );
}

function FilesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(searchParams.get('topic') || searchParams.get('search') || '');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 10;

  // Filters
  const [filterBrand, setFilterBrand] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Dropdown visibility
  const [showBrand, setShowBrand] = useState(false);
  const [showProduct, setShowProduct] = useState(false);
  const [showDate, setShowDate] = useState(false);

  // Selection mode
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Export
  const [showExport, setShowExport] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Upload
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadQueue, setUploadQueue] = useState<{
    id: string;
    name: string;
    size: string;
    status: 'uploading' | 'done' | 'error';
    error?: string;
  }[]>([]);

  const brandRef = useRef<HTMLDivElement>(null);
  const productRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (brandRef.current && !brandRef.current.contains(e.target as Node)) setShowBrand(false);
      if (productRef.current && !productRef.current.contains(e.target as Node)) setShowProduct(false);
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) setShowDate(false);
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setShowExport(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Sync search state เมื่อ URL param เปลี่ยน (เช่นจากหน้า Dashboard กด topic)
  useEffect(() => {
    const topic = searchParams.get('topic');
    const s = searchParams.get('search');
    const incoming = topic || s;
    if (incoming) {
      setSearch(incoming);
      setPage(1);
    }
  }, [searchParams]);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
      });
      if (search) params.set('search', search);
      if (filterBrand) params.set('brand', filterBrand);
      if (filterProduct) params.set('product', filterProduct);
      if (filterDateFrom) params.set('date_from', filterDateFrom);
      if (filterDateTo) params.set('date_to', filterDateTo);

      const res = await fetch(`${API_BASE}/api/v1/audio/list?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setFiles(data.files || []);
      setTotalPages(data.total_pages || 1);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError('ไม่สามารถเชื่อมต่อกับ API ได้ — กรุณาเปิด Backend Server (uvicorn)');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterBrand, filterProduct, filterDateFrom, filterDateTo]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  useEffect(() => {
    const hasProcessing = files.some(f => f.status === 'PROCESSING');
    if (!hasProcessing) return;
    const interval = setInterval(() => { fetchFiles(); }, 5000);
    return () => clearInterval(interval);
  }, [files, fetchFiles]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return dateStr; }
  };

  const getSentimentStyle = (sentiment: string) => {
    switch (sentiment?.toUpperCase()) {
      case 'POSITIVE': return 'bg-emerald-50 text-emerald-600';
      case 'NEGATIVE': return 'bg-rose-50 text-rose-600';
      default: return 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400';
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'COMPLETE') return <CheckCircle2 size={14} />;
    if (status === 'FAILED') return <AlertCircle size={14} />;
    return <RefreshCw size={14} className="animate-spin" />;
  };

  const getStatusColor = (status: string) => {
    if (status === 'COMPLETE') return 'text-emerald-500';
    if (status === 'FAILED') return 'text-red-500';
    return 'text-orange-500';
  };

  const activeFilterCount = [filterBrand, filterProduct, filterDateFrom || filterDateTo].filter(Boolean).length;

  const clearAllFilters = () => {
    setFilterBrand('');
    setFilterProduct('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setPage(1);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === files.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(files.map(f => f.file_id)));
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleBatchDelete = async () => {
    if (deleteConfirmText.trim() !== 'Delete') return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/audio/delete-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_ids: Array.from(selectedIds) }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');
      exitSelectMode();
      fetchFiles();
    } catch {
      alert('เกิดข้อผิดพลาดในการลบไฟล์');
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = (type: 'calls' | 'agents', format: 'xlsx' | 'csv') => {
    const url = `${API_BASE}/api/v1/dashboard/export-${type}?format=${format}`;
    window.open(url, '_blank');
    setShowExport(false);
  };

  // === Upload Handler ===
  const SUPPORTED_FORMATS = ['MP3', 'WAV', 'M4A', 'AAC', 'OGG', 'FLAC', 'WMA', 'OPUS'];

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    // เตรียม queue
    const items: { id: string; name: string; size: string; status: 'uploading'; file: File }[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const ext = file.name.split('.').pop()?.toUpperCase() || '';
      if (!SUPPORTED_FORMATS.includes(ext)) continue;
      items.push({
        id: `${Date.now()}-${i}-${file.name}`,
        name: file.name,
        size: formatSize(file.size),
        status: 'uploading',
        file,
      });
    }

    // reset input ทันทีเพื่อให้เลือกไฟล์เดิมซ้ำได้
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (items.length === 0) {
      alert('ไม่มีไฟล์ที่รองรับ\n(MP3, WAV, M4A, AAC, OGG, FLAC, WMA, OPUS)');
      return;
    }

    // เพิ่มเข้า queue UI
    setUploadQueue(prev => [...prev, ...items.map(it => ({
      id: it.id, name: it.name, size: it.size, status: 'uploading' as const,
    }))]);

    // upload ทีละไฟล์ (parallel จะกระทบ server)
    for (const item of items) {
      try {
        const formData = new FormData();
        formData.append('file', item.file);
        formData.append('customer_phone', 'N/A');
        formData.append('agent_id', 'N/A');
        if (user?.admin_user_id) formData.append('created_by', String(user.admin_user_id));

        const res = await fetch(`${API_BASE}/api/v1/audio/upload`, {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.detail || `HTTP ${res.status}`);
        }

        setUploadQueue(prev => prev.map(q =>
          q.id === item.id ? { ...q, status: 'done' as const } : q
        ));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload ล้มเหลว';
        setUploadQueue(prev => prev.map(q =>
          q.id === item.id ? { ...q, status: 'error' as const, error: msg } : q
        ));
      }
    }

    // โหลดข้อมูล Files ใหม่ + auto-clear done items หลัง 4 วินาที
    fetchFiles();
    setTimeout(() => {
      setUploadQueue(prev => prev.filter(q => q.status !== 'done'));
    }, 4000);
  };

  const dismissUploadItem = (id: string) => {
    setUploadQueue(prev => prev.filter(q => q.id !== id));
  };


  return (
    <div className="page-bg-dark flex h-screen overflow-hidden bg-slate-50 text-slate-900" style={{ colorScheme: 'light' }}>
      <Sidebar />
      <main className="page-bg-dark flex-1 overflow-auto bg-slate-50 p-4 sm:p-5 lg:p-6">
        <div className="mx-auto w-full">
          <div className="mb-8 flex flex-col justify-between gap-6 lg:flex-row lg:items-end border-b border-slate-200/60 pb-6">
            <div className="relative">
              {/* Decorative Frame */}
              <div className="absolute left-0 top-1 bottom-[34px] w-px bg-gradient-to-b from-blue-400 to-transparent opacity-60"></div>
              {/* 4-Point Star top-left */}
              <svg className="absolute -left-[5.5px] top-0 w-3 h-3 text-blue-500 opacity-80" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C12 0 12 10.5 24 12C24 12 12 13.5 12 24C12 24 12 13.5 0 12C0 12 12 10.5 12 0Z" />
              </svg>
              {/* Dot and horizontal line bottom-left */}
              <div className="absolute left-0 bottom-8 w-1.5 h-1.5 rounded-full bg-blue-500 -ml-[2px] opacity-80"></div>
              <div className="absolute left-1.5 bottom-[34.5px] right-24 h-px bg-gradient-to-r from-blue-400 via-blue-200 to-transparent opacity-60"></div>
              
              {/* Right Decorative Graphics (Swirls) */}
              <svg className="absolute -right-4 top-0 w-32 h-24 text-blue-300 pointer-events-none opacity-40 mix-blend-multiply hidden sm:block" viewBox="0 0 200 100" fill="none" stroke="currentColor">
                <path d="M150,80 Q100,80 120,40 T180,20" strokeWidth="0.5" fill="none"/>
                <path d="M130,90 Q80,90 90,50 T160,10" strokeWidth="0.5" fill="none"/>
                <path d="M160,70 C130,50 180,30 190,50 C200,70 170,90 140,80" strokeWidth="0.5" fill="none"/>
                <path d="M140,65 C140,65 140,75 145,75 C145,75 140,75 140,85 C140,85 140,75 135,75 C135,75 140,75 140,65Z" fill="#2563EB" stroke="none"/>
                <circle cx="160" cy="25" r="1.5" fill="currentColor"/>
                <circle cx="150" cy="15" r="1" fill="currentColor"/>
                <circle cx="185" cy="85" r="1.5" fill="currentColor"/>
              </svg>

              <div className="pl-6 pt-8 pb-4 relative z-10">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <h1 className="text-[24px] sm:text-[28px] md:text-[32px] font-black tracking-tight text-[#2563EB] leading-none">Files</h1>
                  <h1 className="text-[24px] sm:text-[28px] md:text-[32px] font-black tracking-tight text-[#0F172A] leading-none">Library</h1>
                  <span 
                    className="text-[24px] sm:text-[28px] md:text-[32px] font-black tracking-tight leading-none ml-1 sm:ml-1.5" 
                    style={{ 
                      background: 'linear-gradient(to right, #0F172A, #2563EB, #60A5FA)', 
                      WebkitBackgroundClip: 'text', 
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    Storage
                  </span>
                </div>

                <div className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-2 text-[10px] sm:text-xs font-bold tracking-[0.2em] text-[#2563EB] uppercase">
                  <span>AUDIO ASSETS MANAGEMENT</span>
                  <span className="text-blue-200">|</span>
                  <span>{(total || 0).toLocaleString()} RECORDINGS</span>
                </div>
              </div>
            </div>

            {!selectMode ? (
              <div className="flex items-center gap-3 mr-12">
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".mp3,.wav,.m4a,.aac,.ogg,.flac,.wma,.opus,audio/*"
                  className="hidden"
                  onChange={handleFilesSelected}
                />

                {/* Upload Button */}
                <button
                  onClick={handleUploadClick}
                  className="px-5 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-sm font-medium flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
                >
                  <Upload size={16} /> Upload
                </button>
                <button
                  onClick={() => { setSelectMode(true); setSelectedIds(new Set()); }}
                  className="px-5 py-2 bg-red-50 border border-red-100 text-red-600 hover:bg-red-100 hover:border-red-100 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
                >
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 mr-12">
                <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                  เลือกแล้ว <span className="text-blue-600 font-bold">{selectedIds.size}</span> ไฟล์
                </span>
                <button
                  onClick={toggleSelectAll}
                  className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors shadow-sm flex items-center gap-2"
                >
                  {selectedIds.size === files.length && files.length > 0 ? <CheckSquare size={16} /> : <Square size={16} />}
                  Select All
                </button>
                <button
                  onClick={() => selectedIds.size > 0 && setShowDeleteConfirm(true)}
                  disabled={selectedIds.size === 0}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
                >
                  <Trash2 size={16} /> ลบที่เลือก
                </button>
                <button
                  onClick={exitSelectMode}
                  className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors shadow-sm"
                >
                  ยกเลิก
                </button>
              </div>
            )}
          </div>

          {/* Toolbar */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-t-2xl flex items-center space-x-4 shadow-sm border-b border-slate-100 dark:border-slate-700">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={20} />
              <input
                type="text"
                placeholder="ค้นหาชื่อไฟล์, เบอร์โทร, Agent, Brand..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 text-sm dark:text-slate-200"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                onKeyDown={(e) => { if (e.key === 'Enter') fetchFiles(); }}
              />
            </div>
            <button
              onClick={fetchFiles}
              className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors"
            >
              <RotateCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-slate-800 p-4 flex items-center space-x-3 shadow-sm">
            {/* Date Filter */}
            <div ref={dateRef} className="relative">
              <button
                onClick={() => { setShowDate(!showDate); setShowBrand(false); setShowProduct(false); }}
                className={`px-4 py-2 border rounded-lg text-sm font-medium flex items-center space-x-2 cursor-pointer transition-colors ${
                  filterDateFrom || filterDateTo ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                <Calendar size={16} />
                <span>{filterDateFrom || filterDateTo ? `${filterDateFrom || '...'} ~ ${filterDateTo || '...'}` : 'Date'}</span>
                <ChevronDown size={14} />
              </button>
              {showDate && (
                <div className="absolute top-full left-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-4 z-50 w-72">
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-2">ช่วงวันที่</p>
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="date"
                      value={filterDateFrom}
                      onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1); }}
                      className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-blue-300"
                    />
                    <span className="text-slate-400 dark:text-slate-500 text-xs">ถึง</span>
                    <input
                      type="date"
                      value={filterDateTo}
                      onChange={(e) => { setFilterDateTo(e.target.value); setPage(1); }}
                      className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-blue-300"
                    />
                  </div>
                  {(filterDateFrom || filterDateTo) && (
                    <button onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); setPage(1); }} className="text-xs text-red-500 hover:underline cursor-pointer">ล้าง</button>
                  )}
                </div>
              )}
            </div>

            {/* Brand Filter */}
            <div ref={brandRef} className="relative">
              <button
                onClick={() => { setShowBrand(!showBrand); setShowDate(false); setShowProduct(false); }}
                className={`px-4 py-2 border rounded-lg text-sm font-medium flex items-center space-x-2 cursor-pointer transition-colors ${
                  filterBrand ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                <Tag size={16} />
                <span>{filterBrand || 'Brand'}</span>
                <ChevronDown size={14} />
              </button>
              {showBrand && (
                <div className="absolute top-full left-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-2 z-50 w-52 max-h-72 overflow-y-auto">
                  <button
                    onClick={() => { setFilterBrand(''); setPage(1); setShowBrand(false); }}
                    className={`w-full text-left px-4 py-2 text-sm cursor-pointer transition-colors ${!filterBrand ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50'}`}
                  >
                    ทั้งหมด
                  </button>
                  {BRANDS.map((b) => (
                    <button
                      key={b}
                      onClick={() => { setFilterBrand(b); setPage(1); setShowBrand(false); }}
                      className={`w-full text-left px-4 py-2 text-sm cursor-pointer transition-colors ${filterBrand === b ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50'}`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Filter */}
            <div ref={productRef} className="relative">
              <button
                onClick={() => { setShowProduct(!showProduct); setShowDate(false); setShowBrand(false); }}
                className={`px-4 py-2 border rounded-lg text-sm font-medium flex items-center space-x-2 cursor-pointer transition-colors ${
                  filterProduct ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                <Package size={16} />
                <span>{filterProduct || 'Product'}</span>
                <ChevronDown size={14} />
              </button>
              {showProduct && (
                <div className="absolute top-full left-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-2 z-50 w-48">
                  <button
                    onClick={() => { setFilterProduct(''); setPage(1); setShowProduct(false); }}
                    className={`w-full text-left px-4 py-2 text-sm cursor-pointer transition-colors ${!filterProduct ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50'}`}
                  >
                    ทั้งหมด
                  </button>
                  {PRODUCTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => { setFilterProduct(p); setPage(1); setShowProduct(false); }}
                      className={`w-full text-left px-4 py-2 text-sm cursor-pointer transition-colors ${filterProduct === p ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Clear filters */}
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="px-3 py-2 text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1 cursor-pointer"
              >
                <X size={14} /> ล้างตัวกรอง ({activeFilterCount})
              </button>
            )}
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 m-4 flex items-start space-x-3">
              <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-sm font-medium text-red-800">{error}</p>
                <p className="text-xs text-red-600 mt-1">ตรวจสอบว่ารัน: <code className="bg-red-100 px-1.5 py-0.5 rounded">cd project-backend && uvicorn main:app --reload --port 8000</code></p>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="bg-white dark:bg-slate-800 rounded-b-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
                  {selectMode && (
                    <th className="p-4 pl-6 w-12">
                      <button onClick={toggleSelectAll} className="cursor-pointer">
                        {selectedIds.size === files.length && files.length > 0
                          ? <CheckSquare size={18} className="text-blue-600" />
                          : <Square size={18} className="text-slate-400 dark:text-slate-500" />
                        }
                      </button>
                    </th>
                  )}
                  <th className="p-4 pl-6 w-[28%]">File Name</th>
                  <th className="p-4 w-[12%]">Sentiment</th>
                  <th className="p-4 w-[15%]">Customer</th>
                  <th className="p-4 w-[10%] text-center">Agent ID</th>
                  <th className="p-4 w-[12%]">Brand</th>
                  <th className="p-4 w-[10%] text-center">Call Type</th>
                  <th className="p-4 w-[12%]">Status</th>
                  <th className="p-4 w-[13%]">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={selectMode ? 9 : 8} className="p-12 text-center text-slate-400 dark:text-slate-500">
                      <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
                      <p className="text-sm">กำลังโหลดข้อมูล...</p>
                    </td>
                  </tr>
                ) : files.length === 0 ? (
                  <tr>
                    <td colSpan={selectMode ? 9 : 8} className="p-12 text-center text-slate-400 dark:text-slate-500">
                      <FileAudio size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm font-medium">ไม่พบไฟล์</p>
                      <p className="text-xs mt-1">ลอง upload ไฟล์ใหม่จากหน้า Upload</p>
                    </td>
                  </tr>
                ) : (
                  files.map((file) => (
                    <tr
                      key={file.file_id}
                      onClick={() => { if (!selectMode) router.push(`/files/${file.file_id}`); else toggleSelect(file.file_id); }}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer group ${selectedIds.has(file.file_id) ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}
                    >
                      {selectMode && (
                        <td className="p-4 pl-6 w-12" onClick={(e) => { e.stopPropagation(); toggleSelect(file.file_id); }}>
                          {selectedIds.has(file.file_id)
                            ? <CheckSquare size={18} className="text-blue-600" />
                            : <Square size={18} className="text-slate-400 dark:text-slate-500" />
                          }
                        </td>
                      )}
                      <td className="p-4 pl-6 flex items-center space-x-3">
                        <div className="w-8 h-8 bg-slate-50 rounded flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                          <FileAudio size={16} />
                        </div>
                        <span className="font-medium text-slate-800 dark:text-slate-100 text-sm truncate max-w-[220px]">{file.name}</span>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${getSentimentStyle(file.sentiment)}`}>
                          {file.sentiment}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-300">{file.customer}</td>
                      <td className="p-4 text-sm text-slate-500 dark:text-slate-400 text-center">ID {file.agent?.replace(/\D/g, '') || file.agent}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {(file.brands && file.brands.length > 0 ? file.brands : (file.brand ? [file.brand] : [])).map((b, i) => (
                            <span key={i} className="px-2 py-0.5 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-bold rounded uppercase">{b}</span>
                          ))}
                          {!file.brand && (!file.brands || file.brands.length === 0) && <span className="text-slate-400 dark:text-slate-500">-</span>}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                          (file.call_direction || 'outbound').toLowerCase() === 'outbound'
                            ? 'bg-orange-50 text-orange-500 dark:bg-orange-900/20 dark:text-orange-400'
                            : 'bg-blue-50 text-blue-500 dark:bg-blue-900/20 dark:text-blue-400'
                        }`}>
                          {file.call_direction ? file.call_direction.charAt(0).toUpperCase() + file.call_direction.slice(1).toLowerCase() : 'Outbound'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center space-x-1 text-xs font-bold ${getStatusColor(file.status)}`}>
                          {getStatusIcon(file.status)}
                          <span>{file.status}</span>
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDate(file.date)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
              <span>
                Showing <span className="font-bold text-slate-800 dark:text-slate-100">{files.length}</span> of {total} entries
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 text-slate-400 dark:text-slate-500 cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 transition-colors disabled:opacity-30"
                >
                  PREVIOUS
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-medium cursor-pointer transition-colors ${
                      p === page
                        ? 'bg-blue-700 text-white shadow-sm'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="px-4 py-2 text-slate-600 dark:text-slate-300 font-medium hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer disabled:opacity-30"
                >
                  NEXT
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== Delete Confirmation Modal ==================== */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-4" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-50 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                  <Trash2 size={20} className="text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">ยืนยันการลบ</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    จะลบ <span className="text-red-600 font-bold">{selectedIds.size}</span> ไฟล์ พร้อมผลวิเคราะห์ทั้งหมด
                  </p>
                </div>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4">
                <p className="text-sm text-red-700 dark:text-red-300 font-medium">⚠️ การลบไม่สามารถกู้คืนได้ ไฟล์เสียงและผลวิเคราะห์จะถูกลบถาวร</p>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">พิมพ์ <span className="font-mono font-bold text-red-600 bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded">Delete</span> เพื่อยืนยัน:</p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="พิมพ์ Delete ที่นี่"
                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-sm font-mono text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-200 dark:focus:ring-red-900 mb-4"
                autoFocus
              />

              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                  className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-600 cursor-pointer transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleBatchDelete}
                  disabled={deleteConfirmText.trim() !== 'Delete' || deleting}
                  className="px-6 py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {deleting ? <RefreshCw size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  {deleting ? 'กำลังลบ...' : `ลบ ${selectedIds.size} ไฟล์`}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ===== Upload Progress Toast (มุมขวาล่าง) ===== */}
      {uploadQueue.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Upload size={16} className="text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                กำลังอัปโหลด ({uploadQueue.filter(q => q.status === 'done').length}/{uploadQueue.length})
              </h3>
            </div>
            <button
              onClick={() => setUploadQueue([])}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors"
              title="ปิดทั้งหมด"
            >
              <X size={16} />
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto p-2">
            {uploadQueue.map((q) => (
              <div key={q.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 group">
                <div className="shrink-0">
                  {q.status === 'uploading' && <Loader2 size={14} className="animate-spin text-blue-500" />}
                  {q.status === 'done' && <CheckCircle2 size={14} className="text-emerald-500" />}
                  {q.status === 'error' && <AlertCircle size={14} className="text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{q.name}</p>
                  {q.status === 'error' ? (
                    <p className="text-[10px] text-red-500 truncate">{q.error || 'อัปโหลดล้มเหลว'}</p>
                  ) : (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      {q.size}
                      {q.status === 'uploading' && ' · กำลังอัปโหลด'}
                      {q.status === 'done' && ' · เริ่มวิเคราะห์อัตโนมัติ'}
                    </p>
                  )}
                </div>
                {q.status !== 'uploading' && (
                  <button
                    onClick={() => dismissUploadItem(q.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-opacity"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
