import { PropsWithChildren } from 'react';

type Props = PropsWithChildren<{
  title: string;
  subtitle?: string;
}>;

export const SectionCard = ({ title, subtitle, children }: Props) => {
  return (
    <section className="section-card">
      <div className="section-head">
        <h3>{title}</h3>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
};
