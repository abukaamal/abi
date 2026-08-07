import React, { useState } from 'react';
import { googleSignIn } from '../lib/auth';
import { User } from 'firebase/auth';
import { Mail, ShieldAlert } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: User, token: string) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setErrorMsg(null);
    try {
      const result = await googleSignIn();
      if (result) {
        onLoginSuccess(result.user, result.accessToken);
      }
    } catch (err: any) {
      if (
        err.code === 'auth/popup-closed-by-user' || 
        err.code === 'auth/cancelled-popup-request' ||
        err?.message?.includes('closing') ||
        err?.message?.includes('hidden')
      ) {
        // Gently reset without scary warning if closed by user
        setErrorMsg(null);
      } else if (err.code !== 'auth/popup-blocked') {
        console.error('Login failed:', err);
        setErrorMsg(
          err.message || 'Gagal masuk dengan Akun Google. Silakan coba lagi.'
        );
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-900 text-slate-100 flex items-center justify-center px-6 sm:px-8 py-8 relative overflow-hidden font-sans">
      {/* Subtle Background Lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-[340px] bg-slate-800/80 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-7 sm:p-9 shadow-2xl relative z-10 text-center flex flex-col items-center">
        {/* Minimal Icon */}
        <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 mb-5 flex items-center justify-center text-blue-400">
          <Mail className="w-7 h-7" />
        </div>

        <h1 className="text-xl font-bold text-white tracking-tight mb-6">
          Imat Abu Kamal
        </h1>

        {errorMsg && (
          <div className="w-full mb-6 p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs text-left leading-relaxed flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Minimal Google Sign-In Button */}
        <button
          onClick={handleLogin}
          disabled={isLoggingIn}
          className="w-full relative flex items-center justify-center gap-3 bg-white hover:bg-slate-100 active:scale-[0.98] text-slate-800 font-semibold py-3.5 px-6 rounded-xl shadow-md transition-all duration-200 disabled:opacity-60 cursor-pointer my-2"
        >
          {isLoggingIn ? (
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-medium text-slate-700">Menghubungkan...</span>
            </div>
          ) : (
            <>
              <svg className="w-6 h-6 shrink-0" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              </svg>
              <span className="text-sm font-semibold text-slate-800">Masuk dengan Google</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
