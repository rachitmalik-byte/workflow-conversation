import React, { useState } from 'react';
import { supabase } from '../../services/supabase';
import { dbClient } from '../../services/dbClient';
import { Mail, Lock, User, AlertCircle, Loader2 } from 'lucide-react';

interface AuthPageProps {
  onBypass: () => void;
  onSuccess: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onBypass, onSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'head' | 'growth_specialist'>('growth_specialist');
  const [designation, setDesignation] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError('Supabase client is not initialized. Please verify configuration keys.');
      return;
    }

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all credentials.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        if (!fullName.trim()) {
          setError('Please specify your Full Name.');
          setIsLoading(false);
          return;
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
        });

        if (signUpError) throw signUpError;

        if (data?.user) {
          // Fallback: create profile record
          const { error: profileError } = await supabase.from('profiles').insert({
            id: data.user.id,
            full_name: fullName.trim(),
            email: email.trim(),
            role: role,
            designation: designation.trim() || (role === 'head' ? 'Head of Growth' : 'Growth Specialist'),
            status: 'active'
          });
          if (profileError) console.error('Profile creation error:', profileError);
        }

        alert('Account created successfully! Please sign in with your credentials.');
        setIsSignUp(false);
        setPassword('');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (signInError) throw signInError;
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!supabase) {
      setError('Please configure your production database credentials below first.');
      setShowDbConfig(true);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          scopes: 'https://www.googleapis.com/auth/chat.spaces.readonly https://www.googleapis.com/auth/chat.messages.readonly https://www.googleapis.com/auth/chat.messages.create'
        }
      });
      if (oauthError) throw oauthError;
    } catch (err: any) {
      setError(err.message || 'Failed to start Google OAuth.');
    } finally {
      setIsLoading(false);
    }
  };

  const [showDbConfig, setShowDbConfig] = useState(false);
  const [dbUrl, setDbUrl] = useState('');
  const [dbKey, setDbKey] = useState('');

  const handleSaveDbConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dbUrl.trim() || !dbKey.trim()) {
      setError('Please provide both Supabase URL and Anon Key.');
      return;
    }
    dbClient.setSupabaseConfig(dbUrl.trim(), dbKey.trim());
    alert('Production database credentials applied! Reloading...');
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 text-center">
      <div className="w-full max-w-md border border-border bg-card p-6 rounded-lg shadow-sm space-y-6">
        
        {/* Brand logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-primary text-white font-bold text-xl">
            R
          </div>
          <h2 className="text-xl font-extrabold text-foreground tracking-tight">RelayHQ Setup</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Internal Sales Engagement & Execution Command Center
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-danger/10 border border-danger/20 p-3 rounded text-danger text-xs text-left">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4 text-xs sm:text-sm text-left">
          {isSignUp && (
            <>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full pl-10 pr-3 py-2 border border-border bg-background text-foreground text-xs rounded focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Designation / Job Title
                </label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Senior SDR, VP of Sales"
                  className="w-full px-3 py-2 border border-border bg-background text-foreground text-xs rounded focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Workspace Permission Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'head' | 'growth_specialist')}
                  className="w-full px-3 py-2 border border-border bg-background text-foreground text-xs rounded focus:outline-none focus:border-primary font-semibold"
                >
                  <option value="growth_specialist">Growth Specialist (Employee / Team Member)</option>
                  <option value="head">Head of Growth (Manager / Administrator)</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Work Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full pl-10 pr-3 py-2 border border-border bg-background text-foreground text-xs rounded focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Secure Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3 py-2 border border-border bg-background text-foreground text-xs rounded focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 bg-primary hover:bg-primary/95 text-white rounded text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 font-bold"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isSignUp ? (
              'Create Workspace Account'
            ) : (
              'Sign In'
            )}
          </button>

          {/* Google Login Button */}
          {!isSignUp && (
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full py-2 bg-white hover:bg-slate-50 border border-border text-slate-700 rounded text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-65"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>Sign In with Google</span>
            </button>
          )}
        </form>

        <div className="text-xs text-muted-foreground space-y-4">
          <p>
            {isSignUp ? 'Already onboarded?' : 'Need a workspace profile?'}{' '}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              className="text-primary hover:underline font-semibold"
            >
              {isSignUp ? 'Sign In instead' : 'Register Profile'}
            </button>
          </p>

          {isSignUp && (
            <p className="text-[10px] text-muted-foreground bg-muted/40 p-2 rounded border border-border/40 leading-normal">
              💡 <strong>Admin Note</strong>: Disabling email confirmation in your Supabase Auth settings allows teammates to register and log in instantly without waiting for verification emails.
            </p>
          )}

          <hr className="border-border/60" />

          {/* Production Database Credentials setup directly on Login screen */}
          <div className="space-y-2 text-left bg-muted/20 border border-border/40 p-3.5 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${supabase ? 'bg-success animate-pulse' : 'bg-primary'}`} />
                <span>{supabase ? 'Production Connected' : 'Running Offline Sandbox'}</span>
              </span>
              <button
                type="button"
                onClick={() => setShowDbConfig(!showDbConfig)}
                className="text-[10px] text-primary font-semibold hover:underline cursor-pointer"
              >
                {showDbConfig ? 'Hide Settings' : 'Configure Database'}
              </button>
            </div>

            {showDbConfig && (
              <form onSubmit={handleSaveDbConfig} className="space-y-3 mt-2.5 border-t border-border/40 pt-2.5">
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Supabase Project URL
                  </label>
                  <input
                    type="text"
                    required
                    value={dbUrl}
                    onChange={(e) => setDbUrl(e.target.value)}
                    placeholder="https://xyz.supabase.co"
                    className="w-full px-2.5 py-1.5 bg-background border border-border text-foreground text-xs rounded focus:outline-none focus:border-primary font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Anon API Key
                  </label>
                  <input
                    type="password"
                    required
                    value={dbKey}
                    onChange={(e) => setDbKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full px-2.5 py-1.5 bg-background border border-border text-foreground text-xs rounded focus:outline-none focus:border-primary font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-1.5 bg-primary text-white text-[10px] font-bold rounded hover:bg-primary/95 transition-colors cursor-pointer text-center"
                >
                  Save and Connect Database
                </button>
              </form>
            )}

            {!supabase && !showDbConfig && (
              <p className="text-[10px] text-muted-foreground/80 leading-normal">
                To connect your live database, click <strong>Configure Database</strong>. Otherwise, click below to review sandbox screens offline.
              </p>
            )}

            {!showDbConfig && (
              <button
                onClick={onBypass}
                className="w-full mt-1.5 py-1.5 bg-muted hover:bg-muted/80 text-foreground border border-border rounded text-[10px] font-bold transition-colors cursor-pointer"
              >
                Launch Offline Sandbox Simulator
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

