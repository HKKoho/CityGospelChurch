/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useContext } from 'react';
import { AuthProvider, AuthContext, AuthGuard } from './components/Auth';
import { PublicView } from './components/PublicView';
import { CongregationView } from './components/CongregationView';
import { AdminView } from './components/AdminView';
import { KioskMode } from './components/KioskMode';
import { Button } from './components/ui/button';
import { Toaster } from './components/ui/sonner';
import { LogOut, Church, LayoutDashboard, Users, Home, Monitor } from 'lucide-react';
import { Separator } from './components/ui/separator';

const Navigation = () => {
  const { profile, logout } = useContext(AuthContext);
  const [activeTab, setActiveTab] = React.useState<'public' | 'congregation' | 'admin' | 'kiosk'>('public');

  React.useEffect(() => {
    const handleNavigate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.tab) setActiveTab(detail.tab);
    };
    window.addEventListener('navigate', handleNavigate);
    return () => window.removeEventListener('navigate', handleNavigate);
  }, []);

  // Kiosk mode is full-screen — no header/footer
  if (activeTab === 'kiosk') {
    return (
      <AuthGuard allowedRoles={['congregation', 'admin']}>
        <KioskMode />
        <Toaster position="top-center" />
      </AuthGuard>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <div
              className="flex items-center gap-2 font-heading font-bold text-xl cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setActiveTab('public')}
            >
              <Church className="w-6 h-6 text-primary" />
              <span>城市福音教會＋1cm 綜合服務中心</span>
            </div>
            <nav className="hidden md:flex items-center gap-4 text-sm font-medium">
              <Button
                variant={activeTab === 'public' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('public')}
              >
                <Home className="w-4 h-4 mr-2" />
                首頁
              </Button>
              {profile && (profile.role === 'congregation' || profile.role === 'admin') && (
                <>
                  <Button
                    variant={activeTab === 'congregation' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab('congregation')}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    會眾
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab('kiosk')}
                  >
                    <Monitor className="w-4 h-4 mr-2" />
                    自助報到
                  </Button>
                </>
              )}
              {profile && profile.role === 'admin' && (
                <Button
                  variant={activeTab === 'admin' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('admin')}
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  管理
                </Button>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {profile && (
              <div className="flex items-center gap-4">
                <div className="hidden lg:flex flex-col items-end">
                  <span className="text-sm font-medium">{profile.name}</span>
                  <span className="text-xs text-muted-foreground capitalize">{profile.role}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={logout}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container py-6">
        {activeTab === 'public' && <PublicView />}
        {activeTab === 'congregation' && (
          <AuthGuard allowedRoles={['congregation', 'admin']}>
            <CongregationView />
          </AuthGuard>
        )}
        {activeTab === 'admin' && (
          <AuthGuard allowedRoles={['admin']}>
            <AdminView />
          </AuthGuard>
        )}
      </main>

      <footer className="border-t py-12 bg-muted/30">
        <div className="container grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 font-heading font-bold text-xl">
              <Church className="w-6 h-6 text-primary" />
              <span>城市福音教會</span>
            </div>
            <p className="text-sm text-muted-foreground">
              透過現代網頁技術賦能社群。
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-4">平台</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>媒體庫</li>
              <li>場地預約</li>
              <li>點名</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">社群</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>活動</li>
              <li>小組</li>
              <li>志工服務</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">法律</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>隱私政策</li>
              <li>服務條款</li>
            </ul>
          </div>
        </div>
        <div className="container mt-12 pt-8 border-t text-center text-xs text-muted-foreground space-y-1">
          <p>© 2026 城市福音教會。保留所有權利。</p>
          <p>由 AIbyML.com 技術支援</p>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Navigation />
      <Toaster position="top-center" />
    </AuthProvider>
  );
}
