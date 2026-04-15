import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile, UserRole } from '../types';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { LogIn, Church } from 'lucide-react';
import { toast } from 'sonner';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchOrCreateProfile(currentUser);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          fetchOrCreateProfile(currentUser);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Subscribe to real-time profile updates when user changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`profile-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `uid=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setProfile(null);
          } else {
            setProfile(payload.new as UserProfile);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const fetchOrCreateProfile = async (authUser: User) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('uid', authUser.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile not found — create a new one
        const newProfile: UserProfile = {
          uid: authUser.id,
          name: authUser.user_metadata?.full_name || authUser.email || 'User',
          email: authUser.email || '',
          role: 'public',
          created_at: new Date().toISOString(),
        };
        const { error: insertError } = await supabase
          .from('users')
          .insert(newProfile);
        if (insertError) {
          console.error('Profile creation error:', insertError);
          toast.error('Failed to create profile.');
        }
        setProfile(newProfile);
      } else if (error) {
        console.error('Profile fetch error:', error);
      } else {
        setProfile(data as UserProfile);
      }
    } catch (err) {
      console.error('Profile error:', err);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error('Sign in error:', error);
      toast.error('Failed to sign in.');
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Signed out successfully.');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to sign out.');
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const AuthGuard: React.FC<{ children: React.ReactNode; allowedRoles?: UserRole[] }> = ({ children, allowedRoles }) => {
  const { profile, loading, signIn } = React.useContext(AuthContext);

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-6 bg-muted/30">
        <div className="flex items-center space-x-3 mb-4">
          <Church className="w-12 h-12 text-primary" />
          <h1 className="text-4xl font-heading font-bold">Ecclesia</h1>
        </div>
        <Card className="w-full max-w-md glass-card">
          <CardHeader>
            <CardTitle>Welcome to Ecclesia Manager</CardTitle>
            <CardDescription>Please sign in to access the platform features.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-6">
            <Button onClick={signIn} size="lg" className="w-full">
              <LogIn className="w-4 h-4 mr-2" />
              Sign in with Google
            </Button>
          </CardContent>
          <CardFooter className="text-xs text-center text-muted-foreground">
            Access is restricted based on your assigned role.
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">You do not have permission to view this section.</p>
        <Button onClick={() => window.location.href = '/'}>Go Home</Button>
      </div>
    );
  }

  return <>{children}</>;
};
