import React, { useState } from 'react';
import { LogOut, Briefcase, Shield, User, Check, Loader2 } from 'lucide-react';
import type { Profile, UserRole } from '../../types/database';

interface ProfileSetupModalProps {
  currentUser: Profile;
  onComplete: (updates: { designation: string; role: UserRole }) => Promise<void>;
  onSignOut: () => Promise<void>;
}

export const ProfileSetupModal: React.FC<ProfileSetupModalProps> = ({
  currentUser,
  onComplete,
  onSignOut
}) => {
  const [designation, setDesignation] = useState('');
  const [role, setRole] = useState<UserRole>('growth_specialist');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!designation.trim()) {
      setError('Please enter your job title / designation.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onComplete({
        designation: designation.trim(),
        role
      });
    } catch (err: any) {
      setError(err.message || 'Failed to complete profile configuration.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-300 scale-100 flex flex-col my-auto">
        
        {/* Top Header Section */}
        <div className="relative p-6 text-center border-b border-border bg-muted/20">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <User className="h-6 w-6 text-primary animate-pulse" />
          </div>
          <h2 className="text-xl font-extrabold text-foreground tracking-tight">Complete Your Profile</h2>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-xs mx-auto">
            Welcome to RelayHQ, <span className="font-semibold text-foreground">{currentUser.email}</span>! Please configure your professional profile to proceed.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1 text-left">
          {error && (
            <div className="p-3 bg-danger/10 border border-danger/25 text-danger rounded-lg text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Job Title Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Job Title / Designation
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                <Briefcase className="h-4 w-4" />
              </span>
              <input
                type="text"
                required
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Outbound Campaign Manager, Developer"
                className="w-full text-sm bg-background border border-border text-foreground pl-9 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-primary transition-all duration-150 shadow-sm"
              />
            </div>
          </div>

          {/* Role selector layout */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Workspace Role
            </label>
            
            <div className="grid grid-cols-1 gap-3">
              {/* Employee/Specialist Option Card */}
              <button
                type="button"
                onClick={() => setRole('growth_specialist')}
                className={`relative flex items-start p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                  role === 'growth_specialist'
                    ? 'border-primary bg-primary/4 ring-1 ring-primary'
                    : 'border-border bg-card hover:bg-muted/40'
                }`}
              >
                <div className="h-5 w-5 rounded-full border border-muted-foreground/30 flex items-center justify-center flex-shrink-0 mt-0.5 mr-3 bg-background">
                  {role === 'growth_specialist' && (
                    <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-foreground">Employee / Specialist</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    Assign and execute tasks, manage workflow projects, and collaborate in team channels.
                  </span>
                </div>
                {role === 'growth_specialist' && (
                  <Check className="absolute top-4 right-4 h-4 w-4 text-primary" />
                )}
              </button>

              {/* Head / Lead Option Card */}
              <button
                type="button"
                onClick={() => setRole('head')}
                className={`relative flex items-start p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                  role === 'head'
                    ? 'border-primary bg-primary/4 ring-1 ring-primary'
                    : 'border-border bg-card hover:bg-muted/40'
                }`}
              >
                <div className="h-5 w-5 rounded-full border border-muted-foreground/30 flex items-center justify-center flex-shrink-0 mt-0.5 mr-3 bg-background">
                  {role === 'head' && (
                    <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-foreground flex items-center gap-1.5">
                    <span>Department Head / Lead</span>
                    <Shield className="h-3.5 w-3.5 text-amber-500 fill-amber-500/20" />
                  </span>
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    Configure dashboard widgets, manage assignments, oversee all active projects, and run reports.
                  </span>
                </div>
                {role === 'head' && (
                  <Check className="absolute top-4 right-4 h-4 w-4 text-primary" />
                )}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex flex-col gap-2.5">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-primary hover:bg-primary/95 disabled:bg-primary/70 text-primary-foreground text-sm font-bold rounded-xl transition-colors shadow-lg cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Configuring Account...</span>
                </>
              ) : (
                <span>Confirm & Enter Workspace</span>
              )}
            </button>

            <button
              type="button"
              onClick={onSignOut}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-muted hover:bg-muted/80 disabled:opacity-60 text-muted-foreground hover:text-foreground text-xs font-semibold rounded-xl border border-border transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Cancel & Sign Out</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
