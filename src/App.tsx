/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useContext } from 'react';
import { AuthProvider, AuthContext, AuthGuard } from './components/Auth';
import { PublicView } from './components/PublicView';
import { CongregationView } from './components/CongregationView';
import { AdminView } from './components/AdminView';
import { Button } from './components/ui/button';
import { Toaster } from './components/ui/sonner';
import { LogOut, Church, LayoutDashboard, Globe, Users } from 'lucide-react';
import { Separator } from './components/ui/separator';

const Navigation = () => {
  const { profile, logout } = useContext(AuthContext);
  const [activeTab, setActiveTab] = React.useState<'public' | 'congregation' | 'admin'>('public');

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 font-heading font-bold text-xl">
              <Church className="w-6 h-6 text-primary" />
              <span>Ecclesia</span>
            </div>
            <nav className="hidden md:flex items-center gap-4 text-sm font-medium">
              <Button 
                variant={activeTab === 'public' ? 'secondary' : 'ghost'} 
                size="sm"
                onClick={() => setActiveTab('public')}
              >
                <Globe className="w-4 h-4 mr-2" />
                Public
              </Button>
              {profile && (profile.role === 'congregation' || profile.role === 'admin') && (
                <Button 
                  variant={activeTab === 'congregation' ? 'secondary' : 'ghost'} 
                  size="sm"
                  onClick={() => setActiveTab('congregation')}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Congregation
                </Button>
              )}
              {profile && profile.role === 'admin' && (
                <Button 
                  variant={activeTab === 'admin' ? 'secondary' : 'ghost'} 
                  size="sm"
                  onClick={() => setActiveTab('admin')}
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Admin
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
              <span>Ecclesia</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Empowering communities through contemporary web architectures.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-4">Platform</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Media Library</li>
              <li>Room Bookings</li>
              <li>Roll Call</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Community</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Events</li>
              <li>Groups</li>
              <li>Volunteering</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Privacy Policy</li>
              <li>Terms of Service</li>
            </ul>
          </div>
        </div>
        <div className="container mt-12 pt-8 border-t text-center text-xs text-muted-foreground">
          © 2026 Ecclesia Manager. All rights reserved.
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
