"use client";

import { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits, parseUnits, erc20Abi } from 'viem';
import { VAULT_ABI } from '../constants/abi';
import { VAULT_ADDRESS, USDC_ADDRESS, BRGN_TOKEN_ADDRESS } from '../constants/addresses';

const MEME_TOKENS = [
  { symbol: 'PEPE',  address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933' },
  { symbol: 'SHIB',  address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE' },
  { symbol: 'DOGE',  address: '0xbA2aE424d960c26247Dd6c32edC70B295c744C43' },
] as const;

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const [repayToken, setRepayToken] = useState<typeof MEME_TOKENS[number]>(MEME_TOKENS[0]);
  const [repayAmount, setRepayAmount] = useState('');

  const { data: usdcBalance }  = useReadContract({ address: USDC_ADDRESS,  abi: erc20Abi, functionName: 'balanceOf', args: address ? [address] : undefined });
  const { data: brgnBalance }  = useReadContract({ address: BRGN_TOKEN_ADDRESS as `0x${string}`, abi: erc20Abi, functionName: 'balanceOf', args: address ? [address] : undefined });
  const { data: userShares }   = useReadContract({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'lenderShares',  args: address ? [address] : undefined });
  const { data: totalShares }  = useReadContract({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'totalLenderShares' });
  const { data: totalReserves} = useReadContract({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'totalReservesUsdc' });
  const { data: accruedBrgn }  = useReadContract({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'accruedBrgn',   args: address ? [address] : undefined });

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const isBusy = isPending || isConfirming;

  const fmt6  = (v: unknown) => v ? Number(formatUnits(v as bigint, 6)).toFixed(2)  : '0.00';
  const fmt18 = (v: unknown) => v ? Number(formatUnits(v as bigint, 18)).toFixed(2) : '0.00';

  const posValue = (() => {
    if (!userShares || !totalShares || !totalReserves) return '0.00';
    const ts = totalShares as bigint;
    if (ts === BigInt(0)) return '0.00';
    return Number(formatUnits((userShares as bigint) * (totalReserves as bigint) / ts, 6)).toFixed(2);
  })();

  const handleRepay = () => {
    if (!repayAmount) return;
    writeContract({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'repay', args: [repayToken.address as `0x${string}`, parseUnits(repayAmount, 6)] });
  };

  const handleRepayWithCollateral = () => {
    writeContract({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'repayWithCollateral', args: [repayToken.address as `0x${string}`, BigInt(0)] });
  };

  const handleClaimBrgn = () => {
    writeContract({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'claimBRGNRewards', args: [] });
  };

  if (!isConnected) {
    return (
      <div className="p-8 max-w-[1100px] w-full">
        <div className="mb-7">
          <h1 className="text-[22px] font-bold text-text">Profile</h1>
        </div>
        <div className="card">
          <div className="empty-state p-[80px_24px]">
            <div className="icon-ring">
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </div>
            <p className="text-[15px] font-semibold text-text">Connect your wallet</p>
            <p className="text-[13px] text-muted">Connect from the sidebar to view your profile.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1100px] w-full">

      <div className="mb-7">
        <h1 className="text-[22px] font-bold text-text">Profile</h1>
        <p className="text-[13px] text-muted mt-1">
          Wallet overview and position management
        </p>
      </div>

      {/* Wallet address bar */}
      <div className="flex items-center gap-3 mb-6 p-[12px_18px] bg-surface border border-border rounded-lg shadow-sm">
        <span className="w-2.5 h-2.5 rounded-full bg-green shrink-0 animate-pulse" />
        <div>
          <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Connected Wallet</p>
          <p className="mono text-[13px] text-text">{address}</p>
        </div>
        <span className="badge badge-yellow ml-auto">BNB Testnet</span>
      </div>

      {/* Token balances */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'USDC Balance',     value: fmt6(usdcBalance),    unit: 'USDC'   },
          { label: 'BRGN Balance',     value: fmt18(brgnBalance),   unit: 'BRGN'   },
          { label: 'Lending Position', value: `$${posValue}`,       unit: 'USDC eq' },
          { label: 'Accrued BRGN',     value: fmt18(accruedBrgn),   unit: 'BRGN'   },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value text-[18px]">{s.value}</div>
            <div className="stat-sub">{s.unit}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">

        {/* ── Repay panel ── */}
        <div className="card p-6 flex flex-col gap-[18px]">
          <p className="section-title">Manage Positions</p>

          <div>
            <span className="label block mb-2">Select Position Token</span>
            <div className="flex flex-col gap-1.5">
              {MEME_TOKENS.map((t) => {
                const active = repayToken.symbol === t.symbol;
                return (
                  <button
                    key={t.symbol}
                    onClick={() => setRepayToken(t)}
                    className={`
                      flex items-center gap-2.5 p-[9px_12px] rounded-lg cursor-pointer border-none transition-all duration-150 text-left w-full
                      ${active 
                        ? 'bg-yellow/10 border-l-[3px] border-yellow outline outline-1 outline-yellow/20' 
                        : 'bg-surface-alt border-l-[3px] border-transparent outline outline-1 outline-border'
                      }
                    `}
                  >
                    <div className={`w-7 h-7 rounded-full bg-border flex items-center justify-center text-[9px] font-extrabold ${active ? 'text-yellow' : 'text-muted'}`}>
                      {t.symbol.slice(0, 2)}
                    </div>
                    <span className={`text-[13px] font-semibold ${active ? 'text-text' : 'text-muted'}`}>{t.symbol}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="label block mb-2">Repay Amount (USDC)</span>
            <div className="relative">
              <input type="number" className="input" placeholder="0.00" value={repayAmount} onChange={e => setRepayAmount(e.target.value)} />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-muted">USDC</span>
            </div>
          </div>

          {isSuccess && <div className="info-box info-green"><span className="text-green font-semibold">Transaction confirmed!</span></div>}

          <div className="flex flex-col gap-2">
            <button className="btn btn-yellow w-full p-3 text-sm font-semibold" disabled={isBusy || !repayAmount} onClick={handleRepay}>
              {isBusy ? <><span className="spinner" />Processing…</> : 'Repay with USDC'}
            </button>
            <button className="btn btn-ghost w-full p-3 text-sm font-semibold" disabled={isBusy} onClick={handleRepayWithCollateral}>
              {isBusy ? <><span className="spinner" />Processing…</> : 'Repay with Collateral (Swap)'}
            </button>
          </div>
        </div>

        {/* ── BRGN rewards ── */}
        <div className="flex flex-col gap-4">

          <div className="card p-[22px_24px]">
            <p className="section-title mb-4">BRGN Rewards</p>
            <div className="flex justify-between items-center p-4 bg-surface-alt border border-border rounded-lg mb-3.5">
              <div>
                <p className="text-[11px] text-muted uppercase tracking-wider mb-1">Accrued BRGN</p>
                <p className="mono text-[26px] font-bold text-yellow">{fmt18(accruedBrgn)}</p>
              </div>
              <span className="badge badge-yellow">Claimable</span>
            </div>
            <button
              className="btn btn-outline w-full p-3 font-semibold"
              disabled={isBusy || fmt18(accruedBrgn) === '0.00'}
              onClick={handleClaimBrgn}
            >
              {isBusy ? <><span className="spinner !border-t-yellow" />Processing…</> : 'Claim BRGN Rewards'}
            </button>
          </div>

          <div className="card p-[22px_24px]">
            <p className="section-title mb-3.5">Account Summary</p>
            {[
              ['Lender Shares',  userShares  ? formatUnits(userShares  as bigint, 6) : '0', 'SHARES'],
              ['USDC Balance',   fmt6(usdcBalance), 'USDC'],
              ['BRGN Balance',   fmt18(brgnBalance), 'BRGN'],
              ['Accrued BRGN',   fmt18(accruedBrgn), 'BRGN'],
            ].map(([label, value, unit]) => (
              <div key={label as string} className="flex justify-between items-center mb-3 last:mb-0">
                <span className="text-[12px] text-muted">{label}</span>
                <div className="text-right">
                  <span className="mono text-[13px] font-semibold text-text">{value as string}</span>
                  <span className="text-[11px] text-dim ml-1">{unit}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="info-box info-yellow rounded-lg">
            <p className="font-semibold text-yellow mb-1">BRGN Governance Token</p>
            <p>BRGN tokens earned as lending rewards give you governance rights and allow you to register as a Guardian agent with 1,000,000 BRGN.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
