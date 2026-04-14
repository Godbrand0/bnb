"use client";

import { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits, parseUnits, erc20Abi } from 'viem';
import { VAULT_ABI } from '../constants/abi';
import { VAULT_ADDRESS, USDC_ADDRESS } from '../constants/addresses';

const MEME_TOKENS = [
  { symbol: 'PEPE',  name: 'Pepe',      address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933', maxLtv: 60, rate: 5  },
  { symbol: 'SHIB',  name: 'Shiba Inu', address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE', maxLtv: 55, rate: 5  },
  { symbol: 'DOGE',  name: 'Dogecoin',  address: '0xbA2aE424d960c26247Dd6c32edC70B295c744C43', maxLtv: 60, rate: 5  },
  { symbol: 'FLOKI', name: 'Floki',     address: '0xfb5B838b6cfEEdC2873aB27866079AC55363D37A', maxLtv: 50, rate: 6  },
] as const;

export default function BorrowPage() {
  const { address, isConnected } = useAccount();
  const [selectedToken, setSelectedToken] = useState<typeof MEME_TOKENS[number]>(MEME_TOKENS[0]);
  const [borrowAmount, setAmount] = useState('');
  const [targetLtv, setTargetLtv] = useState(50);

  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS, abi: erc20Abi, functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });
  const { data: aprBps } = useReadContract({
    address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'BORROW_INTEREST_RATE_BPS',
  });
  const { data: totalReserves } = useReadContract({
    address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'totalReservesUsdc',
  });

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const isBusy = isPending || isConfirming;

  const apr = aprBps ? `${Number(aprBps) / 100}%` : '5.00%';
  const liquidity = totalReserves ? `$${Number(formatUnits(totalReserves as bigint, 6)).toLocaleString()}` : '$0.00';
  const usdcBal = usdcBalance ? Number(formatUnits(usdcBalance as bigint, 6)).toFixed(2) : '0.00';

  const ltvColor = targetLtv >= 58 ? '#F6465D' : targetLtv >= 45 ? '#F0B90B' : '#0ECB81';
  const ltvClass = targetLtv >= 58 ? 'danger' : targetLtv >= 45 ? 'warning' : 'safe';

  const handleBorrow = () => {
    if (!borrowAmount) return;
    writeContract({
      address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'borrow',
      args: [selectedToken.address as `0x${string}`, parseUnits(borrowAmount, 6)],
    });
  };

  const handleRepay = () => {
    if (!borrowAmount) return;
    writeContract({
      address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'repay',
      args: [selectedToken.address as `0x${string}`, parseUnits(borrowAmount, 6)],
    });
  };

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1100, width: '100%' }}>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#EAECEF' }}>Borrow</h1>
        <p style={{ fontSize: 13, color: '#848E9C', marginTop: 4 }}>
          Use Four.Meme tokens as collateral to borrow USDC
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '460px 1fr', gap: 24 }}>

        {/* ── Borrow form ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Collateral selector */}
            <div>
              <span className="label" style={{ display: 'block', marginBottom: 10 }}>Select Collateral</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {MEME_TOKENS.map((token) => {
                  const active = selectedToken.symbol === token.symbol;
                  return (
                    <button
                      key={token.symbol}
                      onClick={() => setSelectedToken(token)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 14px', borderRadius: 6, cursor: 'pointer', border: 'none',
                        background: active ? 'rgba(240,185,11,0.08)' : '#161A1E',
                        borderLeft: `3px solid ${active ? '#F0B90B' : 'transparent'}`,
                        outline: active ? '1px solid rgba(240,185,11,0.2)' : '1px solid #2B3139',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 30, height: 30, borderRadius: '50%', background: '#2B3139',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 800, color: active ? '#F0B90B' : '#848E9C',
                          }}
                        >
                          {token.symbol.slice(0, 2)}
                        </div>
                        <div style={{ textAlign: 'left' }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: active ? '#EAECEF' : '#848E9C' }}>{token.symbol}</p>
                          <p style={{ fontSize: 11, color: '#474D57' }}>{token.name}</p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 11, color: '#848E9C' }}>Max LTV</p>
                        <p className="mono" style={{ fontSize: 12, fontWeight: 600, color: active ? '#F0B90B' : '#848E9C' }}>{token.maxLtv}%</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="hr" />

            {/* Borrow amount */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span className="label">Borrow Amount</span>
                <span style={{ fontSize: 12, color: '#848E9C' }}>
                  Available: <span className="mono" style={{ color: '#EAECEF' }}>{liquidity}</span>
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <input type="number" className="input" placeholder="0.00" value={borrowAmount} onChange={e => setAmount(e.target.value)} />
                <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 600, color: '#848E9C' }}>USDC</span>
              </div>
            </div>

            {/* LTV slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span className="label">Target LTV</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span className="mono" style={{ fontSize: 18, fontWeight: 700, color: ltvColor }}>{targetLtv}%</span>
                  <span style={{ fontSize: 11, color: '#848E9C' }}>/ {selectedToken.maxLtv}% max</span>
                </div>
              </div>
              <input
                type="range" min={10} max={selectedToken.maxLtv} value={targetLtv}
                onChange={e => setTargetLtv(Number(e.target.value))}
                style={{ width: '100%', accentColor: ltvColor, cursor: 'pointer' }}
              />
              <div style={{ position: 'relative', marginTop: 6 }}>
                <div className="ltv-track">
                  <div className={`ltv-fill ${ltvClass}`} style={{ width: `${(targetLtv / selectedToken.maxLtv) * 100}%` }} />
                  {/* liquidation marker */}
                  <div style={{ position: 'absolute', right: 0, top: -3, width: 2, height: 11, background: '#F6465D', borderRadius: 1 }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span style={{ fontSize: 10, color: '#474D57' }}>Conservative</span>
                <span style={{ fontSize: 10, color: '#F6465D' }}>Liq. at {selectedToken.maxLtv + 5}%</span>
              </div>
            </div>

            {/* Summary row */}
            <div style={{ background: '#161A1E', border: '1px solid #2B3139', borderRadius: 6, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['Borrow Rate', apr, '#EAECEF'],
                ['Max LTV',     `${selectedToken.maxLtv}%`, '#F0B90B'],
                ['Repay Mode',  'USDC or Collateral', '#848E9C'],
              ].map(([k, v, c]) => (
                <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: '#848E9C' }}>{k}</span>
                  <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: c as string }}>{v}</span>
                </div>
              ))}
            </div>

            {targetLtv >= 55 && (
              <div className="info-box info-red">
                <span style={{ color: '#F6465D', fontWeight: 600 }}>High LTV Warning</span> — Your position is close to the liquidation threshold. Guardian agents will liquidate if LTV exceeds {selectedToken.maxLtv + 5}%.
              </div>
            )}

            {isSuccess && (
              <div className="info-box info-green">
                <span style={{ color: '#0ECB81', fontWeight: 600 }}>Transaction confirmed!</span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                className="btn btn-yellow"
                style={{ padding: '13px', fontSize: 14 }}
                disabled={isBusy || !isConnected || !borrowAmount}
                onClick={handleBorrow}
              >
                {isBusy ? <><span className="spinner" />Processing…</> : 'Borrow USDC'}
              </button>
              <button
                className="btn btn-ghost"
                style={{ padding: '13px', fontSize: 14 }}
                disabled={isBusy || !isConnected || !borrowAmount}
                onClick={handleRepay}
              >
                Repay
              </button>
            </div>

          </div>
        </div>

        {/* ── Right: info + active positions ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Market stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'Available Liquidity', value: liquidity, sub: 'Ready to borrow' },
              { label: 'Borrow Rate',         value: apr,       sub: 'Fixed APR'       },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ fontSize: 20 }}>{s.value}</div>
                <div className="stat-sub">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Active positions placeholder */}
          <div className="card">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #2B3139', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p className="section-title">Your Positions</p>
                <p className="section-sub">Open borrow positions</p>
              </div>
            </div>
            {isConnected ? (
              <div className="empty-state">
                <div className="icon-ring">
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#848E9C" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#EAECEF' }}>No Active Positions</p>
                <p style={{ fontSize: 12, color: '#848E9C' }}>Open a position using the form on the left.</p>
              </div>
            ) : (
              <div className="empty-state">
                <div className="icon-ring">
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#848E9C" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                  </svg>
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#EAECEF' }}>Connect Wallet</p>
                <p style={{ fontSize: 12, color: '#848E9C' }}>Connect your wallet to view open positions.</p>
              </div>
            )}
          </div>

          {/* Repay with collateral note */}
          <div className="info-box info-yellow" style={{ borderRadius: 8 }}>
            <p style={{ fontWeight: 600, color: '#F0B90B', marginBottom: 4 }}>Repay With Collateral</p>
            <p>
              You can repay loans by swapping your collateral token directly via PancakeSwap V2.
              Use the <code style={{ background: '#2B3139', padding: '1px 4px', borderRadius: 3, fontSize: 11 }}>repayWithCollateral</code> flow on your profile page.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
