import type { SourceStatus } from '../types/view-models';

export function toTitleCaseFromSnake(value: string) {
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function normalizeSourceStatus(status: string): SourceStatus {
  if (status === 'pending_review') {
    return 'pending';
  }
  if (status === 'validated' || status === 'flagged' || status === 'rejected') {
    return status;
  }
  return 'pending';
}

export function formatDateLabel(value: string | null) {
  if (!value) {
    return 'No updates yet';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}
