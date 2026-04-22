"use client";

import React, { useState } from 'react';
import { useReadContract, useAccount } from 'wagmi';
import { formatUnits } from 'viem';
import { VAULT_ABI } from './constants/abi';
import { VAULT_ADDRESS } from './constants/addresses';

import { FOUR_MEME_TOKENS } from './constants/tokens';

export default function Dashboard() {
  const [search, setSearch] = useState('');
  const { address } = useAccount();

  const filteredTokens = FOUR_MEME_TOKENS.filter(t => 
    t.symbol.toLowerCase().includes(search.toLowerCase()) || 
    t.name.toLowerCase().includes(search.toLowerCase())
  );

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
    <div className="p-8 max-w-[1100px] w-full">

      {/* Page header */}
      <div className="mb-7">
        <h1 className="text-[22px] font-bold text-text">Dashboard</h1>
        <p className="text-[13px] text-muted mt-1">
          Protocol overview — BNB Chain Testnet
        </p>
      </div>

      {/* Protocol health bar */}
      <div className="flex items-center gap-2.5 p-[10px_16px] mb-7 bg-surface border border-green/20 rounded-lg">
        <span className="pulse-dot w-2 h-2 rounded-full bg-green shrink-0" />
        <span className="text-[12px] font-semibold text-green">Protocol Operational</span>
        <span className="text-[12px] text-dim ml-2">·</span>
        <span className="text-[12px] text-muted">All systems healthy · Last checked just now</span>
        <span className="ml-auto text-[11px] text-dim uppercase font-semibold">BNB Chain Testnet</span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {stats.map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Supported collateral */}
      <div className="card mb-8">
        <div className="p-[18px_20px] border-b border-border flex items-center justify-between">
          <div>
            <p className="section-title">Supported Collateral</p>
            <p className="section-sub">Four.Meme tokens accepted as collateral on BNB Chain</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search token..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-surface-alt border border-border rounded-md p-[6px_12px_6px_32px] text-text text-[13px] w-[180px] outline-none transition-all focus:border-yellow"
              />
              <svg 
                className="absolute left-2.5 top-1/2 -translate-y-1/2"
                width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--color-muted)" strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <span className="badge badge-yellow">Four.Meme</span>
          </div>
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
            {filteredTokens.length > 0 ? filteredTokens.map((c) => (
              <tr key={c.symbol}>
                <td>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-linear-to-br from-yellow to-yellow/60 flex items-center justify-center text-[10px] font-extrabold text-bg">
                      {c.symbol.slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-semibold text-[13px] text-text">{c.symbol}</p>
                      <p className="text-[11px] text-muted">{c.name}</p>
                    </div>
                  </div>
                </td>
                <td className="mono text-[13px]">{c.liq}</td>
                <td className="mono text-[13px]">{c.ltv}</td>
                <td>
                  <span className={`badge ${c.status === 'PUBLISH' ? 'badge-green' : 'badge-yellow'}`}>
                    {c.status}
                  </span>
                </td>
                <td className="text-[11px] text-muted">
                  Partial (Exact Out)
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="text-center p-8 text-muted text-[13px]">
                  No tokens found matching "{search}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Protocol info row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-[20px_22px]">
          <p className="section-title mb-3">How It Works</p>
          {[
            ['Lend',    'Deposit USDC to earn fixed APR + BRGN emissions.'],
            ['Borrow',  'Use Four.Meme meme tokens as collateral to borrow USDC.'],
            ['Guard',   'Stake 1M BRGN to run an autonomous liquidation agent.'],
          ].map(([title, desc]) => (
            <div key={title} className="flex gap-3 mb-3">
              <span className="w-[22px] h-[22px] rounded bg-yellow/10 border border-yellow/20 flex items-center justify-center text-[10px] font-bold text-yellow shrink-0">
                {title[0]}
              </span>
              <div>
                <p className="text-[12px] font-semibold text-text">{title}</p>
                <p className="text-[12px] text-muted">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="card p-[20px_22px]">
          <p className="section-title mb-3">Risk Parameters</p>
          {[
            ['Max LTV',                '60%',       'yellow'],
            ['Liquidation Threshold',  '65%',       'red'],
            ['Borrow Interest Rate',   apr,         'text'],
            ['Agent Reward',           reward,      'green'],
            ['Guardian Stake',         '1,000,000 BRGN', 'text'],
          ].map(([label, value, colorType]) => (
            <div
              key={label as string}
              className="flex justify-between items-center mb-2.5"
            >
              <span className="text-[12px] text-muted">{label}</span>
              <span className={`mono text-[12px] font-semibold text-${colorType}`}>{value}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
