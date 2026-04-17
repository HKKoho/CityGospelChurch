import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, UserPlus, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ChurchAuthProps {
  onSuccess: (last_four: string, name: string) => void;
}

type Mode = 'login' | 'signup';

const PASSWORD_REGEX = /^[A-Za-z0-9]{8}$/;
const DIGITS_REGEX = /^\d{4}$/;

// SHA-256 hash using browser Web Crypto API — no RPC needed
async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export const ChurchAuth: React.FC<ChurchAuthProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<Mode>('login');
  const [last_four, setLastFour] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const passwordStrength = () => ({
    validLen: password.length === 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasDigit: /[0-9]/.test(password),
  });

  const validate = (): string => {
    if (!DIGITS_REGEX.test(last_four)) return '請輸入正確的 4 位數字';
    if (!PASSWORD_REGEX.test(password)) return '密碼必須為 8 位英數字元（不可含特殊符號）';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    try {
      const hash = await sha256(last_four + password); // salt with last_four

      if (mode === 'signup') {
        // Upsert password hash directly into church_auth table
        const { error: upsertError } = await supabase
          .from('church_auth')
          .upsert(
            { last_four_digits: last_four, password_hash: hash, updated_at: new Date().toISOString() },
            { onConflict: 'last_four_digits' }
          );
        if (upsertError) throw upsertError;
        setSuccess('註冊成功！正在登入...');
      }

      // Sign in: verify hash matches stored record
      const { data, error: selectError } = await supabase
        .from('church_auth')
        .select('last_four_digits')
        .eq('last_four_digits', last_four)
        .eq('password_hash', hash)
        .maybeSingle();

      if (selectError) throw selectError;
      if (!data) throw new Error('Invalid credentials');

      // Look up name from worksheet
      const { data: member } = await supabase
        .from('worksheet')
        .select('name')
        .eq('last_four_digits', last_four)
        .maybeSingle();

      const name = member?.name || '';
      localStorage.setItem('church_session', JSON.stringify({ last_four, name }));
      onSuccess(last_four, name);

    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('Invalid credentials')) {
        setError('號碼或密碼不正確。');
      } else {
        setError('發生錯誤，請重試。');
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError('');
    setSuccess('');
    setPassword('');
  };

  const strength = passwordStrength();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-sm mx-auto"
    >
      {/* Mode toggle */}
      <div className="flex rounded-xl bg-muted p-1 mb-6">
        <button
          type="button"
          onClick={() => switchMode('login')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'login' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <LogIn className="w-4 h-4 inline mr-1 -mt-0.5" />
          登入
        </button>
        <button
          type="button"
          onClick={() => switchMode('signup')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'signup' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <UserPlus className="w-4 h-4 inline mr-1 -mt-0.5" />
          註冊 · 忘記密碼
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">手機末 4 碼</label>
          <Input
            type="text"
            inputMode="numeric"
            maxLength={4}
            placeholder="例：1234"
            value={last_four}
            onChange={e => setLastFour(e.target.value.replace(/\D/g, '').slice(0, 4))}
            className="text-center text-2xl tracking-[1rem] font-mono h-14"
            disabled={loading}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">密碼（8 位英數字元）</label>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              maxLength={8}
              placeholder="8 位英數字元"
              value={password}
              onChange={e => setPassword(e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 8))}
              className="pr-10 font-mono"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {password.length > 0 && (
            <div className="grid grid-cols-2 gap-1 pt-1">
              {([
                [strength.validLen, '8 個字元'],
                [strength.hasUpper, '含大寫英文'],
                [strength.hasLower, '含小寫英文'],
                [strength.hasDigit, '含數字'],
              ] as [boolean, string][]).map(([ok, label]) => (
                <div key={label} className={`flex items-center gap-1 text-xs ${ok ? 'text-green-600' : 'text-muted-foreground'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-green-500' : 'bg-muted-foreground/40'}`} />
                  {label}
                </div>
              ))}
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div key="error" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </motion.div>
          )}
          {success && (
            <motion.div key="success" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />{success}
            </motion.div>
          )}
        </AnimatePresence>

        <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
          {loading ? '處理中...' : mode === 'login' ? '登入' : '註冊 / 重設密碼'}
        </Button>
      </form>

      {mode === 'signup' && (
        <p className="text-xs text-muted-foreground text-center mt-4">
          若已有帳號，使用相同號碼重新註冊即可重設密碼。
        </p>
      )}
    </motion.div>
  );
};
