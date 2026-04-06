interface StatusBadgeProps {
  status: 'critical' | 'high' | 'moderate' | 'covered' | 'pending' | 'validated' | 'flagged' | 'rejected';
  label?: string;
}

const statusConfig = {
  critical: { bg: '#1B3A5C', text: '#FFFFFF', label: 'Critical' },
  high: { bg: '#2E6DA4', text: '#FFFFFF', label: 'High Priority' },
  moderate: { bg: '#A8C8E8', text: '#1A1A1A', label: 'Moderate' },
  covered: { bg: '#D8D8D8', text: '#1A1A1A', label: 'Covered' },
  pending: { bg: '#E8C94F', text: '#1A1A1A', label: 'Pending' },
  validated: { bg: '#2E6DA4', text: '#FFFFFF', label: 'Validated' },
  flagged: { bg: '#F5DFA0', text: '#1A1A1A', label: 'Flagged' },
  rejected: { bg: '#D8D8D8', text: '#1A1A1A', label: 'Rejected' },
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = statusConfig[status];
  const displayLabel = label || config.label;

  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-xs"
      style={{
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold',
        backgroundColor: config.bg,
        color: config.text,
      }}
    >
      {displayLabel}
    </span>
  );
}
