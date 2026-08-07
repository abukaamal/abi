import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { fetchAccessLogs, AccessLog } from '../lib/auth';
import { ShieldCheck, Clock, User as UserIcon, RefreshCw, Database, CheckCircle, Calendar } from 'lucide-react';

interface AccessLogSectionProps {
  user: User;
  currentAccessTime?: string | null;
}

export default function AccessLogSection({ user, currentAccessTime }: AccessLogSectionProps) {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(true);

  const loadLogs = async () => {
    setLoadingLogs(true);
    const data = await fetchAccessLogs();
    setLogs(data);
    setLoadingLogs(false);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const nowString = currentAccessTime || new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 my-6">
      {/* Current User Verification Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-blue-500/30 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'Profil'}
                className="w-20 h-20 rounded-2xl border-2 border-emerald-400 object-cover shadow-xl shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-2xl border-2 border-emerald-400 shadow-xl shrink-0">
                {(user.displayName || user.email || 'U')[0].toUpperCase()}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-xs font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Akun Google Terverifikasi & Aktif
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                {user.displayName || 'Pengguna Terdaftar'}
              </h2>
              <p className="text-slate-300 text-sm mt-0.5">{user.email}</p>
            </div>
          </div>

          <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700/60 p-4 rounded-2xl w-full md:w-auto shrink-0 flex items-center gap-3">
            <div className="p-3 bg-blue-600/20 text-blue-400 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                Waktu Akses Masuk
              </p>
              <p className="text-sm font-bold text-blue-200 mt-0.5">{nowString}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Access Logs History Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              <h3 className="text-xl font-bold text-slate-900">Riwayat Akses Terverifikasi (Tersimpan)</h3>
            </div>
            <p className="text-slate-500 text-xs mt-1">
              Catatan autentikasi pengguna yang berhasil masuk dengan akun Google valid di aplikasi ini.
            </p>
          </div>

          <button
            onClick={loadLogs}
            disabled={loadingLogs}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
            Segarkan Log
          </button>
        </div>

        {loadingLogs ? (
          <div className="flex items-center justify-center py-12 text-slate-500 gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-sm font-medium">Memuat riwayat akses tersimpan...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-600">Belum ada catatan riwayat lain</p>
            <p className="text-xs text-slate-400 mt-0.5">Sesi Anda saat ini telah berhasil dicatat ke database Firestore.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
            {logs.map((log, idx) => (
              <div
                key={log.id || idx}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-all"
              >
                <div className="flex items-center gap-3">
                  {log.photoURL ? (
                    <img
                      src={log.photoURL}
                      alt={log.displayName}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-sm">
                      {(log.displayName || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-800">{log.displayName}</p>
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    </div>
                    <p className="text-xs text-slate-500">{log.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-100 px-3 py-1.5 rounded-lg w-fit">
                  <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>{log.accessTimeFormatted}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
