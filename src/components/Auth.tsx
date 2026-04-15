import React, { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { UserProfile, UserRole } from '../types';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { LogIn, LogOut, Church } from 'lucide-react';
import { toast } from 'sonner';

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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Fetch or create profile
        const profileRef = doc(db, 'users', firebaseUser.uid);
        
        // Use onSnapshot for real-time profile updates
        const unsubProfile = onSnapshot(profileRef, (doc) => {
          if (doc.exists()) {
            setProfile(doc.data() as UserProfile);
          } else {
            // Create default profile
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || 'User',
              email: firebaseUser.email || '',
              role: 'public',
              createdAt: new Date().toISOString(),
            };
            setDoc(profileRef, newProfile);
            setProfile(newProfile);
          }
          setLoading(false);
        }, (error) => {
          console.error("Profile snapshot error:", error);
          setLoading(false);
        });
        return () => unsubProfile();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success("Successfully signed in!");
    } catch (error) {
      console.error("Sign in error:", error);
      toast.error("Failed to sign in.");
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      toast.success("Signed out successfully.");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to sign out.");
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
