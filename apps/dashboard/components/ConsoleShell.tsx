'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { environmentLabel } from '../lib/environment';

const navigation = [
  { href: '/', label: 'Overview' },
  { href: '/admin/review', label: 'Review queue' },
  { href: '/admin/audit', label: 'Audit timeline' },
  { href: '/support/disputes', label: 'Support & disputes' },
];

type ConsoleShellProps = Readonly<{
  children: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
}>;

export function ConsoleShell({ children, eyebrow, title, description }: ConsoleShellProps) {
  const pathname = usePathname();

  return (
    <div className="consoleFrame">
      <aside className="sidebar">
        <div className="brand">
          <span aria-hidden="true" className="brandMark">
            LM
          </span>
          <span>
            <strong>Local Missions</strong>
            <small>Operations console</small>
          </span>
        </div>
        <div className="staffCard">
          <span aria-hidden="true" className="staffAvatar">
            AR
          </span>
          <span>
            <strong>Avery Rivera</strong>
            <small>Operations lead · MFA</small>
          </span>
        </div>
        <nav aria-label="Operations console">
          {navigation.map((item) => {
            const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link
                aria-current={active ? 'page' : undefined}
                className={active ? 'active' : ''}
                href={item.href}
                key={item.href}
              >
                <span aria-hidden="true" className="navDot" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="sidebarBoundary">
          <strong>Local prototype</strong>
          <span>No live systems connected</span>
        </div>
      </aside>

      <main className="consoleMain">
        <header className="mobileHeader">
          <div className="brand">
            <span aria-hidden="true" className="brandMark">
              LM
            </span>
            <span>
              <strong>Local Missions</strong>
              <small>Operations console</small>
            </span>
          </div>
          <span className="environment">{environmentLabel()}</span>
        </header>
        <nav aria-label="Mobile operations console" className="mobileNav">
          {navigation.map((item) => {
            const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link
                aria-current={active ? 'page' : undefined}
                className={active ? 'active' : ''}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="pageTopbar">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p className="pageDescription">{description}</p>
          </div>
          <span className="environment desktopEnvironment">v0.1.0 · {environmentLabel()}</span>
        </div>
        {children}
        <footer className="consoleFooter">
          <strong>Restricted workforce surface</strong>
          <span>Synthetic Orlando data · No Azure resources · No Stripe activity</span>
        </footer>
      </main>
    </div>
  );
}
