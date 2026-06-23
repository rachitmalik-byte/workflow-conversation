import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { dbClient } from '../../services/dbClient';
import { Mail, Lock, User, AlertCircle, Loader2, Eye, EyeOff, Shield, MessageSquare, Bell, Sliders } from 'lucide-react';

interface AuthPageProps {
  onBypass: () => void;
  onSuccess: () => void;
}

const slides = [
  {
    title: "Execution Center",
    description: "Manage high-intent outbound leads, orchestrate sales campaigns, and inspect proposal timeline events in real-time.",
    icon: Shield,
    badge: "Operational Control",
    color: "from-blue-600/30 to-indigo-600/30",
    glow: "bg-blue-500/10"
  },
  {
    title: "Omnichannel Messaging",
    description: "Synchronized chat conversations, Google Chat webhook mirror, and instant team notifications to eliminate response friction.",
    icon: MessageSquare,
    badge: "Connected Collaboration",
    color: "from-emerald-600/30 to-teal-600/30",
    glow: "bg-emerald-500/10"
  },
  {
    title: "Automated Reminders",
    description: "Desktop push alerts, customizable audio alarm profiles, and calendars designed to ensure no lead goes cold.",
    icon: Bell,
    badge: "Proactive Alarms",
    color: "from-amber-600/30 to-orange-600/30",
    glow: "bg-amber-500/10"
  },
  {
    title: "Premium Interfaces",
    description: "Swap presentation aesthetics dynamically. Choose from 6 responsive presets: Glassmorphism, Neobrutalist, Scandinavian, and more.",
    icon: Sliders,
    badge: "Bespoke Personalization",
    color: "from-fuchsia-600/30 to-pink-600/30",
    glow: "bg-fuchsia-500/10"
  }
];

export const AuthPage: React.FC<AuthPageProps> = ({ onBypass, onSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'head' | 'growth_specialist'>('growth_specialist');
  const [designation, setDesignation] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto slide rotation
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

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

  const activeSlide = slides[currentSlide];
  const SlideIcon = activeSlide.icon;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 min-h-screen bg-background">
      
      {/* Left Column - Auth Form */}
      <div className="lg:col-span-5 flex flex-col justify-between p-6 sm:p-12 md:p-16 bg-background border-r border-border">
        
        {/* Header Branding */}
        <div className="flex items-center gap-2.5 mb-8 lg:mb-0">
          <div className="flex h-9 w-9 items-center justify-center rounded bg-primary text-primary-foreground font-black text-lg shadow-sm">
            R
          </div>
          <div>
            <h2 className="text-base font-extrabold text-foreground tracking-tight leading-none">RelayHQ</h2>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">Workflow Command Center</p>
          </div>
        </div>

        {/* Auth Box */}
        <div className="w-full max-w-md mx-auto my-auto space-y-6">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-black text-foreground tracking-tight">
              {isSignUp ? 'Create your profile' : 'Sign in to workspace'}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isSignUp ? 'Get setup with teammate privileges' : 'Enter your workspace credentials to continue'}
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 bg-danger/10 border border-danger/20 p-3 rounded-lg text-danger text-xs text-left animate-none">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4 text-left">
            {isSignUp && (
              <>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
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
                      className="w-full pl-10 pr-3 py-2 border border-border bg-background text-foreground text-xs rounded-lg focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Designation / Job Title
                  </label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. Senior SDR, VP of Sales"
                    className="w-full px-3 py-2 border border-border bg-background text-foreground text-xs rounded-lg focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Workspace Permission Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'head' | 'growth_specialist')}
                    className="w-full px-3 py-2 border border-border bg-background text-foreground text-xs rounded-lg focus:outline-none focus:border-primary font-semibold cursor-pointer"
                  >
                    <option value="growth_specialist">Growth Specialist (Team Member)</option>
                    <option value="head">Head of Growth (Administrator)</option>
                  </select>
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
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
                  className="w-full pl-10 pr-3 py-2 border border-border bg-background text-foreground text-xs rounded-lg focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Secure Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2 border border-border bg-background text-foreground text-xs rounded-lg focus:outline-none focus:border-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-muted-foreground/60 hover:text-foreground focus:outline-none cursor-pointer flex items-center justify-center"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-primary hover:bg-primary/95 text-primary-foreground rounded-lg text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isSignUp ? (
                'Create Workspace Account'
              ) : (
                'Sign In'
              )}
            </button>

            {!isSignUp && (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full py-2.5 bg-white hover:bg-slate-50 border border-border text-slate-700 rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-65"
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

          <div className="text-center text-xs text-muted-foreground pt-1">
            <p>
              {isSignUp ? 'Already onboarded?' : 'Need a workspace profile?'}{' '}
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                }}
                className="text-primary hover:underline font-bold"
              >
                {isSignUp ? 'Sign In instead' : 'Register Profile'}
              </button>
            </p>
          </div>
        </div>

        {/* Database Configuration Section */}
        <div className="w-full max-w-md mx-auto mt-8 lg:mt-0 space-y-3 text-left bg-muted/30 border border-border/40 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wide">
              <span className={`h-1.5 w-1.5 rounded-full ${supabase ? 'bg-success animate-pulse' : 'bg-primary'}`} />
              <span>{supabase ? 'Production Connected' : 'Offline Sandbox'}</span>
            </span>
            <button
              type="button"
              onClick={() => setShowDbConfig(!showDbConfig)}
              className="text-[10px] text-primary font-bold hover:underline cursor-pointer"
            >
              {showDbConfig ? 'Hide Settings' : 'Configure Database'}
            </button>
          </div>

          {showDbConfig && (
            <form onSubmit={handleSaveDbConfig} className="space-y-3 mt-2.5 border-t border-border/40 pt-2.5">
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="text"
                  required
                  value={dbUrl}
                  onChange={(e) => setDbUrl(e.target.value)}
                  placeholder="https://xyz.supabase.co"
                  className="w-full px-2.5 py-1.5 bg-background border border-border text-foreground text-xs rounded-lg focus:outline-none focus:border-primary font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  Anon API Key
                </label>
                <input
                  type="password"
                  required
                  value={dbKey}
                  onChange={(e) => setDbKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full px-2.5 py-1.5 bg-background border border-border text-foreground text-xs rounded-lg focus:outline-none focus:border-primary font-mono"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-primary text-primary-foreground text-[10px] font-bold rounded-lg hover:bg-primary/95 transition-colors cursor-pointer text-center"
              >
                Save and Connect Database
              </button>
            </form>
          )}

          {!supabase && !showDbConfig && (
            <p className="text-[10px] text-muted-foreground/80 leading-relaxed font-medium">
              To connect your live database, click <strong>Configure Database</strong>. Otherwise, click below to review sandbox screens offline.
            </p>
          )}

          {!showDbConfig && (
            <button
              onClick={onBypass}
              className="w-full mt-1.5 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
            >
              Launch Offline Sandbox Simulator
            </button>
          )}
        </div>
      </div>

      {/* Right Column - Premium Showcase Slider */}
      <div className="hidden lg:flex lg:col-span-7 bg-slate-950 text-white relative overflow-hidden flex-col justify-between p-12 select-none">
        
        {/* Floating gradient orbs */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[120px] transition-all duration-1000 ease-in-out opacity-25 ${activeSlide.glow} animate-pulse`} />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        {/* Top Header */}
        <div className="relative z-10 flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
            Enterprise Grade CRM
          </span>
          <span className="text-xs font-semibold text-slate-400">
            v2.4.0 Release
          </span>
        </div>

        {/* Slider Card */}
        <div className="relative z-10 my-auto max-w-lg mx-auto w-full transition-all duration-500">
          
          {/* Main Card */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-2xl shadow-2xl relative overflow-hidden">
            {/* Slide color tint */}
            <div className={`absolute inset-0 bg-gradient-to-tr ${activeSlide.color} opacity-40 mix-blend-color-dodge transition-all duration-700`} />
            
            <div className="relative z-10 space-y-6">
              {/* Badge */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide bg-white/10 text-white border border-white/10">
                {activeSlide.badge}
              </span>

              {/* Icon & Title */}
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shadow-inner">
                  <SlideIcon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-extrabold text-white tracking-tight">
                  {activeSlide.title}
                </h3>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                {activeSlide.description}
              </p>

              {/* Interactive preview representation */}
              <div className="pt-2 border-t border-white/10 flex items-center gap-3">
                <div className="flex -space-x-1.5">
                  <div className="h-5 w-5 rounded-full bg-blue-500 border border-slate-900 text-[8px] font-bold flex items-center justify-center">RM</div>
                  <div className="h-5 w-5 rounded-full bg-emerald-500 border border-slate-900 text-[8px] font-bold flex items-center justify-center">JD</div>
                  <div className="h-5 w-5 rounded-full bg-amber-500 border border-slate-900 text-[8px] font-bold flex items-center justify-center">AS</div>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold">
                  Active teammates sync live
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Navigation / Indicators */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === currentSlide ? 'w-6 bg-white' : 'w-2.5 bg-white/20 hover:bg-white/45'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Powered by Google Cloud & Supabase
          </p>
        </div>
      </div>
    </div>
  );
};


