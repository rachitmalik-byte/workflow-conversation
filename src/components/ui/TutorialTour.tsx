import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronLeft, X, Sparkles } from 'lucide-react';

interface TutorialTourProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onClose: () => void;
}

interface TourStep {
  title: string;
  description: string;
  targetId?: string; // CSS ID of the element to highlight
  view?: string;     // Navigate to this view when entering the step
  tab?: string;      // Make this tab active in LeadsView
}

export const TutorialTour: React.FC<TutorialTourProps> = ({ currentView, onNavigate, onClose }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [pointerStyle, setPointerStyle] = useState<React.CSSProperties>({ display: 'none' });
  const pointerRef = useRef<HTMLDivElement>(null);

  const steps: TourStep[] = [
    {
      title: 'Welcome to RelayHQ! 🚀',
      description: 'Welcome to your Outbound CRM and Sales Execution Command Center. Let\'s take a quick 1-minute interactive tour to explore the main features.',
    },
    {
      title: 'Sales Dashboard 📊',
      description: 'Monitor key lead conversions, task status distributions, and teammate online statuses in real-time.',
      targetId: 'sidebar-item-dashboard',
      view: 'dashboard',
    },
    {
      title: 'Outbound Leads Management 💼',
      description: 'Track and progress all target prospects. View them in a structured table or move them through a Kanban board.',
      targetId: 'sidebar-item-leads',
      view: 'leads',
    },
    {
      title: 'Grouped Calendar View 📅',
      description: 'Our redesigned Calendar Groups group leads by their update timelines, with clear date badges and status summaries.',
      targetId: 'leads-tab-calendar',
      view: 'leads',
      tab: 'calendar',
    },
    {
      title: 'Collaborative Task Assignments 📋',
      description: 'Assign tasks to yourself or any Growth Specialist on the team. Setting deadlines triggers automated alarms.',
      targetId: 'sidebar-item-tasks',
      view: 'tasks',
    },
    {
      title: 'Real-time Team Messaging 💬',
      description: 'Communicate with colleagues in public channels or send secure Direct Messages with WhatsApp-style read checkmarks.',
      targetId: 'sidebar-item-messaging',
      view: 'messaging',
    },
  ];

  const currentStep = steps[stepIndex];

  // Auto-navigate and apply tab settings on step entry
  useEffect(() => {
    if (currentStep.view && currentStep.view !== currentView) {
      onNavigate(currentStep.view);
    }
    
    if (currentStep.tab) {
      localStorage.setItem('relayhq_leads_active_tab', currentStep.tab);
      // Wait a tiny bit for the LeadsView to mount, then dispatch reset event
      setTimeout(() => {
        window.dispatchEvent(new Event('leads-tab-reset'));
      }, 100);
    }
  }, [stepIndex, currentStep, currentView, onNavigate]);

  // Compute position for the glowing highlighter pointer
  useEffect(() => {
    const updatePointer = () => {
      if (!currentStep.targetId) {
        setPointerStyle({ display: 'none' });
        return;
      }

      const element = document.getElementById(currentStep.targetId);
      if (!element) {
        // If element is not in DOM yet (e.g. view transition loading), retry shortly
        const timer = setTimeout(updatePointer, 150);
        return () => clearTimeout(timer);
      }

      const rect = element.getBoundingClientRect();
      setPointerStyle({
        top: `${rect.top + window.scrollY + rect.height / 2}px`,
        left: `${rect.left + window.scrollX + rect.width / 2}px`,
        width: `${rect.width + 12}px`,
        height: `${rect.height + 12}px`,
        transform: 'translate(-50%, -50%)',
        display: 'block',
        position: 'absolute',
        zIndex: 9999,
      });
    };

    updatePointer();
    window.addEventListener('resize', updatePointer);
    // Observe DOM changes shortly after step transition
    const transitionTimer = setTimeout(updatePointer, 200);

    return () => {
      window.removeEventListener('resize', updatePointer);
      clearTimeout(transitionTimer);
    };
  }, [stepIndex, currentStep]);

  const handleNext = () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('relayhq_tutorial_completed', 'true');
    onClose();
  };

  return (
    <>
      {/* Dimmed backdrop overlay for focus */}
      <div className="fixed inset-0 z-45 bg-black/40 backdrop-blur-[1px] pointer-events-none transition-opacity duration-300" />

      {/* Dynamic Glowing Highlighter Element */}
      {currentStep.targetId && (
        <div
          ref={pointerRef}
          style={pointerStyle}
          className="rounded-lg border-2 border-primary bg-primary/10 shadow-[0_0_15px_hsl(var(--primary))] pointer-events-none transition-all duration-300 ease-out animate-pulse"
        />
      )}

      {/* Tutorial Dialog Card Box */}
      <div
        className={`fixed z-50 flex flex-col justify-between border border-border bg-card p-5 shadow-2xl rounded-xl transition-all duration-300 w-80 sm:w-96
          ${!currentStep.targetId 
            ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' 
            : 'bottom-4 right-4 sm:bottom-6 sm:right-6'
          }
        `}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider text-primary uppercase flex items-center gap-1">
              <Sparkles className="h-3 w-3 animate-spin" />
              <span>Interactive Guide · Step {stepIndex + 1} of {steps.length}</span>
            </span>
            <button
              onClick={handleComplete}
              className="text-muted-foreground hover:text-foreground rounded p-1 hover:bg-muted transition-colors cursor-pointer"
              title="Skip Tour"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div>
            <h4 className="text-sm font-extrabold text-foreground tracking-tight">
              {currentStep.title}
            </h4>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              {currentStep.description}
            </p>
          </div>
        </div>

        {/* Form Controls */}
        <div className="flex items-center justify-between pt-5 mt-4 border-t border-border/40">
          <button
            onClick={handleComplete}
            className="text-[10px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          >
            Skip Tour
          </button>

          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <button
                onClick={handleBack}
                className="flex items-center justify-center h-8 px-2.5 rounded border border-border hover:bg-muted text-foreground transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex items-center justify-center gap-1.5 h-8 px-4 rounded bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/95 shadow-sm transition-colors cursor-pointer font-bold"
            >
              <span>{stepIndex === steps.length - 1 ? 'Finish Tour' : 'Next'}</span>
              {stepIndex < steps.length - 1 && <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
