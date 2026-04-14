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
    <aside
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: 220,
        height: '100vh',
        background: '#161A1E',
        borderRight: '1px solid #2B3139',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
      }}
    >
      {/* Brand */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #2B3139' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32, height: 32, borderRadius: 6,
              background: '#F0B90B',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span style={{ fontWeight: 900, fontSize: 14, color: '#0B0E11' }}>B</span>
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: 15, color: '#EAECEF', lineHeight: 1.2 }}>Brgent</p>
            <p style={{ fontSize: 10, color: '#F0B90B', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Agentic Protocol
            </p>
          </div>
        </div>

        {/* Network pill */}
        <div
          style={{
            marginTop: 12,
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 10px',
            background: 'rgba(240,185,11,0.06)',
            border: '1px solid rgba(240,185,11,0.2)',
            borderRadius: 6,
          }}
        >
          <BNBIcon />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#848E9C' }}>BNB Testnet</span>
          <span
            className="pulse-dot"
            style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#0ECB81', marginLeft: 'auto',
            }}
          />
        </div>
      </div>

      {/* Nav links */}
      <nav style={{ padding: '12px 10px', flex: 1 }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: '#474D57', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 10px 8px' }}>
          Menu
        </p>
        {navLinks.map(({ href, label, key }) => {
          const active = isActive(href);
          return (
            <Link
              key={key}
              href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 10px',
                borderRadius: 6,
                marginBottom: 2,
                fontSize: 13,
                fontWeight: active ? 600 : 500,
                color: active ? '#F0B90B' : '#848E9C',
                background: active ? 'rgba(240,185,11,0.08)' : 'transparent',
                borderLeft: active ? '2px solid #F0B90B' : '2px solid transparent',
                textDecoration: 'none',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.color = '#EAECEF';
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.color = '#848E9C';
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }
              }}
            >
              <span style={{ opacity: active ? 1 : 0.7 }}>{icons[key]}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Wallet section */}
      <div style={{ padding: '14px 10px', borderTop: '1px solid #2B3139' }}>
        {isConnected && address ? (
          <div>
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 10px',
                background: '#1E2329',
                border: '1px solid #2B3139',
                borderRadius: 6,
                marginBottom: 8,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0ECB81', flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 10, color: '#848E9C', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Connected</p>
                <p className="mono" style={{ fontSize: 11, color: '#EAECEF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {address.slice(0, 8)}…{address.slice(-6)}
                </p>
              </div>
            </div>
            <button
              className="btn btn-ghost"
              style={{ width: '100%', padding: '8px', fontSize: 12 }}
              onClick={() => disconnect()}
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            className="btn btn-yellow"
            style={{ width: '100%', padding: '10px' }}
            onClick={() => connect({ connector: injected() })}
          >
            Connect Wallet
          </button>
        )}
        <p style={{ fontSize: 10, color: '#474D57', textAlign: 'center', marginTop: 10 }}>
          BNB Chain Hackathon · v1.0
        </p>
      </div>
    </aside>
  );
}
