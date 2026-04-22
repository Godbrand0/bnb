"use client";

import { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits, parseUnits, erc20Abi } from 'viem';
import { VAULT_ABI } from '../constants/abi';
import { VAULT_ADDRESS, USDC_ADDRESS } from '../constants/addresses';

export default function LendPage() {
  const { address, isConnected } = useAccount();
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawShares, setWithdrawShares] = useState('');
  const [activeAction, setActiveAction] = useState<'deposit' | 'withdraw'>('deposit');

  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS, abi: erc20Abi, functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });
  const { data: userShares } = useReadContract({
    address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'lenderShares',
    args: address ? [address] : undefined,
  });
  const { data: totalShares } = useReadContract({
    address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'totalLenderShares',
  });
  const { data: totalReserves } = useReadContract({
    address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'totalReservesUsdc',
  });
  const { data: aprBps } = useReadContract({
    address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'BORROW_INTEREST_RATE_BPS',
  });
  const { data: accruedBrgn } = useReadContract({
    address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'accruedBrgn',
    args: address ? [address] : undefined,
  });

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const isBusy = isPending || isConfirming;

  const usdcBal   = usdcBalance  ? Number(formatUnits(usdcBalance  as bigint, 6)).toFixed(2)  : '0.00';
  const sharesBal = userShares   ? Number(formatUnits(userShares   as bigint, 6)).toFixed(4)  : '0.0000';
  const accrued   = accruedBrgn  ? Number(formatUnits(accruedBrgn  as bigint, 18)).toFixed(2) : '0.00';
  const apr       = aprBps       ? `${Number(aprBps) / 100}%`                                 : '5.00%';

  // Estimate user position value
  const positionValue = (() => {
    if (!userShares || !totalShares || !totalReserves) return '0.00';
    const ts = totalShares as bigint;
    if (ts === BigInt(0)) return '0.00';
    const val = (userShares as bigint) * (totalReserves as bigint) / ts;
    return Number(formatUnits(val, 6)).toFixed(2);
  })();

  const handleDeposit = () => {
    if (!depositAmount) return;
    writeContract({
      address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'depositUSDC',
      args: [parseUnits(depositAmount, 6)],
    });
  };

  const handleWithdraw = () => {
    if (!withdrawShares) return;
    writeContract({
      address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'withdrawUSDC',
      args: [parseUnits(withdrawShares, 6)],
    });
  };

  const handleClaimBrgn = () => {
    writeContract({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'claimBRGNRewards', args: [] });
  };

  return (
    <div className="p-8 max-w-[1100px] w-full">

      {/* Header */}
      <div className="mb-7">
        <h1 className="text-[22px] font-bold text-text">Lend</h1>
        <p className="text-[13px] text-muted mt-1">
          Deposit USDC to earn yield and BRGN emissions
        </p>
      </div>

      <div className="grid grid-cols-[420px_1fr] gap-6">

        {/* ── Action Panel ── */}
        <div className="flex flex-col gap-4">

          {/* Action tabs */}
          <div className="flex gap-0.5 bg-surface-alt border border-border rounded-lg p-1">
            {(['deposit', 'withdraw'] as const).map((a) => (
              <button
                key={a}
                onClick={() => setActiveAction(a)}
                className={`
                  flex-1 p-[9px] border-none rounded-md cursor-pointer text-[13px] font-semibold capitalize transition-all duration-150
                  ${activeAction === a ? 'bg-yellow text-bg' : 'bg-transparent text-muted hover:text-text'}
                `}
              >
                {a.charAt(0).toUpperCase() + a.slice(1)}
              </button>
            ))}
          </div>

          <div className="card p-6">

            {activeAction === 'deposit' ? (
              <div className="flex flex-col gap-[18px]">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="label">Amount (USDC)</span>
                    <span className="text-[12px] text-muted">
                      Balance: <span className="mono text-text">{usdcBal}</span>
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      className="input"
                      placeholder="0.00"
                      value={depositAmount}
                      onChange={e => setDepositAmount(e.target.value)}
                    />
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      <button
                        onClick={() => setDepositAmount(usdcBal)}
                        className="text-[10px] font-bold text-yellow bg-yellow/10 border border-yellow/25 rounded p-[2px_6px] cursor-pointer hover:bg-yellow/20 transition-colors"
                      >
                        MAX
                      </button>
                      <span className="text-[13px] font-semibold text-muted">USDC</span>
                    </div>
                  </div>
                </div>

                {/* APR info */}
                <div className="info-box info-green">
                  <div className="flex justify-between mb-1">
                    <span className="text-green font-semibold">Estimated APR</span>
                    <span className="mono text-green font-bold">{apr}</span>
                  </div>
                  <p>Fixed interest rate paid by borrowers. You also receive BRGN governance token emissions.</p>
                </div>

                {isSuccess && (
                  <div className="info-box info-green">
                    <span className="text-green font-semibold">Transaction confirmed!</span>
                  </div>
                )}

                <button
                  className="btn btn-green w-full p-[13px] text-sm"
                  disabled={isBusy || !isConnected || !depositAmount}
                  onClick={handleDeposit}
                >
                  {isBusy ? <><span className="spinner" />Processing…</> : 'Deposit USDC'}
                </button>

                {!isConnected && (
                  <p className="text-[12px] text-muted text-center">
                    Connect wallet to deposit
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-[18px]">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="label">Shares to Withdraw</span>
                    <span className="text-[12px] text-muted">
                      Shares: <span className="mono text-text">{sharesBal}</span>
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      className="input"
                      placeholder="0.0000"
                      value={withdrawShares}
                      onChange={e => setWithdrawShares(e.target.value)}
                    />
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      <button
                        onClick={() => setWithdrawShares(sharesBal)}
                        className="text-[10px] font-bold text-yellow bg-yellow/10 border border-yellow/25 rounded p-[2px_6px] cursor-pointer hover:bg-yellow/20"
                      >
                        MAX
                      </button>
                      <span className="text-[13px] font-semibold text-muted">SHARES</span>
                    </div>
                  </div>
                </div>

                <div className="info-box info-yellow">
                  Withdrawing converts your lender shares back to USDC at the current share price.
                </div>

                <button
                  className="btn btn-yellow w-full p-[13px] text-sm"
                  disabled={isBusy || !isConnected || !withdrawShares}
                  onClick={handleWithdraw}
                >
                  {isBusy ? <><span className="spinner" />Processing…</> : 'Withdraw USDC'}
                </button>
              </div>
            )}
          </div>

          {/* BRGN rewards card */}
          <div className="card p-[20px_24px]">
            <div className="flex justify-between items-start mb-3.5">
              <div>
                <p className="label mb-1">Accrued BRGN Rewards</p>
                <p className="mono text-[22px] font-bold text-yellow">{accrued}</p>
                <p className="text-[11px] text-muted mt-0.5">BRGN tokens</p>
              </div>
              <span className="badge badge-yellow">Claimable</span>
            </div>
            <button
              className="btn btn-outline w-full p-2.5"
              disabled={isBusy || !isConnected || accrued === '0.00'}
              onClick={handleClaimBrgn}
            >
              {isBusy ? <><span className="spinner !border-t-yellow" />Processing…</> : 'Claim BRGN Rewards'}
            </button>
          </div>
        </div>

        {/* ── Right panel: position + stats ── */}
        <div className="flex flex-col gap-4">

          {/* Position summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Your Position',   value: `$${positionValue}`, sub: 'USDC equivalent'  },
              { label: 'Your Shares',     value: sharesBal,           sub: 'Lender shares'    },
              { label: 'Current APR',     value: apr,                 sub: 'Fixed rate'       },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-label">{s.label}</div>
                <div className="stat-value text-[18px]">{s.value}</div>
                <div className="stat-sub">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Lend explainer */}
          <div className="card p-[22px_24px]">
            <p className="section-title mb-4">How Lending Works</p>
            <div className="flex flex-col gap-3.5">
              {[
                { step: '01', title: 'Deposit USDC',    desc: 'Your USDC is pooled and made available for borrowers to borrow against their meme token collateral.' },
                { step: '02', title: 'Earn Interest',   desc: 'Borrowers pay a fixed 5% APR. Interest accrues continuously and is distributed to lenders pro-rata.' },
                { step: '03', title: 'Earn BRGN',       desc: 'Lenders earn BRGN governance tokens as additional yield. Claim anytime from the rewards card.' },
                { step: '04', title: 'Withdraw Anytime', desc: 'Redeem your lender shares for USDC at the current share price. No lockup.' },
              ].map(({ step, title, desc }) => (
                <div key={step} className="flex gap-3.5">
                  <span className="w-[26px] h-[26px] rounded-[5px] bg-border border border-dim flex items-center justify-center text-[10px] font-bold text-muted shrink-0">
                    {step}
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold text-text mb-0.5">{title}</p>
                    <p className="text-[12px] text-muted leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Risk note */}
          <div className="info-box info-yellow rounded-lg">
            <p className="font-semibold text-yellow mb-1">Risk Disclosure</p>
            <p>
              Lending on Brgent involves smart contract risk. Positions are protected by autonomous Guardian agents
              that liquidate under-collateralised borrowers before bad debt can accrue.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
