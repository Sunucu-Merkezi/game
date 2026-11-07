'use client';
import { Server, Shield, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { Logo } from '@/components/brand';
import { Button } from '@/components/ui/primitives';
import { apiFetch } from '@/lib/api-client';

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await apiFetch(mode === 'login' ? '/auth/login' : '/auth/register', {
        method: 'POST',
        body: JSON.stringify(mode === 'login' ? { username, password } : { username, password, company }),
      });
      router.replace('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
      setBusy(false);
    }
  }

  const input = 'w-full rounded-lg border border-line bg-panel2 px-3 py-2.5 text-sm text-white outline-none transition focus:border-neon';
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between border-r border-line p-12 lg:flex">
        <Logo size="lg" />
        <div className="space-y-6">
          <h2 className="text-4xl font-semibold leading-tight text-white">
            Sıfırdan başla.<br /><span className="text-neonSoft">Veri merkezi imparatorluğunu kur.</span>
          </h2>
          <ul className="space-y-3 text-sm text-slate-300">
            <li className="flex items-center gap-3"><Server size={16} className="text-neonSoft" /> Rack, sunucu, soğutma ve network’ü kendin yönet</li>
            <li className="flex items-center gap-3"><Zap size={16} className="text-neonSoft" /> Sen çevrimdışıyken de ekonomi işlemeye devam eder</li>
            <li className="flex items-center gap-3"><Shield size={16} className="text-neonSoft" /> DDoS, yangın ve arızalara hazırlıklı ol, rakiplerle yarış</li>
          </ul>
        </div>
        <p className="text-xs text-slate-500">© Sunucu Merkezi</p>
      </section>
      <section className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="fade-up w-full max-w-sm space-y-4">
          <div className="lg:hidden"><Logo /></div>
          <div>
            <h1 className="text-2xl font-semibold text-white">{mode === 'login' ? 'Tekrar hoş geldin' : 'Şirketini kur'}</h1>
            <p className="mt-1 text-sm text-slate-400">{mode === 'login' ? 'Hesabınla giriş yap ve kaldığın yerden devam et.' : '60.000 ₺ başlangıç sermayesiyle işe başla.'}</p>
          </div>
          <label className="block text-xs text-slate-400">Kullanıcı adı
            <input className={input + ' mt-1'} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required minLength={3} maxLength={20} />
          </label>
          {mode === 'register' && (
            <label className="block text-xs text-slate-400">Şirket adı
              <input className={input + ' mt-1'} value={company} onChange={(e) => setCompany(e.target.value)} maxLength={32} placeholder="Örn. Mavi Bulut Hosting" />
            </label>
          )}
          <label className="block text-xs text-slate-400">Şifre
            <input className={input + ' mt-1'} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={6} />
          </label>
          {error && <p className="rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad" role="alert">{error}</p>}
          <Button type="submit" disabled={busy} className="w-full">{busy ? 'Lütfen bekle…' : mode === 'login' ? 'Giriş yap' : 'Hesap oluştur ve başla'}</Button>
          <button type="button" className="w-full text-center text-sm text-neonSoft hover:underline" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
            {mode === 'login' ? 'Hesabın yok mu? Kayıt ol' : 'Zaten hesabın var mı? Giriş yap'}
          </button>
        </form>
      </section>
    </main>
  );
}
