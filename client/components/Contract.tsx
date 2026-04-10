"use client";

import { useState, useCallback } from "react";
import {
  mintCarbonCredits,
  transferCarbonCredits,
  getBalance,
  CONTRACT_ADDRESS,
} from "@/hooks/contract";
import { AnimatedCard } from "@/components/ui/animated-card";
import { Spotlight } from "@/components/ui/spotlight";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ── Icons ────────────────────────────────────────────────────

function SpinnerIcon() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function CoinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
      <path d="M12 18V6" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function LeafIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 9.8 6.1 15.5 15.5 0 0 1 21 8a2 2 0 0 1-2 2 2 2 0 0 1-2-2 11.5 11.5 0 0 0-7-4 2 2 0 0 1-2-2 2 2 0 0 1 2-2 2 2 0 0 1 2 2 11.5 11.5 0 0 0 7 4 2 2 0 0 1 2 2 2 2 0 0 1-2 2 7 7 0 0 1-7 7 2 2 0 0 1-2-2 2 2 0 0 1 2-2 2 2 0 0 1-2 2 7 7 0 0 1-2.4-.9 15.5 15.5 0 0 1-4.7-6.5A7 7 0 0 1 11 20z" />
    </svg>
  );
}

// ── Styled Input ─────────────────────────────────────────────

function Input({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-2">
      <label className="block text-[11px] font-medium uppercase tracking-wider text-white/30">
        {label}
      </label>
      <div className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-px transition-all focus-within:border-[#10b981]/30 focus-within:shadow-[0_0_20px_rgba(16,185,129,0.08)]">
        <input
          {...props}
          className="w-full rounded-[11px] bg-transparent px-4 py-3 font-mono text-sm text-white/90 placeholder:text-white/15 outline-none"
        />
      </div>
    </div>
  );
}

// ── Method Signature ─────────────────────────────────────────

function MethodSignature({
  name,
  params,
  returns,
  color,
}: {
  name: string;
  params: string;
  returns?: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3 font-mono text-sm">
      <span style={{ color }} className="font-semibold">fn</span>
      <span className="text-white/70">{name}</span>
      <span className="text-white/20 text-xs">{params}</span>
      {returns && (
        <span className="ml-auto text-white/15 text-[10px]">{returns}</span>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────

type Tab = "balance" | "mint" | "transfer";

interface ContractUIProps {
  walletAddress: string | null;
  onConnect: () => void;
  isConnecting: boolean;
}

export default function ContractUI({ walletAddress, onConnect, isConnecting }: ContractUIProps) {
  const [activeTab, setActiveTab] = useState<Tab>("balance");
  const [error, setError] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);

  // Mint state
  const [mintTo, setMintTo] = useState("");
  const [mintAmount, setMintAmount] = useState("");
  const [isMinting, setIsMinting] = useState(false);

  // Transfer state
  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);

  // Balance state
  const [balanceAddress, setBalanceAddress] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [balanceResult, setBalanceResult] = useState<bigint | null>(null);

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const handleMint = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!mintTo.trim() || !mintAmount.trim()) return setError("Fill in all fields");
    const amount = BigInt(mintAmount.trim());
    if (amount <= 0n) return setError("Amount must be positive");
    setError(null);
    setIsMinting(true);
    setTxStatus("Awaiting signature...");
    try {
      await mintCarbonCredits(walletAddress, mintTo.trim(), amount);
      setTxStatus("Carbon credits minted!");
      setMintTo("");
      setMintAmount("");
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsMinting(false);
    }
  }, [walletAddress, mintTo, mintAmount]);

  const handleTransfer = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!transferTo.trim() || !transferAmount.trim()) return setError("Fill in all fields");
    const amount = BigInt(transferAmount.trim());
    if (amount <= 0n) return setError("Amount must be positive");
    setError(null);
    setIsTransferring(true);
    setTxStatus("Awaiting signature...");
    try {
      await transferCarbonCredits(walletAddress, transferTo.trim(), amount);
      setTxStatus("Carbon credits transferred!");
      setTransferTo("");
      setTransferAmount("");
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsTransferring(false);
    }
  }, [walletAddress, transferTo, transferAmount]);

  const handleCheckBalance = useCallback(async () => {
    if (!balanceAddress.trim()) return setError("Enter an address");
    setError(null);
    setIsChecking(true);
    setBalanceResult(null);
    try {
      const result = await getBalance(balanceAddress.trim());
      setBalanceResult(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setIsChecking(false);
    }
  }, [balanceAddress]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode; color: string }[] = [
    { key: "balance", label: "Balance", icon: <SearchIcon />, color: "#10b981" },
    { key: "mint", label: "Mint", icon: <CoinIcon />, color: "#34d399" },
    { key: "transfer", label: "Transfer", icon: <RefreshIcon />, color: "#fbbf24" },
  ];

  return (
    <div className="w-full max-w-2xl animate-fade-in-up-delayed">
      {/* Toasts */}
      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#f87171]/15 bg-[#f87171]/[0.05] px-4 py-3 backdrop-blur-sm animate-slide-down">
          <span className="mt-0.5 text-[#f87171]"><AlertIcon /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#f87171]/90">Error</p>
            <p className="text-xs text-[#f87171]/50 mt-0.5 break-all">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="shrink-0 text-[#f87171]/30 hover:text-[#f87171]/70 text-lg leading-none">&times;</button>
        </div>
      )}

      {txStatus && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#34d399]/15 bg-[#34d399]/[0.05] px-4 py-3 backdrop-blur-sm shadow-[0_0_30px_rgba(52,211,153,0.05)] animate-slide-down">
          <span className="text-[#34d399]">
            {txStatus.includes("on-chain") || txStatus.includes("minted") || txStatus.includes("transferred") ? <CheckIcon /> : <SpinnerIcon />}
          </span>
          <span className="text-sm text-[#34d399]/90">{txStatus}</span>
        </div>
      )}

      {/* Main Card */}
      <Spotlight className="rounded-2xl">
        <AnimatedCard className="p-0" containerClassName="rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#10b981]/20 to-[#34d399]/20 border border-white/[0.06]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#10b981]">
                  <path d="M11 20A7 7 0 0 1 9.8 6.1 15.5 15.5 0 0 1 21 8a2 2 0 0 1-2 2 2 2 0 0 1-2-2 11.5 11.5 0 0 0-7-4 2 2 0 0 1-2-2 2 2 0 0 1 2-2 2 2 0 0 1 2 2 11.5 11.5 0 0 0 7 4 2 2 0 0 1 2 2 2 2 0 0 1-2 2 7 7 0 0 1-7 7 2 2 0 0 1-2-2 2 2 0 0 1 2-2 2 2 0 0 1-2 2 7 7 0 0 1-2.4-.9 15.5 15.5 0 0 1-4.7-6.5A7 7 0 0 1 11 20z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white/90">Carbon Credits</h3>
                <p className="text-[10px] text-white/25 font-mono mt-0.5">{truncate(CONTRACT_ADDRESS)}</p>
              </div>
            </div>
            <Badge variant="success" className="text-[10px]">Soroban</Badge>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/[0.06] px-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => { setActiveTab(t.key); setError(null); setBalanceResult(null); }}
                className={cn(
                  "relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all",
                  activeTab === t.key ? "text-white/90" : "text-white/35 hover:text-white/55"
                )}
              >
                <span style={activeTab === t.key ? { color: t.color } : undefined}>{t.icon}</span>
                {t.label}
                {activeTab === t.key && (
                  <span
                    className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full transition-all"
                    style={{ background: `linear-gradient(to right, ${t.color}, ${t.color}66)` }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Balance */}
            {activeTab === "balance" && (
              <div className="space-y-5">
                <MethodSignature name="balance" params="(user: Address)" returns="-> i128" color="#10b981" />
                <Input label="Wallet Address" value={balanceAddress} onChange={(e) => setBalanceAddress(e.target.value)} placeholder="G..." />
                <ShimmerButton onClick={handleCheckBalance} disabled={isChecking} shimmerColor="#10b981" className="w-full">
                  {isChecking ? <><SpinnerIcon /> Checking...</> : <><SearchIcon /> Check Balance</>}
                </ShimmerButton>

                {balanceResult !== null && (
                  <div className="rounded-xl border border-[#10b981]/20 bg-[#10b981]/[0.05] p-4 animate-fade-in-up">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-white/25">Your Balance</p>
                        <p className="text-2xl font-bold text-[#10b981] mt-1">{balanceResult.toString()}</p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#10b981]/10">
                        <LeafIcon />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mint */}
            {activeTab === "mint" && (
              <div className="space-y-5">
                <MethodSignature name="mint" params="(to: Address, amount: i128)" color="#34d399" />
                <Input label="Recipient Address" value={mintTo} onChange={(e) => setMintTo(e.target.value)} placeholder="G..." />
                <Input label="Amount" type="number" value={mintAmount} onChange={(e) => setMintAmount(e.target.value)} placeholder="e.g. 100" />
                {walletAddress ? (
                  <ShimmerButton onClick={handleMint} disabled={isMinting} shimmerColor="#34d399" className="w-full">
                    {isMinting ? <><SpinnerIcon /> Minting...</> : <><CoinIcon /> Mint Credits</>}
                  </ShimmerButton>
                ) : (
                  <button
                    onClick={onConnect}
                    disabled={isConnecting}
                    className="w-full rounded-xl border border-dashed border-[#34d399]/20 bg-[#34d399]/[0.03] py-4 text-sm text-[#34d399]/60 hover:border-[#34d399]/30 hover:text-[#34d399]/80 active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    Connect wallet to mint credits
                  </button>
                )}
              </div>
            )}

            {/* Transfer */}
            {activeTab === "transfer" && (
              <div className="space-y-5">
                <MethodSignature name="transfer" params="(from: Address, to: Address, amount: i128)" color="#fbbf24" />
                <Input label="Recipient Address" value={transferTo} onChange={(e) => setTransferTo(e.target.value)} placeholder="G..." />
                <Input label="Amount" type="number" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} placeholder="e.g. 50" />
                {walletAddress ? (
                  <ShimmerButton onClick={handleTransfer} disabled={isTransferring} shimmerColor="#fbbf24" className="w-full">
                    {isTransferring ? <><SpinnerIcon /> Transferring...</> : <><RefreshIcon /> Transfer Credits</>}
                  </ShimmerButton>
                ) : (
                  <button
                    onClick={onConnect}
                    disabled={isConnecting}
                    className="w-full rounded-xl border border-dashed border-[#fbbf24]/20 bg-[#fbbf24]/[0.03] py-4 text-sm text-[#fbbf24]/60 hover:border-[#fbbf24]/30 hover:text-[#fbbf24]/80 active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    Connect wallet to transfer credits
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/[0.04] px-6 py-3 flex items-center justify-between">
            <p className="text-[10px] text-white/15">Carbon Credits &middot; Soroban</p>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-[#10b981]" />
                <span className="font-mono text-[9px] text-white/15">Eco</span>
              </span>
              <span className="text-white/10 text-[8px]">&rarr;</span>
              <span className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-[#34d399]" />
                <span className="font-mono text-[9px] text-white/15">Track</span>
              </span>
            </div>
          </div>
        </AnimatedCard>
      </Spotlight>
    </div>
  );
}