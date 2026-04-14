"use client";

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits, erc20Abi } from 'viem';
import { VAULT_ABI } from '../constants/abi';
import { VAULT_ADDRESS, BRGN_TOKEN_ADDRESS, EIP8004_NFT_ADDRESS } from '../constants/addresses';

const MOCK_AGENTS = [
  { id: '#001', address: '0xaBc1…4dEf', status: 'Active',   liquidations: 14, earned: '2,400',  stake: '1,000,000', uptime: '99.8%' },
  { id: '#002', address: '0x1234…5678', status: 'Active',   liquidations: 8,  earned: '1,100',  stake: '1,000,000', uptime: '97.2%' },
  { id: '#003', address: '0xDead…Beef', status: 'Inactive', liquidations: 2,  earned: '300',    stake: '1,000,000', uptime: '41.0%' },
];

export default function AgentPage() {
  const { address, isConnected } = useAccount();

  const { data: brgnBalance } = useReadContract({
    address: BRGN_TOKEN_ADDRESS as `0x${string}`,
    abi: erc20Abi, functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });
  const { data: agentRewardBps } = useReadContract({
    address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'AGENT_REWARD_BPS',
  });
  const { data: requiredStake } = useReadContract({
    address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'REQUIRED_AGENT_STAKE',
  });

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const isBusy = isPending || isConfirming;

  const rewardPct  = agentRewardBps ? `${Number(agentRewardBps) / 100}%`   : '2.00%';
  const stakeReq   = requiredStake  ? Number(formatUnits(requiredStake as bigint, 18)).toLocaleString() : '1,000,000';
  const brgnBal    = brgnBalance    ? Number(formatUnits(brgnBalance  as bigint, 18)).toLocaleString() : '0';

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1100, width: '100%' }}>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#EAECEF' }}>Agent</h1>
        <p style={{ fontSize: 13, color: '#848E9C', marginTop: 4 }}>
          Operate an autonomous Guardian liquidation agent on BNB Chain
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: 24 }}>

        {/* ── Registration panel ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Requirements card */}
          <div className="card" style={{ padding: '22px 24px' }}>
            <p className="section-title" style={{ marginBottom: 16 }}>Guardian Requirements</p>
            {[
              { label: 'BRGN Required',         value: `${stakeReq} BRGN`, ok: false },
              { label: 'Your BRGN Balance',      value: `${brgnBal} BRGN`,  ok: false },
              { label: 'EIP-8004 NFT',           value: 'Required',          ok: false },
              { label: 'Registration Status',    value: 'Unregistered',      ok: false },
            ].map(({ label, value, ok }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      width: 16, height: 16, borderRadius: '50%',
                      border: `2px solid ${ok ? '#0ECB81' : '#474D57'}`,
                      background: ok ? 'rgba(14,203,129,0.1)' : 'transparent',
                      flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {ok && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0ECB81' }} />}
                  </span>
                  <span style={{ fontSize: 12, color: '#848E9C' }}>{label}</span>
                </div>
                <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: ok ? '#0ECB81' : '#EAECEF' }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Stake + Register */}
          <div className="card" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p className="section-title">Stake & Register</p>

            <div className="info-box info-yellow">
              <span style={{ fontWeight: 600, color: '#F0B90B' }}>EIP-8004 Standard</span> — Guardian agents must hold a verified EIP-8004 NFT and stake 1,000,000 BRGN tokens to participate in the liquidation pool.
            </div>

            {[
              { label: 'Step 1', desc: 'Acquire 1,000,000 BRGN tokens from a supported DEX.' },
              { label: 'Step 2', desc: 'Mint or acquire an EIP-8004 identity NFT.' },
              { label: 'Step 3', desc: 'Stake BRGN and call the registration contract.' },
              { label: 'Step 4', desc: 'Deploy the open-source Guardian bot to earn liquidation rewards.' },
            ].map(({ label, desc }) => (
              <div key={label} style={{ display: 'flex', gap: 12 }}>
                <span
                  style={{
                    fontSize: 10, fontWeight: 700, color: '#F0B90B',
                    background: 'rgba(240,185,11,0.08)', border: '1px solid rgba(240,185,11,0.2)',
                    borderRadius: 4, padding: '3px 7px', flexShrink: 0, height: 'fit-content',
                  }}
                >
                  {label}
                </span>
                <p style={{ fontSize: 12, color: '#848E9C', lineHeight: 1.5 }}>{desc}</p>
              </div>
            ))}

            {isSuccess && (
              <div className="info-box info-green">
                <span style={{ color: '#0ECB81', fontWeight: 600 }}>Transaction confirmed!</span>
              </div>
            )}

            <button
              className="btn btn-yellow"
              style={{ width: '100%', padding: '12px' }}
              disabled={isBusy || !isConnected}
            >
              {isBusy ? <><span className="spinner" />Processing…</> : 'Stake & Join Guardian Pool'}
            </button>
          </div>

        </div>

        {/* ── Right panel ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Agent reward stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { label: 'Reward Per Liq.',  value: rewardPct,  sub: 'Of collateral sold' },
              { label: 'Active Guardians', value: '2',        sub: 'On network'         },
              { label: 'Total Liquidated', value: '$3,800',   sub: 'Collateral so far'  },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ fontSize: 18 }}>{s.value}</div>
                <div className="stat-sub">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Active agents table */}
          <div className="card">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #2B3139' }}>
              <p className="section-title">Active Guardians</p>
              <p className="section-sub">All registered Guardian agents on this deployment</p>
            </div>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Address</th>
                  <th>Status</th>
                  <th>Liquidations</th>
                  <th>Earned (USDC)</th>
                  <th>Uptime</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_AGENTS.map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600, color: '#F0B90B' }}>{a.id}</td>
                    <td className="mono" style={{ color: '#848E9C' }}>{a.address}</td>
                    <td>
                      <span className={`badge ${a.status === 'Active' ? 'badge-green' : 'badge-muted'}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="mono">{a.liquidations}</td>
                    <td className="mono">${a.earned}</td>
                    <td className="mono" style={{ color: a.uptime > '90%' ? '#0ECB81' : '#F6465D' }}>{a.uptime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* How liquidation works */}
          <div className="card" style={{ padding: '20px 22px' }}>
            <p className="section-title" style={{ marginBottom: 14 }}>How Liquidation Works</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                ['Monitor', 'Guardian agents continuously monitor all borrower positions on-chain.'],
                ['Detect',  'When a position\'s LTV exceeds the liquidation threshold (65%), the agent triggers.'],
                ['Execute', 'The collateral token is swapped for USDC via PancakeSwap V2 to repay the debt.'],
                ['Reward',  'The agent receives a percentage of the collateral as a liquidation reward.'],
              ].map(([title, desc]) => (
                <div key={title} style={{ display: 'flex', gap: 12 }}>
                  <span
                    style={{
                      fontSize: 9, fontWeight: 700, color: '#848E9C',
                      background: '#2B3139', border: '1px solid #474D57',
                      borderRadius: 4, padding: '3px 7px', flexShrink: 0, height: 'fit-content',
                    }}
                  >
                    {title}
                  </span>
                  <p style={{ fontSize: 12, color: '#848E9C', lineHeight: 1.5 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
