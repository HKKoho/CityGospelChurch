import React, { useState, useEffect } from 'react';
import { auth, poll } from '../lib/api';
import { UserProfile, UserRole } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { LogIn, Church } from 'lucide-react';
import { toast } from 'sonner';

interface AuthContextType {
  user: UserProfile | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = React.createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signIn: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);

  // Check existing session on mount
  useEffect(() => {
    auth.session()
      .then(({ user }) => {
        setProfile(user as UserProfile | null);
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));

    // Poll for profile updates (e.g. role changes by admin) every 30s
    const stop = poll(async () => {
      try {
        const { user } = await auth.session();
        setProfile(user as UserProfile | null);
      } catch {
        // ignore
      }
    }, 30000);

    return stop;
  }, []);

  const signIn = async () => {
    setShowLogin(true);
  };

  const handleLogin = async (username: string, password: string) => {
    try {
      const { user } = await auth.login(username, password);
      setProfile(user as UserProfile);
      setShowLogin(false);
      toast.success('登入成功。');
    } catch (error: any) {
      toast.error(error.message || '登入失敗。');
    }
  };

  const logout = async () => {
    try {
      await auth.logout();
      setProfile(null);
      toast.success('已成功登出。');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('登出失敗。');
    }
  };

  return (
    <AuthContext.Provider value={{ user: profile, profile, loading, signIn, logout }}>
      {showLogin && !profile && (
        <LoginModal
          onLogin={handleLogin}
          onCancel={() => setShowLogin(false)}
        />
      )}
      {children}
    </AuthContext.Provider>
  );
};

// Login modal component
const LoginModal: React.FC<{
  onLogin: (username: string, password: string) => void;
  onCancel: () => void;
}> = ({ onLogin, onCancel }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setSubmitting(true);
    try {
      await onLogin(username, password);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogIn className="w-5 h-5" />
              登入
            </CardTitle>
            <CardDescription>請輸入您的帳號密碼。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">帳號</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密碼</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={submitting}>
              {submitting ? '登入中...' : '登入'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              取消
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export const AuthGuard: React.FC<{ children: React.ReactNode; allowedRoles?: UserRole[] }> = ({ children, allowedRoles }) => {
  const { profile, loading, signIn } = React.useContext(AuthContext);

  if (loading) return <div className="flex items-center justify-center h-screen">載入中...</div>;

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-6 bg-muted/30">
        <div className="flex items-center space-x-3 mb-4">
          <Church className="w-12 h-12 text-primary" />
          <h1 className="text-4xl font-heading font-bold">城市福音教會</h1>
        </div>
        <Card className="w-full max-w-md glass-card">
          <CardHeader>
            <CardTitle>歡迎來到城市福音教會</CardTitle>
            <CardDescription>請登入以使用平台功能。</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-6">
            <Button onClick={signIn} size="lg" className="w-full">
              <LogIn className="w-4 h-4 mr-2" />
              登入
            </Button>
          </CardContent>
          <CardFooter className="text-xs text-center text-muted-foreground">
            存取權限依據您的指定角色而定。
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <h2 className="text-2xl font-bold">拒絕存取</h2>
        <p className="text-muted-foreground">您沒有權限檢視此區域。</p>
        <Button onClick={() => window.location.href = '/'}>回到首頁</Button>
      </div>
    );
  }

  return <>{children}</>;
};
