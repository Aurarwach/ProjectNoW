'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/components/AuthProvider';
import {
  ShieldAlert, Users as UsersIcon, ScrollText, Search,
  ChevronRight, RefreshCw, Filter, Activity, UserCog,
  CheckCircle2, XCircle, Calendar, Clock
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ----- Types -----
interface AdminUser {
  admin_user_id: number;
  username: string;
  full_name: string;
  email: string | null;
  role: 'ADMIN' | 'STAFF' | 'VIEWER';
  is_active: number;
  created_at: string;
  updated_at: string | null;
}

interface ActivityLog {
  log_id: number;
  actor_user_id: number | null;
  actor_username: string;
  actor_role: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  target_label: string | null;
  detail: string | null;
  ip_address: string | null;
  created_at: string;
}

interface LogStats {
  total_logs: number;
  logs_last_7_days: number;
  top_actions: { action: string; c: number }[];
  top_actors: { actor_username: string; c: number }[];
}

type Tab = 'users' | 'logs';

// ----- Action color helper -----
const ACTION_COLORS: Record<string, string> = {
  LOGIN:             'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50',
  LOGOUT:            'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
  REGISTER:          'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50',
  UPDATE_ROLE:       'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50',
  ACTIVATE_USER:     'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50',
  DEACTIVATE_USER:   'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50',
  UPLOAD_FILE:       'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800/50',
  ANALYZE_FILE:      'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800/50',
  DELETE_FILE:       'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50',
  DELETE_FILE_BATCH: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50',
  REANALYZE_FILE:    'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800/50',
};

function actionBadgeClass(action: string): string {
  return ACTION_COLORS[action] || 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN:  'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800/50',
  STAFF:  'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50',
  VIEWER: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
};


export default function AdminManagementPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('users');

  // Users tab
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Logs tab
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logTotal, setLogTotal] = useState(0);
  const [logSearch, setLogSearch] = useState('');
  const [logActionFilter, setLogActionFilter] = useState('');
  const [logDateFrom, setLogDateFrom] = useState('');
  const [logDateTo, setLogDateTo] = useState('');
  const [stats, setStats] = useState<LogStats | null>(null);

  // ===== Users API =====
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams();
      if (userSearch) params.set('search', userSearch);
      if (roleFilter) params.set('role', roleFilter);
      const res = await fetch(`${API_BASE}/api/v1/admin/users?${params}`);
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      setUsers(data.users || []);
    } catch (e) {
      console.error('fetch users error', e);
    } finally {
      setUsersLoading(false);
    }
  }, [userSearch, roleFilter]);

  const handleChangeRole = async (u: AdminUser, newRole: string) => {
    if (newRole === u.role) return;
    // กัน admin ทำเปลี่ยน role ตัวเอง
    if (u.admin_user_id === user?.admin_user_id) {
      alert('ไม่สามารถเปลี่ยน role ของตัวเองได้');
      return;
    }
    if (!confirm(`เปลี่ยน role ของ "${u.username}" จาก ${u.role} → ${newRole}?`)) return;

    setUpdatingId(u.admin_user_id);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/users/${u.admin_user_id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_role: newRole,
          actor_user_id: user?.admin_user_id,
          actor_username: user?.username,
          actor_role: user?.role,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'update failed');
      // refresh
      await fetchUsers();
    } catch (e: any) {
      alert('เกิดข้อผิดพลาด: ' + (e?.message || 'unknown'));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleActive = async (u: AdminUser) => {
    if (u.admin_user_id === user?.admin_user_id) {
      alert('ไม่สามารถปิดบัญชีของตัวเองได้');
      return;
    }
    const newActive = !u.is_active;
    const verb = newActive ? 'เปิดใช้งาน' : 'ระงับ';
    if (!confirm(`${verb}บัญชี "${u.username}"?`)) return;

    setUpdatingId(u.admin_user_id);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/users/${u.admin_user_id}/active`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_active: newActive,
          actor_user_id: user?.admin_user_id,
          actor_username: user?.username,
          actor_role: user?.role,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'update failed');
      }
      await fetchUsers();
    } catch (e: any) {
      alert('เกิดข้อผิดพลาด: ' + (e?.message || 'unknown'));
    } finally {
      setUpdatingId(null);
    }
  };

  // ===== Logs API =====
  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams();
      if (logSearch) params.set('search', logSearch);
      if (logActionFilter) params.set('action', logActionFilter);
      if (logDateFrom) params.set('date_from', logDateFrom);
      if (logDateTo) params.set('date_to', logDateTo);
      params.set('limit', '200');

      const res = await fetch(`${API_BASE}/api/v1/admin/logs?${params}`);
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      setLogs(data.logs || []);
      setLogTotal(data.total || 0);
    } catch (e) {
      console.error('fetch logs error', e);
    } finally {
      setLogsLoading(false);
    }
  }, [logSearch, logActionFilter, logDateFrom, logDateTo]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/logs/stats`);
      if (!res.ok) return;
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error('fetch stats error', e);
    }
  }, []);

  // ===== Effects =====
  useEffect(() => {
    if (tab === 'users') fetchUsers();
  }, [tab, fetchUsers]);

  useEffect(() => {
    if (tab === 'logs') {
      fetchLogs();
      fetchStats();
    }
  }, [tab, fetchLogs, fetchStats]);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />

      <main className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900 p-4 sm:p-5 lg:p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h1 className="text-[24px] sm:text-[28px] md:text-[32px] font-black tracking-tight text-[#4F46E5] dark:text-violet-400 leading-none">Admin</h1>
            <h1 className="text-[24px] sm:text-[28px] md:text-[32px] font-black tracking-tight text-[#0F172A] dark:text-slate-100 leading-none">Management</h1>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
            <ShieldAlert size={14} className="text-violet-500" />
            <span>User roles · Activity logs</span>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="inline-flex items-center gap-1 p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl mb-6 shadow-sm">
          <button
            onClick={() => setTab('users')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              tab === 'users'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <UsersIcon size={16} />
            User Management
          </button>
          <button
            onClick={() => setTab('logs')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              tab === 'logs'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <ScrollText size={16} />
            Activity Logs
          </button>
        </div>

        {/* === Tab: Users === */}
        {tab === 'users' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="ค้นหา username, ชื่อ, email..."
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                  />
                </div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 cursor-pointer"
                >
                  <option value="">ทุก Role</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="STAFF">STAFF</option>
                  <option value="VIEWER">VIEWER</option>
                </select>
                <button
                  onClick={() => fetchUsers()}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer flex items-center gap-2"
                >
                  <RefreshCw size={14} className={usersLoading ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>
            </div>

            {/* User table */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-700/30 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ID</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">User</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Created</th>
                      <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {usersLoading ? (
                      <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-sm">กำลังโหลด...</td></tr>
                    ) : users.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-sm">ไม่พบข้อมูล</td></tr>
                    ) : (
                      users.map((u) => {
                        const isMe = u.admin_user_id === user?.admin_user_id;
                        return (
                          <tr key={u.admin_user_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                            <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 font-mono">#{u.admin_user_id}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-sm font-bold">
                                  {u.full_name.charAt(0)}
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                    {u.full_name}
                                    {isMe && <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">YOU</span>}
                                  </div>
                                  <div className="text-xs text-slate-400 font-mono">@{u.username}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{u.email || '-'}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-block px-2.5 py-1 text-[11px] font-bold rounded-full border ${ROLE_COLORS[u.role]}`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {u.is_active ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                                  <CheckCircle2 size={12} /> Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400">
                                  <XCircle size={12} /> Suspended
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 font-mono">
                              {u.created_at?.split(' ')[0]}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-2">
                                <select
                                  value={u.role}
                                  onChange={(e) => handleChangeRole(u, e.target.value)}
                                  disabled={isMe || updatingId === u.admin_user_id}
                                  className="px-2 py-1 text-xs bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                  title={isMe ? 'ไม่สามารถเปลี่ยน role ของตัวเองได้' : 'เปลี่ยน role'}
                                >
                                  <option value="ADMIN">ADMIN</option>
                                  <option value="STAFF">STAFF</option>
                                  <option value="VIEWER">VIEWER</option>
                                </select>
                                <button
                                  onClick={() => handleToggleActive(u)}
                                  disabled={isMe || updatingId === u.admin_user_id}
                                  className={`px-2.5 py-1 text-xs font-medium rounded-md border cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                                    u.is_active
                                      ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:text-red-400 dark:border-red-800/50'
                                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50'
                                  }`}
                                  title={isMe ? 'ไม่สามารถ disable ตัวเองได้' : (u.is_active ? 'ระงับบัญชี' : 'เปิดใช้งาน')}
                                >
                                  {u.is_active ? 'Suspend' : 'Activate'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* === Tab: Logs === */}
        {tab === 'logs' && (
          <div className="space-y-4">
            {/* Stats cards */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold mb-2">
                    <Activity size={13} />
                    Total Logs
                  </div>
                  <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.total_logs.toLocaleString()}</div>
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold mb-2">
                    <Clock size={13} />
                    Last 7 Days
                  </div>
                  <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.logs_last_7_days.toLocaleString()}</div>
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold mb-2">
                    <UserCog size={13} />
                    Top Action
                  </div>
                  <div className="text-base font-bold text-slate-800 dark:text-slate-100 truncate">
                    {stats.top_actions[0]?.action || '-'}
                  </div>
                  <div className="text-xs text-slate-400">{stats.top_actions[0]?.c || 0} times</div>
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold mb-2">
                    <UsersIcon size={13} />
                    Most Active
                  </div>
                  <div className="text-base font-bold text-slate-800 dark:text-slate-100 truncate">
                    {stats.top_actors[0]?.actor_username || '-'}
                  </div>
                  <div className="text-xs text-slate-400">{stats.top_actors[0]?.c || 0} actions</div>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="relative lg:col-span-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    placeholder="ค้นหา action, user, target..."
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                  />
                </div>
                <select
                  value={logActionFilter}
                  onChange={(e) => setLogActionFilter(e.target.value)}
                  className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 cursor-pointer"
                >
                  <option value="">All Actions</option>
                  <option value="LOGIN">LOGIN</option>
                  <option value="LOGOUT">LOGOUT</option>
                  <option value="REGISTER">REGISTER</option>
                  <option value="UPDATE_ROLE">UPDATE_ROLE</option>
                  <option value="ACTIVATE_USER">ACTIVATE_USER</option>
                  <option value="DEACTIVATE_USER">DEACTIVATE_USER</option>
                  <option value="UPLOAD_FILE">UPLOAD_FILE</option>
                  <option value="ANALYZE_FILE">ANALYZE_FILE</option>
                  <option value="DELETE_FILE">DELETE_FILE</option>
                  <option value="DELETE_FILE_BATCH">DELETE_FILE_BATCH</option>
                  <option value="REANALYZE_FILE">REANALYZE_FILE</option>
                </select>
                <input
                  type="date"
                  value={logDateFrom}
                  onChange={(e) => setLogDateFrom(e.target.value)}
                  className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 cursor-pointer"
                  title="ตั้งแต่วันที่"
                />
                <input
                  type="date"
                  value={logDateTo}
                  onChange={(e) => setLogDateTo(e.target.value)}
                  className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 cursor-pointer"
                  title="ถึงวันที่"
                />
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {logTotal.toLocaleString()} logs · แสดง {logs.length}
                </span>
                <button
                  onClick={() => fetchLogs()}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw size={12} className={logsLoading ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>
            </div>

            {/* Log table */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-700/30 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Time</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actor</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Action</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Target</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Detail</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {logsLoading ? (
                      <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">กำลังโหลด...</td></tr>
                    ) : logs.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">ไม่พบ logs</td></tr>
                    ) : (
                      logs.map((log) => (
                        <tr key={log.log_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">
                            {log.created_at}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{log.actor_username}</div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider">{log.actor_role}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded border ${actionBadgeClass(log.action)}`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                            {log.target_label || (log.target_id ? `#${log.target_id}` : '-')}
                            {log.target_type && (
                              <div className="text-[10px] text-slate-400 mt-0.5">{log.target_type}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                            {log.detail || '-'}
                          </td>
                          <td className="px-4 py-3 text-[10px] text-slate-400 font-mono">{log.ip_address || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
