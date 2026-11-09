"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useAccount, useConnect, useDisconnect, useReadContract, useSwitchChain, useWriteContract, useWaitForTransactionReceipt, } from "wagmi";
import { sepolia } from "wagmi/chains";
import { formatUnits } from "viem";

const TOKEN_ADDRESS = "0x2e59788EE9A102dc1f7ADaAd6E0e2dFeCB8A60DB" as const;

const tokenAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "lastClaimAt",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "FAUCET_AMOUNT",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "FAUCET_COOLDOWN",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "claimFaucet",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "burn",
    stateMutability: "nonpayable",
    inputs: [{ name: "value", type: "uint256" }],
    outputs: [],
  },
] as const;

function formatCountdown(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export default function Home() {
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const [now, setNow] = useState(0);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const isSepolia = chainId === sepolia.id;

  useEffect(() => {
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  const balance = useReadContract({
    address: TOKEN_ADDRESS,
    abi: tokenAbi,
    functionName: "balanceOf",
    args: [address ?? TOKEN_ADDRESS],
    query: { enabled: Boolean(address) && isSepolia },
  });

  const lastClaim = useReadContract({
    address: TOKEN_ADDRESS,
    abi: tokenAbi,
    functionName: "lastClaimAt",
    args: [address ?? TOKEN_ADDRESS],
    query: { enabled: Boolean(address) && isSepolia },
  });

  const faucetBalance = useReadContract({
    address: TOKEN_ADDRESS,
    abi: tokenAbi,
    functionName: "balanceOf",
    args: [TOKEN_ADDRESS],
    query: { enabled: isSepolia },
  });

  const faucetAmount = useReadContract({
    address: TOKEN_ADDRESS,
    abi: tokenAbi,
    functionName: "FAUCET_AMOUNT",
  });

  const cooldown = useReadContract({
    address: TOKEN_ADDRESS,
    abi: tokenAbi,
    functionName: "FAUCET_COOLDOWN",
  });

  const {
    writeContract,
    data: transactionHash,
    isPending: isWriting,
    error: writeError,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: transactionError,
  } = useWaitForTransactionReceipt({ hash: transactionHash });

  useEffect(() => {
    if (isConfirmed) {
      void balance.refetch();
      void faucetBalance.refetch();
      void lastClaim.refetch();
    }
  }, [isConfirmed, balance, faucetBalance, lastClaim]);

  const claimAmount =
    faucetAmount.data ?? BigInt(100) * BigInt(10) ** BigInt(18);
  const cooldownSeconds = cooldown.data ?? BigInt(86400);
  const lastClaimAt = Number(lastClaim.data ?? BigInt(0));
  const nextClaimAt = lastClaimAt + Number(cooldownSeconds);
  const remaining = Math.max(0, nextClaimAt - now);

  const faucetIsEmpty =
    faucetBalance.data !== undefined && faucetBalance.data < claimAmount;

  const canClaim =
    isConnected &&
    isSepolia &&
    now > 0 &&
    lastClaim.data !== undefined &&
    faucetBalance.data !== undefined &&
    remaining === 0 &&
    !faucetIsEmpty &&
    !isWriting &&
    !isConfirming;

  const displayedBalance =
    balance.data !== undefined
      ? Number(formatUnits(balance.data, 18)).toLocaleString("en-US", {
          maximumFractionDigits: 2,
        })
      : "—";

  function handleClaim() {
    if (!canClaim) return;
    writeContract({
      address: TOKEN_ADDRESS,
      abi: tokenAbi,
      functionName: "claimFaucet",
    });
  }

  const injectedConnector =
    connectors.find((connector) => connector.id === "injected") ??
    connectors[0];

  return (
    <main className="min-h-screen bg-black/15 px-5 py-12 text-white">
      <header className="mx-auto mb-10 flex max-w-5xl flex-col items-center text-center">
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.4em] text-cyan-400">
          Welcome to the galaxy
        </p>
        <h1 className="text-5xl font-black tracking-tight sm:text-7xl">
          SPACE <span className="text-cyan-400">FUEL</span>
        </h1>
        <p className="mt-4 max-w-lg text-zinc-300">
          Claim your FUEL tokens and prepare for your next space adventure.
        </p>
        <Image
          src="/SpaceGirl.png"
          alt="SpaceGirl"
          width={500}
          height={500}
          priority
          className="mt-6 h-auto w-44 drop-shadow-[0_0_30px_rgba(34,211,238,0.35)] sm:w-56 md:w-64"
        />
      </header>

      <section className="mx-auto max-w-2xl rounded-3xl border border-cyan-400/25 bg-[#11172d]/55 p-7 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl sm:p-10">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-xl font-bold">Your Wallet</h2>
          <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
            Sepolia Testnet
          </span>
        </div>

        {!mounted || !isConnected ? (
          <button
            onClick={() => {
              if (injectedConnector) connect({ connector: injectedConnector });
            }}
            disabled={isConnecting || !injectedConnector}
            className="w-full rounded-xl bg-cyan-500 px-6 py-4 font-bold text-[#080b1b] transition hover:bg-cyan-300 disabled:opacity-50"
          >
            {isConnecting ? "Connecting..." : "Connect MetaMask"}
          </button>
        ) : (
          <>
            <div className="mb-6 rounded-2xl border border-white/10 bg-[#080b1b]/45 p-5 backdrop-blur-md">
              <p className="mb-2 text-sm text-zinc-400">Connected wallet</p>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-mono text-sm text-cyan-300">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
                <button
                  onClick={() => disconnect()}
                  className="text-sm text-zinc-400 underline hover:text-white"
                >
                  Disconnect
                </button>
              </div>
            </div>

            {!isSepolia && (
              <div className="mb-6 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
                <p className="mb-3 text-sm text-amber-200">
                  Please switch your wallet to Sepolia to use Space Fuel.
                </p>
                <button
                  onClick={() => switchChain({ chainId: sepolia.id })}
                  disabled={isSwitching}
                  className="rounded-lg bg-amber-400 px-4 py-2 font-bold text-black disabled:opacity-50"
                >
                  {isSwitching ? "Switching..." : "Switch to Sepolia"}
                </button>
              </div>
            )}

            {isSepolia && (
              <>
                <div className="mb-8 rounded-2xl border border-cyan-400/25 bg-linear-to-br from-cyan-500/15 to-blue-500/15 p-6 text-center backdrop-blur-md">
                  <p className="text-sm font-medium text-zinc-300">Your FUEL balance</p>
                  <p className="my-3 text-5xl font-black text-cyan-300">
                    {balance.isLoading ? "..." : displayedBalance}
                  </p>
                  <p className="text-sm font-semibold tracking-widest text-zinc-400">FUEL</p>
                </div>

                <div className="rounded-2xl border border-cyan-400/15 bg-[#080b1b]/45 p-6 backdrop-blur-md">
                  <h3 className="text-xl font-bold">Fuel Faucet</h3>
                  <p className="mt-2 text-sm text-zinc-300">
                    Claim 100 FUEL tokens once every 24 hours.
                  </p>
                  <div className="my-6 text-center">
                    <p className="text-4xl font-black text-cyan-300">100 FUEL</p>
                    <p className="mt-2 text-xs text-zinc-400">Per claim</p>
                  </div>

                  {faucetIsEmpty ? (
                    <p className="rounded-lg bg-red-500/10 p-3 text-center text-sm text-red-300">
                      The faucet is currently empty.
                    </p>
                  ) : remaining > 0 ? (
                    <div className="rounded-lg bg-white/5 p-4 text-center">
                      <p className="text-sm text-zinc-300">Next claim available in</p>
                      <p className="mt-2 font-mono text-3xl font-bold text-cyan-300">
                        {formatCountdown(remaining)}
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={handleClaim}
                      disabled={!canClaim}
                      className="w-full rounded-xl bg-cyan-500 px-6 py-4 font-bold text-[#080b1b] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isWriting
                        ? "Confirm in wallet..."
                        : isConfirming
                        ? "Claiming FUEL..."
                        : "Claim 100 FUEL"}
                    </button>
                  )}

                  {isConfirmed && (
                    <p className="mt-4 text-center text-sm text-green-400">
                      FUEL claimed successfully!
                    </p>
                  )}
                  {(writeError || transactionError) && (
                    <p className="mt-4 wrap-break-word text-sm text-red-400">
                      {writeError?.message || transactionError?.message}
                    </p>
                  )}
                  {transactionHash && (
                    <a
                      href={`https://sepolia.etherscan.io/tx/${transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 block text-center text-sm text-cyan-400 underline"
                    >
                      View faucet transaction on Etherscan
                    </a>
                  )}
                </div>
              </>
            )}
          </>
        )}

        <div className="mt-8 rounded-2xl border border-purple-400/20 bg-purple-400/5 p-6 text-center">
          <h3 className="text-2xl font-black">
            READY FOR YOUR <span className="text-purple-300">MISSION?</span>
          </h3>
          <p className="mt-2 text-sm text-zinc-300">
            Head to the Space Game, earn mission points and launch your rocket.
          </p>
          <Link
            href="/game"
            className="mt-5 block w-full rounded-xl bg-linear-to-r from-purple-500 to-cyan-400 px-6 py-4 font-black text-[#080b1b] transition hover:scale-[1.02]"
          >
            PLAY NOW →
          </Link>
        </div>
      </section>

      <footer className="mt-8 text-center text-xs text-zinc-400">
        Space Fuel · Sepolia Testnet · ERC-20
      </footer>
    </main>
  );
}
