import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { useRouteError } from 'react-router';
import { Button } from '../ui/button';

type RouteErrorShape = {
  statusText?: string;
  message?: string;
  data?: unknown;
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === 'object') {
    const candidate = error as RouteErrorShape;

    if (typeof candidate.message === 'string' && candidate.message.trim()) {
      return candidate.message;
    }

    if (typeof candidate.statusText === 'string' && candidate.statusText.trim()) {
      return candidate.statusText;
    }
  }

  return 'An unexpected diagnose route error occurred.';
}

export function DiagnoseErrorState() {
  const error = useRouteError();
  const message = toErrorMessage(error);

  return (
    <section className="mx-auto mt-10 max-w-3xl rounded-xl border border-[var(--light-gray)] bg-white p-8">
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-[var(--pale-blue)] p-3">
          <AlertTriangle className="h-6 w-6 text-[var(--deep-yellow)]" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-[var(--navy-blue)]">Diagnose View Failed to Render</h1>
          <p className="mt-2 text-sm text-[var(--mid-gray)]">{message}</p>
          <div className="mt-4">
            <Button type="button" onClick={() => window.location.reload()}>
              <RefreshCcw className="h-4 w-4" />
              Reload Diagnose
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
