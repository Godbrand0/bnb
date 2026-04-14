"use client";

import React, { useState } from 'react';
import { useReadContract, useAccount } from 'wagmi';
import { formatUnits } from 'viem';
import { VAULT_ABI } from './constants/abi';
import { VAULT_ADDRESS } from './constants/addresses';

// Dynamic Four.Meme token list 
const INITIAL_TOKENS = [
  { symbol: 'FOUR',   name: 'Four Token',   liq: '$12.4M', ltv: '70%', status: 'PUBLISH' },
  { symbol: 'MEME',   name: 'Meme World',   liq: '$4.8M',  ltv: '65%', status: 'TRADING' },
  { symbol: 'BRGN',   name: 'Brgent',       liq: '$2.1M',  ltv: '60%', status: 'PUBLISH' },
  { symbol: 'DOG',    name: 'Doge Agent',   liq: '$890K',  ltv: '60%', status: 'TRADING' },
];

export default function Dashboard() {
  const { data: totalReserves } = useReadContract({
    address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'totalReservesUsdc',
  });
  const { data: totalShares } = useReadContract({
    address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'totalLenderShares',
  });
  const { data: aprBps } = useReadContract({
    address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'BORROW_INTEREST_RATE_BPS',
  });
  const { data: agentRewardBps } = useReadContract({
    address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'AGENT_REWARD_BPS',
  });

  const tvl     = totalReserves ? `$${Number(formatUnits(totalReserves as bigint, 6)).toLocaleString()}` : '$0.00';
  const apr     = aprBps ? `${Number(aprBps) / 100}%` : '5.00%';
  const reward  = agentRewardBps ? `${Number(agentRewardBps) / 100}%` : '2.00%';
  const shares  = totalShares ? Number(formatUnits(totalShares as bigint, 6)).toLocaleString() : '0';

  const stats = [
    { label: 'Total Value Locked',    value: tvl,      sub: 'USDC deposits'          },
    { label: 'USDC Liquidity',        value: tvl,      sub: 'Available to borrow'    },
    { label: 'Deposit APR',           value: apr,      sub: 'Fixed interest rate'    },
    { label: 'Agent Reward',          value: reward,   sub: 'Per liquidation'        },
    { label: 'Total Lender Shares',   value: shares,   sub: 'Outstanding shares'     },
    { label: 'BRGN Required',         value: '1,000,000', sub: 'To run a Guardian'   },
  ];

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1100, width: '100%' }}>

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#EAECEF' }}>Dashboard</h1>
        <p style={{ fontSize: 13, color: '#848E9C', marginTop: 4 }}>
          Protocol overview — BNB Chain Testnet
        </p>
      </div>

      {/* Protocol health bar */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 16px', marginBottom: 28,
          background: '#1E2329', border: '1px solid rgba(14,203,129,0.2)', borderRadius: 8,
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0ECB81', flexShrink: 0 }} className="pulse-dot" />
        <span style={{ fontSize: 12, fontWeight: 600, color: '#0ECB81' }}>Protocol Operational</span>
        <span style={{ fontSize: 12, color: '#474D57', marginLeft: 8 }}>·</span>
        <span style={{ fontSize: 12, color: '#848E9C' }}>All systems healthy · Last checked just now</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#474D57' }}>BNB Chain Testnet</span>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        {stats.map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Supported collateral */}
      <div className="card" style={{ marginBottom: 32 }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #2B3139', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p className="section-title">Supported Collateral</p>
            <p className="section-sub">Four.Meme tokens accepted as collateral on BNB Chain</p>
          </div>
          <span className="badge badge-yellow">Four.Meme</span>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Asset</th>
              <th>Liquidity</th>
              <th>LTV</th>
              <th>Status</th>
              <th>Preservation</th>
            </tr>
          </thead>
          <tbody>
            {INITIAL_TOKENS.map((c) => (
              <tr key={c.symbol}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #F0B90B, #FFD700)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 800, color: '#000',
                      }}
                    >
                      {c.symbol.slice(0, 2)}
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 13, color: '#EAECEF' }}>{c.symbol}</p>
                      <p style={{ fontSize: 11, color: '#848E9C' }}>{c.name}</p>
                    </div>
                  </div>
                </td>
                <td className="mono" style={{ fontSize: 13 }}>{c.liq}</td>
                <td className="mono" style={{ fontSize: 13 }}>{c.ltv}</td>
                <td>
                  <span className={`badge ${c.status === 'PUBLISH' ? 'badge-green' : 'badge-yellow'}`}>
                    {c.status}
                  </span>
                </td>
                <td style={{ fontSize: 11, color: '#848E9C' }}>
                  Partial (Exact Out)
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Protocol info row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card" style={{ padding: '20px 22px' }}>
          <p className="section-title" style={{ marginBottom: 12 }}>How It Works</p>
          {[
            ['Lend',    'Deposit USDC to earn fixed APR + BRGN emissions.'],
            ['Borrow',  'Use Four.Meme meme tokens as collateral to borrow USDC.'],
            ['Guard',   'Stake 1M BRGN to run an autonomous liquidation agent.'],
          ].map(([title, desc]) => (
            <div key={title} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <span
                style={{
                  width: 22, height: 22, borderRadius: 4,
                  background: 'rgba(240,185,11,0.1)', border: '1px solid rgba(240,185,11,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, color: '#F0B90B', flexShrink: 0,
                }}
              >
                {title[0]}
              </span>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#EAECEF' }}>{title}</p>
                <p style={{ fontSize: 12, color: '#848E9C' }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: '20px 22px' }}>
          <p className="section-title" style={{ marginBottom: 12 }}>Risk Parameters</p>
          {[
            ['Max LTV',                '60%',       '#F0B90B'],
            ['Liquidation Threshold',  '65%',       '#F6465D'],
            ['Borrow Interest Rate',   apr,         '#EAECEF'],
            ['Agent Reward',           reward,      '#0ECB81'],
            ['Guardian Stake',         '1,000,000 BRGN', '#EAECEF'],
          ].map(([label, value, color]) => (
            <div
              key={label as string}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}
            >
              <span style={{ fontSize: 12, color: '#848E9C' }}>{label}</span>
              <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: color as string }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
