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
    <div style={{ padding: '32px 36px', maxWidth: 1100, width: '100%' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#EAECEF' }}>Lend</h1>
        <p style={{ fontSize: 13, color: '#848E9C', marginTop: 4 }}>
          Deposit USDC to earn yield and BRGN emissions
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: 24 }}>

        {/* ── Action Panel ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Action tabs */}
          <div style={{ display: 'flex', gap: 2, background: '#161A1E', border: '1px solid #2B3139', borderRadius: 8, padding: 4 }}>
            {(['deposit', 'withdraw'] as const).map((a) => (
              <button
                key={a}
                onClick={() => setActiveAction(a)}
                style={{
                  flex: 1, padding: '9px', border: 'none', borderRadius: 6, cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, textTransform: 'capitalize',
                  background: activeAction === a ? '#F0B90B' : 'transparent',
                  color: activeAction === a ? '#0B0E11' : '#848E9C',
                  transition: 'all 0.15s',
                }}
              >
                {a.charAt(0).toUpperCase() + a.slice(1)}
              </button>
            ))}
          </div>

          <div className="card" style={{ padding: '24px' }}>

            {activeAction === 'deposit' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span className="label">Amount (USDC)</span>
                    <span style={{ fontSize: 12, color: '#848E9C' }}>
                      Balance: <span className="mono" style={{ color: '#EAECEF' }}>{usdcBal}</span>
                    </span>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      className="input"
                      placeholder="0.00"
                      value={depositAmount}
                      onChange={e => setDepositAmount(e.target.value)}
                    />
                    <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        onClick={() => setDepositAmount(usdcBal)}
                        style={{ fontSize: 10, fontWeight: 700, color: '#F0B90B', background: 'rgba(240,185,11,0.1)', border: '1px solid rgba(240,185,11,0.25)', borderRadius: 4, padding: '2px 6px', cursor: 'pointer' }}
                      >
                        MAX
                      </button>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#848E9C' }}>USDC</span>
                    </div>
                  </div>
                </div>

                {/* APR info */}
                <div className="info-box info-green">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: '#0ECB81', fontWeight: 600 }}>Estimated APR</span>
                    <span className="mono" style={{ color: '#0ECB81', fontWeight: 700 }}>{apr}</span>
                  </div>
                  <p>Fixed interest rate paid by borrowers. You also receive BRGN governance token emissions.</p>
                </div>

                {isSuccess && (
                  <div className="info-box info-green">
                    <span style={{ color: '#0ECB81', fontWeight: 600 }}>Transaction confirmed!</span>
                  </div>
                )}

                <button
                  className="btn btn-green"
                  style={{ width: '100%', padding: '13px', fontSize: 14 }}
                  disabled={isBusy || !isConnected || !depositAmount}
                  onClick={handleDeposit}
                >
                  {isBusy ? <><span className="spinner" />Processing…</> : 'Deposit USDC'}
                </button>

                {!isConnected && (
                  <p style={{ fontSize: 12, color: '#848E9C', textAlign: 'center' }}>
                    Connect wallet to deposit
                  </p>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span className="label">Shares to Withdraw</span>
                    <span style={{ fontSize: 12, color: '#848E9C' }}>
                      Shares: <span className="mono" style={{ color: '#EAECEF' }}>{sharesBal}</span>
                    </span>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      className="input"
                      placeholder="0.0000"
                      value={withdrawShares}
                      onChange={e => setWithdrawShares(e.target.value)}
                    />
                    <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        onClick={() => setWithdrawShares(sharesBal)}
                        style={{ fontSize: 10, fontWeight: 700, color: '#F0B90B', background: 'rgba(240,185,11,0.1)', border: '1px solid rgba(240,185,11,0.25)', borderRadius: 4, padding: '2px 6px', cursor: 'pointer' }}
                      >
                        MAX
                      </button>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#848E9C' }}>SHARES</span>
                    </div>
                  </div>
                </div>

                <div className="info-box info-yellow">
                  Withdrawing converts your lender shares back to USDC at the current share price.
                </div>

                <button
                  className="btn btn-yellow"
                  style={{ width: '100%', padding: '13px', fontSize: 14 }}
                  disabled={isBusy || !isConnected || !withdrawShares}
                  onClick={handleWithdraw}
                >
                  {isBusy ? <><span className="spinner" />Processing…</> : 'Withdraw USDC'}
                </button>
              </div>
            )}
          </div>

          {/* BRGN rewards card */}
          <div className="card" style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <p className="label" style={{ marginBottom: 4 }}>Accrued BRGN Rewards</p>
                <p className="mono" style={{ fontSize: 22, fontWeight: 700, color: '#F0B90B' }}>{accrued}</p>
                <p style={{ fontSize: 11, color: '#848E9C', marginTop: 2 }}>BRGN tokens</p>
              </div>
              <span className="badge badge-yellow">Claimable</span>
            </div>
            <button
              className="btn btn-outline"
              style={{ width: '100%', padding: '10px' }}
              disabled={isBusy || !isConnected || accrued === '0.00'}
              onClick={handleClaimBrgn}
            >
              {isBusy ? <><span className="spinner" style={{ borderTopColor: '#F0B90B' }} />Processing…</> : 'Claim BRGN Rewards'}
            </button>
          </div>
        </div>

        {/* ── Right panel: position + stats ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Position summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[
              { label: 'Your Position',   value: `$${positionValue}`, sub: 'USDC equivalent'  },
              { label: 'Your Shares',     value: sharesBal,           sub: 'Lender shares'    },
              { label: 'Current APR',     value: apr,                 sub: 'Fixed rate'       },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ fontSize: 18 }}>{s.value}</div>
                <div className="stat-sub">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Lend explainer */}
          <div className="card" style={{ padding: '22px 24px' }}>
            <p className="section-title" style={{ marginBottom: 16 }}>How Lending Works</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { step: '01', title: 'Deposit USDC',    desc: 'Your USDC is pooled and made available for borrowers to borrow against their meme token collateral.' },
                { step: '02', title: 'Earn Interest',   desc: 'Borrowers pay a fixed 5% APR. Interest accrues continuously and is distributed to lenders pro-rata.' },
                { step: '03', title: 'Earn BRGN',       desc: 'Lenders earn BRGN governance tokens as additional yield. Claim anytime from the rewards card.' },
                { step: '04', title: 'Withdraw Anytime', desc: 'Redeem your lender shares for USDC at the current share price. No lockup.' },
              ].map(({ step, title, desc }) => (
                <div key={step} style={{ display: 'flex', gap: 14 }}>
                  <span
                    style={{
                      width: 26, height: 26, borderRadius: 5,
                      background: '#2B3139', border: '1px solid #474D57',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, color: '#848E9C', flexShrink: 0,
                    }}
                  >
                    {step}
                  </span>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#EAECEF', marginBottom: 2 }}>{title}</p>
                    <p style={{ fontSize: 12, color: '#848E9C', lineHeight: 1.5 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Risk note */}
          <div className="info-box info-yellow" style={{ borderRadius: 8 }}>
            <p style={{ fontWeight: 600, color: '#F0B90B', marginBottom: 4 }}>Risk Disclosure</p>
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
