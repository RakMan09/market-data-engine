type Props = {
  status: 'pass' | 'fail' | 'unknown';
  label?: string;
};

export const StatusBadge = ({ status, label }: Props) => {
  const text = label ?? (status === 'pass' ? 'PASS' : status === 'fail' ? 'FAIL' : 'UNAVAILABLE');
  return <span className={`badge ${status}`}>{text}</span>;
};
