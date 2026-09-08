import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import { captureError } from '@/lib/errorCapture';

/**
 * Friendly Hebrew error boundary. Catches render errors in its subtree and shows
 * a recovery screen with a full error report (refresh / go home / copy code / send ticket).
 * Routes through captureError for consistent logging + toast.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, code: null, componentStack: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    const { code } = captureError({
      error,
      operation: 'render',
      context: {
        silent: true,
        stack: error?.stack + (info?.componentStack ? '\n' + info.componentStack : ''),
      },
    });
    this.setState({ code, componentStack: info?.componentStack || '' });
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const code = this.state.code || 'ERR_UNKNOWN_500';
    const { error, componentStack } = this.state;

    return (
      <div dir="rtl" className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="bg-card rounded-lg border border-border shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-destructive" />
          </div>
          <h2 className="text-section-title mb-2">אופס, משהו השתבש</h2>
          <p className="text-sm text-muted-foreground mb-4">
            אירעה שגיאה בלתי צפויה בעת טעינת התצוגה. אפשר לרענן את הדף או לחזור לדף הבית.
          </p>
          <div className="mb-4 text-right">
            <ErrorDisplay
              code={code}
              compact
              context={{
                stack: error?.stack,
                componentStack,
              }}
            />
          </div>
          <div className="flex items-center justify-center gap-3">
            <Button onClick={() => window.location.reload()} className="rounded-md">
              <RefreshCw className="w-4 h-4" /> רענן
            </Button>
            <Button
              variant="outline"
              className="rounded-md"
              onClick={() => { this.handleReset(); window.location.href = '/'; }}
            >
              <Home className="w-4 h-4" /> חזרה לדף הבית
            </Button>
          </div>
        </div>
      </div>
    );
  }
}