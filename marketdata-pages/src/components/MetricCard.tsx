import { ReactNode } from 'react';

type Props = {
  title: string;
  value: string;
  hint?: string;
  accent?: ReactNode;
  valueClassName?: string;
};

export const MetricCard = ({ title, value, hint, accent, valueClassName }: Props) => {
  return (
    <article className="metric-card">
      <div className="metric-top">
        <p>{title}</p>
        {accent}
      </div>
      <h3 className={`metric-value ${valueClassName ?? ''}`.trim()}>{value}</h3>
      {hint ? <small>{hint}</small> : null}
    </article>
  );
};
