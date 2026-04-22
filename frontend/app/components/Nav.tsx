"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';

const BNBIcon = () => (
  <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
    <path d="M16 2L19.6 5.6 11 14.2 7.4 10.6 16 2Z" fill="#F0B90B"/>
    <path d="M21.8 7.8L25.4 11.4 11 25.8 7.4 22.2 21.8 7.8Z" fill="#F0B90B"/>
    <path d="M4.6 13L8.2 16.6 4.6 20.2 1 16.6 4.6 13Z" fill="#F0B90B"/>
    <path d="M27.4 13L31 16.6 27.4 20.2 23.8 16.6 27.4 13Z" fill="#F0B90B"/>
    <path d="M11 18.4L14.6 22 16 20.6 17.4 22 21 18.4 16 13.4 11 18.4Z" fill="#F0B90B"/>
  </svg>
);

const icons: Record<string, React.ReactElement> = {
  dashboard: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  lend: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6"/>
    </svg>
  ),
  borrow: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
    </svg>
  ),
  agent: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/>
    </svg>
  ),
  profile: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
    </svg>
  ),
};

const navLinks = [
  { href: '/',         label: 'Dashboard', key: 'dashboard' },
  { href: '/lend',     label: 'Lend',      key: 'lend'      },
  { href: '/borrow',   label: 'Borrow',    key: 'borrow'    },
  { href: '/agent',    label: 'Agent',     key: 'agent'     },
  { href: '/profile',  label: 'Profile',   key: 'profile'   },
];

export default function Nav() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <aside className="fixed top-0 left-0 w-[220px] h-screen bg-surface-alt border-r border-border flex flex-col z-[100]">
      {/* Brand */}
      <div className="p-[20px_20px_16px] border-b border-border">
        <div className="flex items-center gap-[10px]">
          <div className="w-[32px] h-[32px] rounded-md bg-yellow flex items-center justify-center shrink-0">
            <span className="font-black text-sm text-bg">B</span>
          </div>
          <div>
            <p className="font-bold text-[15px] text-text leading-[1.2]">Brgent</p>
            <p className="text-[10px] text-yellow font-semibold tracking-wider uppercase">
              Agentic Protocol
            </p>
          </div>
        </div>

        {/* Network pill */}
        <div className="mt-3 flex items-center gap-1.5 p-[5px_10px] bg-yellow/5 border border-yellow/20 rounded-md">
          <BNBIcon />
          <span className="text-[11px] font-semibold text-muted">BNB Testnet</span>
          <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-green ml-auto" />
        </div>
      </div>

      {/* Nav links */}
      <nav className="p-3 flex-1">
        <p className="text-[10px] font-semibold text-dim uppercase tracking-widest p-[4px_10px_8px]">
          Menu
        </p>
        {navLinks.map(({ href, label, key }) => {
          const active = isActive(href);
          return (
            <Link
              key={key}
              href={href}
              className={`
                flex items-center gap-2.5 p-[9px_10px] rounded-md mb-0.5 text-[13px] transition-all duration-150 no-underline
                ${active 
                  ? 'font-semibold text-yellow bg-yellow/10 border-l-2 border-yellow' 
                  : 'font-medium text-muted hover:text-text hover:bg-white/5 border-l-2 border-transparent'
                }
              `}
            >
              <span className={active ? 'opacity-100' : 'opacity-70'}>{icons[key]}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Wallet section */}
      <div className="p-[14px_10px] border-t border-border">
        {isConnected && address ? (
          <div>
            <div className="flex items-center gap-2 p-[9px_10px] bg-surface border border-border rounded-md mb-2">
              <span className="w-2 h-2 rounded-full bg-green shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-muted font-semibold uppercase tracking-tight">Connected</p>
                <p className="mono text-[11px] text-text overflow-hidden text-ellipsis whitespace-nowrap">
                  {address.slice(0, 8)}…{address.slice(-6)}
                </p>
              </div>
            </div>
            <button
              className="btn btn-ghost w-full p-2 text-[12px]"
              onClick={() => disconnect()}
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            className="btn btn-yellow w-full p-2.5"
            onClick={() => connect({ connector: injected() })}
          >
            Connect Wallet
          </button>
        )}
        <p className="text-[10px] text-dim text-center mt-2.5">
          BNB Chain Hackathon · v1.0
        </p>
      </div>
    </aside>
  );
}
