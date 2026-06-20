import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error inside RelayHQ context:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
          <div className="w-full max-w-md border border-border bg-card p-6 rounded-lg shadow-md space-y-4">
            <AlertCircle className="h-10 w-10 text-danger mx-auto" />
            <h2 className="text-lg font-bold text-foreground">Application Error</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              An unexpected error occurred in the execution thread. You can return to safety or reset the workspace context.
            </p>
            <div className="bg-muted p-3 rounded text-[10px] text-left font-mono text-muted-foreground overflow-x-auto max-h-40">
              {this.state.error?.toString()}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2 bg-primary hover:bg-primary/95 text-white rounded text-xs font-semibold"
            >
              Refresh Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
