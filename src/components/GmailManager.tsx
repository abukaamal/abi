import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { connectGmailScopes } from '../lib/auth';
import {
  listGmailMessages,
  getGmailMessageDetails,
  sendGmailEmail,
  trashGmailMessage,
  GmailMessageSummary,
} from '../lib/gmail';
import {
  Mail,
  Send,
  RefreshCw,
  Search,
  Trash2,
  Plus,
  ArrowLeft,
  User as UserIcon,
  Clock,
  Inbox,
  AlertCircle,
  CheckCircle2,
  FileText,
  Reply
} from 'lucide-react';

interface GmailManagerProps {
  accessToken: string;
  userEmail?: string | null;
}

export default function GmailManager({ accessToken, userEmail }: GmailManagerProps) {
  const [messages, setMessages] = useState<GmailMessageSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'drafts'>('inbox');

  // Selected Message Modal
  const [selectedMsg, setSelectedMsg] = useState<GmailMessageSummary | null>(null);

  // Compose Modal State
  const [isComposeOpen, setIsComposeOpen] = useState<boolean>(false);
  const [composeTo, setComposeTo] = useState<string>('');
  const [composeSubject, setComposeSubject] = useState<string>('');
  const [composeBody, setComposeBody] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);

  const fetchEmails = async (query = searchQuery) => {
    setLoading(true);
    setError(null);
    try {
      let q = query;
      if (activeTab === 'sent') q = `label:SENT ${query}`.trim();
      if (activeTab === 'drafts') q = `label:DRAFT ${query}`.trim();

      const msgs = await listGmailMessages(accessToken, q, 15);
      setMessages(msgs);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal memuat daftar email dari Gmail');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, [activeTab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEmails(searchQuery);
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo.trim() || !composeSubject.trim() || !composeBody.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Formulir Belum Lengkap',
        text: 'Mohon isi semua kolom Penerima, Subjek, dan Isi Pesan.',
        confirmButtonColor: '#2563eb'
      });
      return;
    }

    setIsSending(true);
    try {
      await sendGmailEmail(accessToken, composeTo, composeSubject, composeBody);
      setIsComposeOpen(false);
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');

      Swal.fire({
        icon: 'success',
        title: 'Email Terkirim!',
        text: `Email berhasil dikirim ke ${composeTo} via Gmail.`,
        timer: 2500,
        showConfirmButton: false
      });

      fetchEmails();
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Mengirim Email',
        text: err.message || 'Terjadi kesalahan saat mengirim pesan via Gmail.',
        confirmButtonColor: '#2563eb'
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (msg: GmailMessageSummary) => {
    const result = await Swal.fire({
      title: 'Hapus Email ini?',
      text: `Email "${msg.subject}" akan dipindahkan ke Sampah Gmail Anda.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        const ok = await trashGmailMessage(accessToken, msg.id);
        if (ok) {
          setMessages((prev) => prev.filter((m) => m.id !== msg.id));
          if (selectedMsg?.id === msg.id) {
            setSelectedMsg(null);
          }
          Swal.fire({
            icon: 'success',
            title: 'Dipindahkan ke Sampah',
            timer: 1500,
            showConfirmButton: false
          });
        } else {
          throw new Error('Gagal menghapus pesan.');
        }
      } catch (err: any) {
        Swal.fire({
          icon: 'error',
          title: 'Gagal',
          text: err.message || 'Tidak dapat menghapus email.',
          confirmButtonColor: '#2563eb'
        });
      }
    }
  };

  const openReplyModal = (msg: GmailMessageSummary) => {
    // Extract raw email address if "Name <email@domain>"
    const match = msg.from.match(/<([^>]+)>/);
    const replyTo = match ? match[1] : msg.from;

    setComposeTo(replyTo);
    setComposeSubject(msg.subject.startsWith('Re:') ? msg.subject : `Re: ${msg.subject}`);
    setComposeBody(`\n\n--- Pesan Asli dari ${msg.from} ---\n${msg.body}`);
    setSelectedMsg(null);
    setIsComposeOpen(true);
  };

  return (
    <div className="w-full max-w-6xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-8">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl text-white">
              <Mail className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Gmail Inbox Integrasi</h2>
              <p className="text-blue-100 text-sm mt-0.5">
                Terhubung sebagai: <span className="font-semibold underline decoration-blue-300">{userEmail || 'Akun Google'}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => fetchEmails()}
            disabled={loading}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white font-medium text-sm rounded-xl backdrop-blur-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Segarkan
          </button>
          <button
            onClick={() => {
              setComposeTo('');
              setComposeSubject('');
              setComposeBody('');
              setIsComposeOpen(true);
            }}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-blue-600 hover:bg-blue-50 active:scale-95 transition-all font-semibold text-sm rounded-xl shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Tulis Email
          </button>
        </div>
      </div>

      {/* Toolbar & Search */}
      <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-2 bg-slate-200/70 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('inbox')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'inbox'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Kotak Masuk
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'sent'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Terkirim
          </button>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Cari email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                fetchEmails('');
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-medium"
            >
              Hapus
            </button>
          )}
        </form>
      </div>

      {/* Email List or Details Container */}
      <div className="min-h-[400px] p-4 sm:p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-3" />
            <p className="font-medium text-slate-600">Mengambil email dari Google Gmail...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-start gap-3 my-4">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
            <div>
              <h4 className="font-semibold text-rose-800">Gagal Mengakses Gmail</h4>
              <p className="text-sm mt-1">{error}</p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={async () => {
                    const newToken = await connectGmailScopes();
                    if (newToken) {
                      fetchEmails();
                    } else {
                      Swal.fire({
                        icon: 'info',
                        title: 'Izin Gmail Dibatasi',
                        text: 'Silakan verifikasi akun Google Anda atau pastikan email diizinkan untuk mengakses API Gmail.',
                        confirmButtonColor: '#2563eb'
                      });
                    }
                  }}
                  className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-all shadow-sm"
                >
                  Hubungkan Izin Gmail
                </button>
                <button
                  onClick={() => fetchEmails()}
                  className="px-4 py-1.5 bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold hover:bg-rose-200 transition-all"
                >
                  Coba Lagi
                </button>
              </div>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Inbox className="w-12 h-12 text-slate-300 mb-2" />
            <p className="font-semibold text-slate-600">Tidak ada email ditemukan</p>
            <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau tab Anda.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            {messages.map((msg) => (
              <div
                key={msg.id}
                onClick={() => setSelectedMsg(msg)}
                className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-blue-50/50 cursor-pointer transition-all ${
                  msg.unread ? 'bg-blue-50/30 font-medium' : 'bg-white'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div
                    className={`p-2.5 rounded-full shrink-0 mt-0.5 ${
                      msg.unread ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800 truncate">
                        {msg.from}
                      </span>
                      {msg.unread && (
                        <span className="inline-block w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                      )}
                    </div>
                    <h4 className="text-sm font-semibold text-slate-900 truncate mt-0.5">
                      {msg.subject}
                    </h4>
                    <p className="text-xs text-slate-500 truncate mt-1">{msg.snippet}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {msg.date ? new Date(msg.date).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : ''}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteMessage(msg);
                    }}
                    title="Hapus / Sampah"
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Message Viewer Modal */}
      {selectedMsg && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <span className="inline-block text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md mb-2">
                  Detail Email
                </span>
                <h3 className="text-xl font-bold text-slate-900 break-words">{selectedMsg.subject}</h3>
              </div>
              <button
                onClick={() => setSelectedMsg(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-xl transition-all shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Sender Metadata */}
            <div className="p-6 border-b border-slate-100 bg-white flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div>
                <p className="text-xs text-slate-500 font-medium">Dari:</p>
                <p className="text-sm font-semibold text-slate-800">{selectedMsg.from}</p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs text-slate-500 font-medium">Waktu:</p>
                <p className="text-xs font-medium text-slate-600">{selectedMsg.date}</p>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 text-slate-800 text-sm leading-relaxed whitespace-pre-wrap font-sans">
              {selectedMsg.body || selectedMsg.snippet}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                onClick={() => handleDeleteMessage(selectedMsg)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-semibold transition-all"
              >
                <Trash2 className="w-4 h-4" />
                Hapus Email
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedMsg(null)}
                  className="px-4 py-2 bg-white text-slate-700 hover:bg-slate-200 border border-slate-300 rounded-xl text-xs font-semibold transition-all"
                >
                  Tutup
                </button>
                <button
                  onClick={() => openReplyModal(selectedMsg)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-xs font-semibold shadow-md transition-all"
                >
                  <Reply className="w-4 h-4" />
                  Balas Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compose Email Modal */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Send className="w-5 h-5" />
                <h3 className="text-lg font-bold">Tulis Email Baru (Gmail)</h3>
              </div>
              <button
                onClick={() => setIsComposeOpen(false)}
                className="text-white/80 hover:text-white text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendEmail} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Penerima (Email) *
                </label>
                <input
                  type="email"
                  required
                  placeholder="contoh@domain.com"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Subjek *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Subjek email..."
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Isi Pesan *
                </label>
                <textarea
                  rows={6}
                  required
                  placeholder="Tulis pesan Anda di sini..."
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsComposeOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Mengirim...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Kirim via Gmail
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
