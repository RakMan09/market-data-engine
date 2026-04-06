import { PropsWithChildren } from 'react';
import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Home' },
  { to: '/replay', label: 'Order Book' },
  { to: '/performance', label: 'Performance' },
  { to: '/correctness', label: 'Correctness' },
  { to: '/architecture', label: 'Architecture' },
  { to: '/artifacts', label: 'Artifacts' }
];

export const Layout = ({ children }: PropsWithChildren) => {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">System Dashboard</p>
          <h1>Market Data Engine</h1>
        </div>
        <nav className="nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="page-wrap">{children}</main>
      <footer className="footer">
        <span>Engine telemetry, correctness, and performance views from the latest published run.</span>
      </footer>
    </div>
  );
};
