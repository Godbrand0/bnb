"use client";

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits, parseUnits, erc20Abi } from 'viem';
import { VAULT_ABI } from '../constants/abi';
import { VAULT_ADDRESS, USDC_ADDRESS } from '../constants/addresses';
import { FOUR_MEME_TOKENS, Token } from '../constants/tokens';

export default function BorrowPage() {
  const { address, isConnected } = useAccount();
  const [selectedToken, setSelectedToken] = useState<Token>(FOUR_MEME_TOKENS[0]);
  const [search, setSearch] = useState('');
  const [borrowAmount, setAmount] = useState('');
  const [targetLtv, setTargetLtv] = useState(50);

  // Auto-Scan: Fetch balances for all Four.Meme tokens
  const { data: balancesData } = useReadContracts({
    contracts: FOUR_MEME_TOKENS.map(t => ({
      address: t.address,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: address ? [address] : undefined,
    })),
    query: { enabled: !!address && isConnected }
  });

  const tokensWithBalances = FOUR_MEME_TOKENS.map((t, i) => ({
    ...t,
    balance: balancesData?.[i]?.result as bigint || 0n
  }));

  const filteredAndSorted = tokensWithBalances
    .filter(t => t.symbol.toLowerCase().includes(search.toLowerCase()) || t.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b.balance > 0n ? 1 : 0) - (a.balance > 0n ? 1 : 0));

  useEffect(() => {
    // If our selected token is filtered out, pick the first available one
    if (!filteredAndSorted.find(t => t.symbol === selectedToken.symbol) && filteredAndSorted.length > 0) {
      setSelectedToken(filteredAndSorted[0]);
    }
  }, [search, filteredAndSorted, selectedToken.symbol]);

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
    <div className="p-8 max-w-[1100px] w-full">

      <div className="mb-7">
        <h1 className="text-[22px] font-bold text-text">Borrow</h1>
        <p className="text-[13px] text-muted mt-1">
          Use Four.Meme tokens as collateral to borrow USDC
        </p>
      </div>

      <div className="grid grid-cols-[460px_1fr] gap-6">

        {/* ── Borrow form ── */}
        <div className="flex flex-col gap-4">

          <div className="card p-6 flex flex-col gap-5">

            {/* Collateral selector */}
            <div>
              <div className="flex justify-between items-center mb-2.5">
                <span className="label">Select Collateral</span>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Search..." 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="bg-surface-alt border border-border rounded p-[4px_8px_4px_24px] text-text text-[11px] w-[120px] outline-none"
                  />
                  <svg 
                    className="absolute left-2 top-1/2 -translate-y-1/2"
                    width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="var(--color-dim)" strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-1 custom-scroll">
                {filteredAndSorted.map((token) => {
                  const active = selectedToken.symbol === token.symbol;
                  const hasBalance = token.balance > 0n;
                  return (
                    <button
                      key={token.symbol}
                      onClick={() => setSelectedToken(token)}
                      className={`
                        flex items-center justify-between p-[10px_14px] rounded-lg cursor-pointer border-none transition-all duration-150 w-full text-left
                        ${active 
                          ? 'bg-yellow/10 border-l-[3px] border-yellow outline outline-1 outline-yellow/20' 
                          : 'bg-surface-alt border-l-[3px] border-transparent outline outline-1 outline-border'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`
                            w-[30px] h-[30px] rounded-full flex items-center justify-center text-[10px] font-extrabold
                            ${hasBalance 
                              ? 'bg-linear-to-br from-yellow to-yellow/60 text-bg' 
                              : (active ? 'bg-border text-yellow' : 'bg-border text-muted')
                            }
                          `}
                        >
                          {token.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className={`text-[13px] font-semibold ${active ? 'text-text' : 'text-muted'}`}>{token.symbol}</p>
                            {hasBalance && <span className="text-[9px] bg-green/15 text-green p-[1px_4px] rounded-[3px] font-bold">WALLET</span>}
                          </div>
                          <p className="text-[11px] text-dim">{token.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] text-muted">Max LTV</p>
                        <p className={`mono text-[12px] font-semibold ${active ? 'text-yellow' : 'text-muted'}`}>{token.maxLtv}%</p>
                      </div>
                    </button>
                  );
                })}
                {filteredAndSorted.length === 0 && (
                  <p className="text-center p-5 text-[12px] text-dim">No tokens found</p>
                )}
              </div>
            </div>

            <div className="hr" />

            {/* Borrow amount */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="label">Borrow Amount</span>
                <span className="text-[12px] text-muted">
                  Available: <span className="mono text-text">{liquidity}</span>
                </span>
              </div>
              <div className="relative">
                <input type="number" className="input" placeholder="0.00" value={borrowAmount} onChange={e => setAmount(e.target.value)} />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-muted">USDC</span>
              </div>
            </div>

            {/* LTV slider */}
            <div>
              <div className="flex justify-between mb-2.5">
                <span className="label">Target LTV</span>
                <div className="flex items-baseline gap-1">
                  <span className={`mono text-[18px] font-bold text-${ltvClass}`}>{targetLtv}%</span>
                  <span className="text-[11px] text-muted">/ {selectedToken.maxLtv}% max</span>
                </div>
              </div>
              <input
                type="range" min={10} max={selectedToken.maxLtv} value={targetLtv}
                onChange={e => setTargetLtv(Number(e.target.value))}
                className={`w-full accent-${ltvClass} cursor-pointer`}
              />
              <div className="relative mt-1.5">
                <div className="ltv-track">
                  <div className={`ltv-fill ${ltvClass}`} style={{ width: `${(targetLtv / selectedToken.maxLtv) * 100}%` }} />
                  {/* liquidation marker */}
                  <div className="absolute right-0 -top-[3px] w-[2px] h-[11px] bg-red rounded-[1px]" />
                </div>
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[10px] text-dim font-medium uppercase tracking-tight">Conservative</span>
                <span className="text-[10px] text-red font-medium uppercase tracking-tight">Liq. at {selectedToken.maxLtv + 5}%</span>
              </div>
            </div>

            {/* Summary row */}
            <div className="bg-surface-alt border border-border rounded-lg p-3 flex flex-col gap-2">
              {[
                ['Borrow Rate', apr, 'text'],
                ['Max LTV',     `${selectedToken.maxLtv}%`, 'yellow'],
                ['Repay Mode',  'USDC or Collateral', 'muted'],
              ].map(([k, v, c]) => (
                <div key={k as string} className="flex justify-between">
                  <span className="text-[12px] text-muted">{k}</span>
                  <span className={`mono text-[12px] font-semibold text-${c}`}>{v}</span>
                </div>
              ))}
            </div>

            {targetLtv >= 55 && (
              <div className="info-box info-red">
                <span className="text-red font-semibold">High LTV Warning</span> — Your position is close to the liquidation threshold. Guardian agents will liquidate if LTV exceeds {selectedToken.maxLtv + 5}%.
              </div>
            )}

            {isSuccess && (
              <div className="info-box info-green">
                <span className="text-green font-semibold">Transaction confirmed!</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <button
                className="btn btn-yellow p-[13px] text-sm"
                disabled={isBusy || !isConnected || !borrowAmount}
                onClick={handleBorrow}
              >
                {isBusy ? <><span className="spinner" />Processing…</> : 'Borrow USDC'}
              </button>
              <button
                className="btn btn-ghost p-[13px] text-sm"
                disabled={isBusy || !isConnected || !borrowAmount}
                onClick={handleRepay}
              >
                Repay
              </button>
            </div>

          </div>
        </div>

        {/* ── Right: info + active positions ── */}
        <div className="flex flex-col gap-4">

          {/* Market stats */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Available Liquidity', value: liquidity, sub: 'Ready to borrow' },
              { label: 'Borrow Rate',         value: apr,       sub: 'Fixed APR'       },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-label">{s.label}</div>
                <div className="stat-value text-[20px]">{s.value}</div>
                <div className="stat-sub">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Active positions placeholder */}
          <div className="card">
            <div className="p-4 px-5 border-b border-border flex justify-between items-center">
              <div>
                <p className="section-title">Your Positions</p>
                <p className="section-sub">Open borrow positions</p>
              </div>
            </div>
            {isConnected ? (
              <div className="empty-state">
                <div className="icon-ring">
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                </div>
                <p className="text-[13px] font-semibold text-text">No Active Positions</p>
                <p className="text-[12px] text-muted">Open a position using the form on the left.</p>
              </div>
            ) : (
              <div className="empty-state">
                <div className="icon-ring">
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                  </svg>
                </div>
                <p className="text-[13px] font-semibold text-text">Connect Wallet</p>
                <p className="text-[12px] text-muted">Connect your wallet to view open positions.</p>
              </div>
            )}
          </div>

          {/* Repay with collateral note */}
          <div className="info-box info-yellow rounded-lg">
            <p className="font-semibold text-yellow mb-1">Repay With Collateral</p>
            <p>
              You can repay loans by swapping your collateral token directly via PancakeSwap V2.
              Use the <code className="bg-border p-[1px_4px] rounded text-[11px]">repayWithCollateral</code> flow on your profile page.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
