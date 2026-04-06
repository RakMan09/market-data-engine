type Props = {
  title: string;
  message: string;
};

export const EmptyState = ({ title, message }: Props) => (
  <div className="empty-state">
    <h4>{title}</h4>
    <p>{message}</p>
  </div>
);
