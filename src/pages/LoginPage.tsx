import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { LogIn, UserPlus, Eye, EyeOff, Loader2, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const result = await signUp(email, password);
        if (result.error) {
          setError(result.error);
        } else {
          setSuccess('تم إنشاء الحساب بنجاح! يمكنك الدخول الآن.');
          setIsSignUp(false);
        }
      } else {
        const result = await signIn(email, password);
        if (result.error) {
          setError(result.error);
        }
      }
    } catch {
      setError('حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" dir="rtl"
      style={{
        background: 'linear-gradient(135deg, #091225 0%, #0F1B33 40%, #1a2744 70%, #091225 100%)',
      }}
    >
      {/* Decorative gold particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] right-[15%] w-2 h-2 rounded-full bg-[#E49A0A] opacity-30 animate-pulse" />
        <div className="absolute top-[25%] left-[20%] w-1.5 h-1.5 rounded-full bg-[#C88918] opacity-20 animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute bottom-[30%] right-[25%] w-1 h-1 rounded-full bg-[#E49A0A] opacity-25 animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-[60%] left-[10%] w-2.5 h-2.5 rounded-full bg-[#C88918] opacity-15 animate-pulse" style={{ animationDelay: '1.5s' }} />
        <div className="absolute bottom-[15%] left-[35%] w-1.5 h-1.5 rounded-full bg-[#E49A0A] opacity-20 animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-5"
            style={{
              background: 'linear-gradient(135deg, #E49A0A, #C88918)',
              boxShadow: '0 8px 32px rgba(228, 154, 10, 0.35)',
            }}
          >
            <Sparkles className="w-10 h-10 text-[#091225]" />
          </div>
          <h1 className="text-2xl font-black text-white mb-2">إدارة الذهب</h1>
          <p className="text-sm text-slate-400">نظام محاسبة وتوزيع المجوهرات</p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl p-6 sm:p-8"
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          }}
        >
          <h2 className="text-lg font-bold text-white mb-6 text-center">
            {isSignUp ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                البريد الإلكتروني
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                required
                dir="ltr"
                className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 outline-none transition-all duration-200 focus:ring-2 focus:ring-[#E49A0A]"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                }}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  dir="ltr"
                  className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 outline-none transition-all duration-200 focus:ring-2 focus:ring-[#E49A0A] pl-12"
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-xl text-sm font-medium text-center"
                style={{
                  background: 'rgba(214, 69, 69, 0.15)',
                  border: '1px solid rgba(214, 69, 69, 0.3)',
                  color: '#FF6B6B',
                }}
              >
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="p-3 rounded-xl text-sm font-medium text-center"
                style={{
                  background: 'rgba(7, 135, 95, 0.15)',
                  border: '1px solid rgba(7, 135, 95, 0.3)',
                  color: '#4ADE80',
                }}
              >
                {success}
              </div>
            )}

            {/* Submit Button */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-[15px] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60"
              style={{
                background: 'linear-gradient(135deg, #E49A0A, #C88918)',
                color: '#091225',
                boxShadow: '0 4px 20px rgba(228, 154, 10, 0.3)',
              }}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isSignUp ? (
                <>
                  <UserPlus size={18} />
                  إنشاء حساب
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  دخول
                </>
              )}
            </button>
          </form>

          {/* Toggle Sign Up / Sign In */}
          <div className="mt-6 text-center">
            <button
              id="toggle-auth-mode"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setSuccess(null);
              }}
              className="text-sm text-slate-400 hover:text-[#E49A0A] transition-colors"
            >
              {isSignUp ? 'عندك حساب؟ سجّل دخول' : 'ما عندك حساب؟ أنشئ حساب جديد'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-600 mt-6">
          نظام إدارة الذهب © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
