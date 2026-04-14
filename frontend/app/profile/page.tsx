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
      <div style={{ padding: '32px 36px', maxWidth: 1100, width: '100%' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#EAECEF' }}>Profile</h1>
        </div>
        <div className="card">
          <div className="empty-state" style={{ padding: '80px 24px' }}>
            <div className="icon-ring">
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#848E9C" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#EAECEF' }}>Connect your wallet</p>
            <p style={{ fontSize: 13, color: '#848E9C' }}>Connect from the sidebar to view your profile.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1100, width: '100%' }}>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#EAECEF' }}>Profile</h1>
        <p style={{ fontSize: 13, color: '#848E9C', marginTop: 4 }}>
          Wallet overview and position management
        </p>
      </div>

      {/* Wallet address bar */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24,
          padding: '12px 18px', background: '#1E2329', border: '1px solid #2B3139', borderRadius: 8,
        }}
      >
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#0ECB81', flexShrink: 0 }} />
        <div>
          <p style={{ fontSize: 10, color: '#848E9C', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Connected Wallet</p>
          <p className="mono" style={{ fontSize: 13, color: '#EAECEF' }}>{address}</p>
        </div>
        <span className="badge badge-yellow" style={{ marginLeft: 'auto' }}>BNB Testnet</span>
      </div>

      {/* Token balances */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'USDC Balance',     value: fmt6(usdcBalance),    unit: 'USDC'   },
          { label: 'BRGN Balance',     value: fmt18(brgnBalance),   unit: 'BRGN'   },
          { label: 'Lending Position', value: `$${posValue}`,       unit: 'USDC eq' },
          { label: 'Accrued BRGN',     value: fmt18(accruedBrgn),   unit: 'BRGN'   },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ fontSize: 18 }}>{s.value}</div>
            <div className="stat-sub">{s.unit}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

        {/* ── Repay panel ── */}
        <div className="card" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <p className="section-title">Manage Positions</p>

          <div>
            <span className="label" style={{ display: 'block', marginBottom: 8 }}>Select Position Token</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {MEME_TOKENS.map((t) => {
                const active = repayToken.symbol === t.symbol;
                return (
                  <button
                    key={t.symbol}
                    onClick={() => setRepayToken(t)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 12px', borderRadius: 6, cursor: 'pointer', border: 'none',
                      background: active ? 'rgba(240,185,11,0.08)' : '#161A1E',
                      borderLeft: `3px solid ${active ? '#F0B90B' : 'transparent'}`,
                      outline: active ? '1px solid rgba(240,185,11,0.2)' : '1px solid #2B3139',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#2B3139', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: active ? '#F0B90B' : '#848E9C' }}>
                      {t.symbol.slice(0, 2)}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: active ? '#EAECEF' : '#848E9C' }}>{t.symbol}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="label" style={{ display: 'block', marginBottom: 8 }}>Repay Amount (USDC)</span>
            <div style={{ position: 'relative' }}>
              <input type="number" className="input" placeholder="0.00" value={repayAmount} onChange={e => setRepayAmount(e.target.value)} />
              <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 600, color: '#848E9C' }}>USDC</span>
            </div>
          </div>

          {isSuccess && <div className="info-box info-green"><span style={{ color: '#0ECB81', fontWeight: 600 }}>Transaction confirmed!</span></div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn btn-yellow" style={{ width: '100%', padding: '12px' }} disabled={isBusy || !repayAmount} onClick={handleRepay}>
              {isBusy ? <><span className="spinner" />Processing…</> : 'Repay with USDC'}
            </button>
            <button className="btn btn-ghost" style={{ width: '100%', padding: '12px' }} disabled={isBusy} onClick={handleRepayWithCollateral}>
              {isBusy ? <><span className="spinner" />Processing…</> : 'Repay with Collateral (Swap)'}
            </button>
          </div>
        </div>

        {/* ── BRGN rewards ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div className="card" style={{ padding: '22px 24px' }}>
            <p className="section-title" style={{ marginBottom: 16 }}>BRGN Rewards</p>
            <div
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '16px', background: '#161A1E', border: '1px solid #2B3139', borderRadius: 6, marginBottom: 14,
              }}
            >
              <div>
                <p style={{ fontSize: 11, color: '#848E9C', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Accrued BRGN</p>
                <p className="mono" style={{ fontSize: 26, fontWeight: 700, color: '#F0B90B' }}>{fmt18(accruedBrgn)}</p>
              </div>
              <span className="badge badge-yellow">Claimable</span>
            </div>
            <button
              className="btn btn-outline"
              style={{ width: '100%', padding: '12px' }}
              disabled={isBusy || fmt18(accruedBrgn) === '0.00'}
              onClick={handleClaimBrgn}
            >
              {isBusy ? <><span className="spinner" style={{ borderTopColor: '#F0B90B' }} />Processing…</> : 'Claim BRGN Rewards'}
            </button>
          </div>

          <div className="card" style={{ padding: '22px 24px' }}>
            <p className="section-title" style={{ marginBottom: 14 }}>Account Summary</p>
            {[
              ['Lender Shares',  userShares  ? formatUnits(userShares  as bigint, 6) : '0', 'SHARES'],
              ['USDC Balance',   fmt6(usdcBalance), 'USDC'],
              ['BRGN Balance',   fmt18(brgnBalance), 'BRGN'],
              ['Accrued BRGN',   fmt18(accruedBrgn), 'BRGN'],
            ].map(([label, value, unit]) => (
              <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: '#848E9C' }}>{label}</span>
                <div style={{ textAlign: 'right' }}>
                  <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: '#EAECEF' }}>{value as string}</span>
                  <span style={{ fontSize: 11, color: '#474D57', marginLeft: 4 }}>{unit}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="info-box info-yellow" style={{ borderRadius: 8 }}>
            <p style={{ fontWeight: 600, color: '#F0B90B', marginBottom: 4 }}>BRGN Governance Token</p>
            <p>BRGN tokens earned as lending rewards give you governance rights and allow you to register as a Guardian agent with 1,000,000 BRGN.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
