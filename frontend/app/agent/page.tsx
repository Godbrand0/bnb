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
    <div className="p-8 max-w-[1100px] w-full">

      <div className="mb-7">
        <h1 className="text-[22px] font-bold text-text">Agent</h1>
        <p className="text-[13px] text-muted mt-1">
          Operate an autonomous Guardian liquidation agent on BNB Chain
        </p>
      </div>

      <div className="grid grid-cols-[420px_1fr] gap-6">

        {/* ── Registration panel ── */}
        <div className="flex flex-col gap-4">

          {/* Requirements card */}
          <div className="card p-[22px_24px]">
            <p className="section-title mb-4">Guardian Requirements</p>
            {[
              { label: 'BRGN Required',         value: `${stakeReq} BRGN`, ok: false },
              { label: 'Your BRGN Balance',      value: `${brgnBal} BRGN`,  ok: false },
              { label: 'EIP-8004 NFT',           value: 'Required',          ok: false },
              { label: 'Registration Status',    value: 'Unregistered',      ok: false },
            ].map(({ label, value, ok }) => (
              <div key={label} className="flex justify-between items-center mb-3 last:mb-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`
                      w-4 h-4 rounded-full border-2 flex shrink-0 items-center justify-center
                      ${ok ? 'border-green bg-green/10' : 'border-border bg-transparent'}
                    `}
                  >
                    {ok && <span className="w-1.5 h-1.5 rounded-full bg-green" />}
                  </span>
                  <span className="text-[12px] text-muted">{label}</span>
                </div>
                <span className={`mono text-[12px] font-semibold ${ok ? 'text-green' : 'text-text'}`}>{value}</span>
              </div>
            ))}
          </div>

          {/* Stake + Register */}
          <div className="card p-[22px_24px] flex flex-col gap-4">
            <p className="section-title">Stake & Register</p>

            <div className="info-box info-yellow">
              <span className="font-semibold text-yellow">EIP-8004 Standard</span> — Guardian agents must hold a verified EIP-8004 NFT and stake 1,000,000 BRGN tokens to participate in the liquidation pool.
            </div>

            {[
              { label: 'Step 1', desc: 'Acquire 1,000,000 BRGN tokens from a supported DEX.' },
              { label: 'Step 2', desc: 'Mint or acquire an EIP-8004 identity NFT.' },
              { label: 'Step 3', desc: 'Stake BRGN and call the registration contract.' },
              { label: 'Step 4', desc: 'Deploy the open-source Guardian bot to earn liquidation rewards.' },
            ].map(({ label, desc }) => (
              <div key={label} className="flex gap-3">
                <span className="text-[10px] font-bold text-yellow bg-yellow/10 border border-yellow/20 rounded-[4px] p-[3px_7px] shrink-0 h-fit">
                  {label}
                </span>
                <p className="text-[12px] text-muted leading-relaxed">{desc}</p>
              </div>
            ))}

            {isSuccess && (
              <div className="info-box info-green">
                <span className="text-green font-semibold">Transaction confirmed!</span>
              </div>
            )}

            <button
              className="btn btn-yellow w-full p-3"
              disabled={isBusy || !isConnected}
            >
              {isBusy ? <><span className="spinner" />Processing…</> : 'Stake & Join Guardian Pool'}
            </button>
          </div>

        </div>

        {/* ── Right panel ── */}
        <div className="flex flex-col gap-4">

          {/* Agent reward stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Reward Per Liq.',  value: rewardPct,  sub: 'Of collateral sold' },
              { label: 'Active Guardians', value: '2',        sub: 'On network'         },
              { label: 'Total Liquidated', value: '$3,800',   sub: 'Collateral so far'  },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-label">{s.label}</div>
                <div className="stat-value text-[18px]">{s.value}</div>
                <div className="stat-sub">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Active agents table */}
          <div className="card">
            <div className="p-[16px_20px] border-b border-border">
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
                    <td className="font-semibold text-yellow">{a.id}</td>
                    <td className="mono text-muted">{a.address}</td>
                    <td>
                      <span className={`badge ${a.status === 'Active' ? 'badge-green' : 'badge-muted'}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="mono">{a.liquidations}</td>
                    <td className="mono">${a.earned}</td>
                    <td className={`mono ${a.uptime > '90%' ? 'text-green' : 'text-red'}`}>{a.uptime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* How liquidation works */}
          <div className="card p-[20px_22px]">
            <p className="section-title mb-3.5">How Liquidation Works</p>
            <div className="flex flex-col gap-3">
              {[
                ['Monitor', 'Guardian agents continuously monitor all borrower positions on-chain.'],
                ['Detect',  'When a position\'s LTV exceeds the liquidation threshold (65%), the agent triggers.'],
                ['Execute', 'The collateral token is swapped for USDC via PancakeSwap V2 to repay the debt.'],
                ['Reward',  'The agent receives a percentage of the collateral as a liquidation reward.'],
              ].map(([title, desc]) => (
                <div key={title} className="flex gap-3">
                  <span className="text-[9px] font-bold text-muted bg-border border border-dim rounded-[4px] p-[3px_7px] shrink-0 h-fit uppercase tracking-wider">
                    {title}
                  </span>
                  <p className="text-[12px] text-muted leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
