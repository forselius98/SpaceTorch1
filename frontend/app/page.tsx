"use client";

import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useSwitchChain,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
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

type Game = {
  choice: "SUN" | "MOON";
  result: "SUN" | "MOON";
  won: boolean;
  bet: number;
  pointsEarned: number;
};

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

  // Coin Flip state
  const [betAmount, setBetAmount] = useState("10");
  const [selectedSide, setSelectedSide] = useState<"SUN" | "MOON">("SUN");
  const [credits, setCredits] = useState(1000);
  const [netWinnings, setNetWinnings] = useState(0);
  const [winStreak, setWinStreak] = useState(0);
  const [gameResult, setGameResult] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const [gameHistory, setGameHistory] = useState<Game[]>([]);

  const isSepolia = chainId === sepolia.id;

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // FUEL balance
  const balance = useReadContract({
    address: TOKEN_ADDRESS,
    abi: tokenAbi,
    functionName: "balanceOf",
    args: [address ?? TOKEN_ADDRESS],
    query: {
      enabled: Boolean(address) && isSepolia,
    },
  });

  // Faucet information
  const lastClaim = useReadContract({
    address: TOKEN_ADDRESS,
    abi: tokenAbi,
    functionName: "lastClaimAt",
    args: [address ?? TOKEN_ADDRESS],
    query: {
      enabled: Boolean(address) && isSepolia,
    },
  });

  const faucetBalance = useReadContract({
    address: TOKEN_ADDRESS,
    abi: tokenAbi,
    functionName: "balanceOf",
    args: [TOKEN_ADDRESS],
    query: {
      enabled: isSepolia,
    },
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

  // Faucet transaction
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
  } = useWaitForTransactionReceipt({
    hash: transactionHash,
  });

  // Rocket Launch transaction
  const {
    writeContract: launchWriteContract,
    data: launchTransactionHash,
    isPending: isLaunchWriting,
    error: launchWriteError,
  } = useWriteContract();

  const {
    isLoading: isLaunchConfirming,
    isSuccess: isLaunchConfirmed,
    error: launchTransactionError,
  } = useWaitForTransactionReceipt({
    hash: launchTransactionHash,
  });

  // Refresh balance and faucet after successful claim
  useEffect(() => {
    if (isConfirmed) {
      void balance.refetch();
      void faucetBalance.refetch();
      void lastClaim.refetch();
    }
  }, [isConfirmed, balance, faucetBalance, lastClaim]);

  // Refresh balance after successful rocket launch
  useEffect(() => {
    if (isLaunchConfirmed) {
      void balance.refetch();
    }
  }, [isLaunchConfirmed, balance]);

  // Faucet calculations
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

  // Coin Flip calculations
  const numericBet = Number(betAmount);

  const hasValidBet =
    Number.isFinite(numericBet) && numericBet > 0 && numericBet <= credits;

  const canPlay = isConnected && isSepolia && hasValidBet && !isAnimating;

  // Rocket Launch requirements
  const launchCost = BigInt(100) * BigInt(10) ** BigInt(18);

  const hasEnoughFuel =
    balance.data !== undefined && balance.data >= launchCost;

  const canLaunch =
    isConnected &&
    isSepolia &&
    netWinnings >= 100 &&
    hasEnoughFuel &&
    !isLaunchWriting &&
    !isLaunchConfirming &&
    !isLaunchConfirmed;

  // Claim FUEL from the smart contract
  function handleClaim() {
    if (!canClaim) return;

    writeContract({
      address: TOKEN_ADDRESS,
      abi: tokenAbi,
      functionName: "claimFaucet",
    });
  }

  // Frontend-only Coin Flip
  function handleFlip() {
  if (!canPlay) return;

  setIsAnimating(true);
  setGameResult("");

  const bet = numericBet;

  setTimeout(() => {
    const result: "SUN" | "MOON" =
  Math.random() < 0.5 ? "SUN" : "MOON";
    const won = result === selectedSide;

    let pointsWon = 0;

    if (won) {
      const newStreak = winStreak + 1;
      setWinStreak(newStreak);

      // Double points after 3 consecutive wins
      pointsWon = newStreak >= 3 ? bet * 2 : bet;

      setNetWinnings((previous) => previous + pointsWon);
      setCredits((previous) => previous + pointsWon);

      setGameResult(
        newStreak >= 3
          ? `🔥 ${newStreak} wins in a row! DOUBLE POINTS! +${pointsWon} SC`
          : `🎉 YOU WON! +${pointsWon} SC`
      );
    } else {
      setWinStreak(0);
      setGameResult("🌙 You lost! Try again!");
    }

    setGameHistory((previous) =>
      [
        {
          choice: selectedSide,
          result,
          won,
          bet,
          pointsEarned: pointsWon,
        },
        ...previous,
      ].slice(0, 5)
    );

    setIsAnimating(false);
  }, 1200);
}

  // Burn 100 FUEL to launch the rocket
  function handleLaunch() {
    if (!canLaunch) return;

    launchWriteContract({
      address: TOKEN_ADDRESS,
      abi: tokenAbi,
      functionName: "burn",
      args: [launchCost],
    });
  }

  const injectedConnector =
    connectors.find((connector) => connector.id === "injected") ??
    connectors[0];

  return (
    <main className="min-h-screen bg-black/15 px-5 py-12 text-white">
      {/* HEADER */}
      <header className="mb-12 flex flex-col items-center text-center">
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.4em] text-cyan-400">
          Welcome to the galaxy
        </p>

        <h1 className="text-5xl font-black tracking-tight sm:text-7xl">
          SPACE <span className="text-cyan-400">FUEL</span>
        </h1>

        <p className="mt-4 max-w-lg text-zinc-300">
          Claim your FUEL tokens and prepare for your next space adventure.
        </p>
      </header>

      {/* SPACE GIRL */}
      <div className="mb-8 flex justify-center">
        <Image
          src="/SpaceGirl.png"
          alt="SpaceGirl"
          width={500}
          height={500}
          priority
          className="h-auto w-44 drop-shadow-[0_0_30px_rgba(34,211,238,0.35)] sm:w-56 md:w-64"
        />
      </div>

      {/* MAIN CARD */}
      <section className="mx-auto max-w-2xl rounded-3xl border border-cyan-400/25 bg-[#11172d]/55 p-7 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl sm:p-10">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-xl font-bold">Your Wallet</h2>

          <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
            Sepolia Testnet
          </span>
        </div>

        {/* WALLET CONNECTION */}
        {!mounted || !isConnected ? (
          <button
            onClick={() => {
              if (injectedConnector) {
                connect({ connector: injectedConnector });
              }
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

            {/* WRONG NETWORK */}
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
                {/* WALLET BALANCE */}
                <div className="mb-8 rounded-2xl border border-cyan-400/25 bg-linear-to-br from-cyan-500/15 to-blue-500/15 p-6 text-center backdrop-blur-md">
                  <p className="text-sm font-medium text-zinc-300">
                    Your FUEL balance
                  </p>

                  <p className="my-3 text-5xl font-black text-cyan-300">
                    {balance.isLoading ? "..." : displayedBalance}
                  </p>

                  <p className="text-sm font-semibold tracking-widest text-zinc-400">
                    FUEL
                  </p>
                </div>

                {/* FAUCET */}
                <div className="rounded-2xl border border-cyan-400/15 bg-[#080b1b]/45 p-6 backdrop-blur-md">
                  <h3 className="text-xl font-bold">Fuel Faucet</h3>

                  <p className="mt-2 text-sm text-zinc-300">
                    Claim 100 FUEL tokens once every 24 hours.
                  </p>

                  <div className="my-6 text-center">
                    <p className="text-4xl font-black text-cyan-300">
                      100 FUEL
                    </p>

                    <p className="mt-2 text-xs text-zinc-400">Per claim</p>
                  </div>

                  {faucetIsEmpty ? (
                    <p className="rounded-lg bg-red-500/10 p-3 text-center text-sm text-red-300">
                      The faucet is currently empty.
                    </p>
                  ) : remaining > 0 ? (
                    <div className="rounded-lg bg-white/5 p-4 text-center">
                      <p className="text-sm text-zinc-300">
                        Next claim available in
                      </p>

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

                {/* COIN FLIP */}
                <div className="mt-8 rounded-2xl border border-purple-400/25 bg-[#080b1b]/45 p-6 backdrop-blur-md">
                  <div className="text-center">
                    <p className="text-sm font-bold uppercase tracking-[0.3em] text-purple-300">
                      Space Casino
                    </p>

                    <h3 className="mt-2 text-3xl font-black">
                      COIN <span className="text-purple-400">FLIP</span>
                    </h3>

                    <p className="mt-2 text-sm text-zinc-300">
                      Choose your side and test your luck!
                    </p>
                  </div>

                  {/* VIRTUAL CREDITS */}
                  <div className="my-6 rounded-2xl border border-purple-400/20 bg-purple-400/10 p-5 text-center">
                    <p className="text-sm text-zinc-300">Your Space Credits</p>

                    <p className="my-2 text-4xl font-black text-purple-300">
                      {credits.toLocaleString("en-US", {
                        maximumFractionDigits: 2,
                      })}
                    </p>

                    <p className="text-xs tracking-widest text-zinc-400">SC</p>

                    <p className="mt-3 text-sm text-zinc-300">
                      Mission points:{" "}
                      <span
                        className={
                          "font-bold text-green-300"
                        }
                      >
                        {netWinnings} / 100 SC
                      </span>
                    </p>
                  </div>

                  {/* SIDE SELECTION */}
                  <div className="my-6 grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setSelectedSide("SUN")}
                      disabled={isAnimating}
                      className={`rounded-xl border p-5 text-center transition ${
                        selectedSide === "SUN"
                          ? "border-yellow-400 bg-yellow-400/20 text-yellow-300"
                          : "border-white/10 bg-white/5 text-zinc-300"
                      }`}
                    >
                      <span className="block text-4xl">☀️</span>
                      <span className="mt-2 block font-bold">SUN</span>
                    </button>

                    <button
                      onClick={() => setSelectedSide("MOON")}
                      disabled={isAnimating}
                      className={`rounded-xl border p-5 text-center transition ${
                        selectedSide === "MOON"
                          ? "border-purple-400 bg-purple-400/20 text-purple-300"
                          : "border-white/10 bg-white/5 text-zinc-300"
                      }`}
                    >
                      <span className="block text-4xl">🌙</span>
                      <span className="mt-2 block font-bold">MOON</span>
                    </button>
                  </div>

                  {/* BET AMOUNT */}
                  <label className="mb-2 block text-sm font-semibold text-zinc-300">
                    Your bet (SC)
                  </label>

                  <input
                    type="number"
                    min="1"
                    max={credits}
                    step="1"
                    value={betAmount}
                    disabled={isAnimating}
                    onChange={(event) => setBetAmount(event.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-[#11172d]/45 p-4 text-white outline-none backdrop-blur-md focus:border-purple-400"
                    placeholder="Enter credits"
                  />

                  <div className="my-4 flex justify-between text-sm text-zinc-300">
                    <span>Your choice</span>
                    <span className="font-bold text-white">{selectedSide}</span>
                  </div>

                  {numericBet > credits && (
                    <p className="mb-4 rounded-lg bg-red-500/10 p-3 text-center text-sm text-red-300">
                      Not enough Space Credits!
                    </p>
                  )}

                  {(!Number.isFinite(numericBet) || numericBet <= 0) && (
                    <p className="mb-4 rounded-lg bg-red-500/10 p-3 text-center text-sm text-red-300">
                      Enter a valid bet amount.
                    </p>
                  )}

                  {/* FLIP BUTTON */}
                  <button
                    onClick={handleFlip}
                    disabled={!canPlay}
                    className="w-full rounded-xl bg-cyan-500 px-6 py-4 font-black text-[#080b1b] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isAnimating ? "FLIPPING COIN..." : "FLIP COIN"}
                  </button>

                  {/* COIN ANIMATION */}
                  {isAnimating && (
                    <div className="my-8 flex justify-center">
                      <div className="animate-bounce text-7xl">🪙</div>
                    </div>
                  )}

                  {/* GAME RESULT */}
                  {gameResult && !isAnimating && (
                    <div className="mt-5 rounded-xl border border-purple-400/30 bg-purple-400/10 p-5 text-center">
                      <p className="text-xl font-black text-purple-300">
                        {gameResult}
                      </p>
                    </div>
                  )}

                  {/* GAME HISTORY */}
                  <div className="mt-8">
                    <h4 className="mb-4 font-bold text-white">Recent Games</h4>

                    {gameHistory.length === 0 ? (
                      <p className="text-sm text-zinc-400">
                        No games played yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {gameHistory.map((game, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between rounded-lg bg-white/5 p-3 text-sm"
                          >
                            <span className="text-zinc-300">
                              {game.choice} → {game.result}
                            </span>

                            <span
                              className={
                                game.won
                                  ? "font-bold text-green-400"
                                  : "font-bold text-red-400"
                              }
                            >
                              {game.won ? `+${game.pointsEarned}` : "0"} SC
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <p className="mt-6 text-center text-xs text-zinc-400">
                    Space Credits are virtual game points and have no real token
                    value.
                  </p>
                </div>

                {/* ROCKET LAUNCH */}
                <div className="mt-8 rounded-2xl border border-orange-400/25 bg-[#080b1b]/45 p-6 text-center backdrop-blur-md">
                  <p className="text-sm font-bold uppercase tracking-[0.3em] text-orange-300">
                    Mission Control
                  </p>

                  <h3 className="mt-2 text-3xl font-black">
                    ROCKET <span className="text-orange-400">LAUNCH</span>
                  </h3>

                  <div className="my-6 flex justify-center">
                    <div
                      className={
                        isLaunchConfirmed
                          ? "animate-bounce text-7xl"
                          : "text-7xl"
                      }
                    >
                      🚀
                    </div>
                  </div>

                  <p className="text-sm text-zinc-300">
                    Earn 100 SC to unlock your rocket launch. Losses never remove your points.
                  </p>

                  {/* PROGRESS */}
                  <div className="my-6">
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="text-zinc-300">Mission progress</span>

                      <span className="font-bold text-orange-300">
                        {netWinnings} / 100 SC
                      </span>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-linear-to-r from-orange-500 to-yellow-300 transition-all duration-500"
                        style={{
                          width: `${Math.min(Math.max(netWinnings, 0), 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* FUEL COST */}
                  <div className="mb-5 rounded-xl border border-orange-400/20 bg-orange-400/10 p-4">
                    <p className="text-sm text-zinc-300">Launch cost</p>

                    <p className="mt-1 text-3xl font-black text-orange-300">
                      100 FUEL
                    </p>

                    <p className="mt-1 text-xs text-zinc-400">
                      Real FUEL tokens burned from your wallet
                    </p>
                  </div>

                  {/* LOCKED */}
                  {netWinnings < 100 && (
                    <p className="mb-4 text-sm text-zinc-300">
                      🔒 Keep playing Coin Flip to unlock your rocket!
                    </p>
                  )}

                  {/* NOT ENOUGH FUEL */}
                  {netWinnings >= 100 &&
                    !hasEnoughFuel &&
                    !isLaunchConfirmed && (
                      <p className="mb-4 text-sm text-red-300">
                        You need at least 100 FUEL in your wallet. Claim tokens
                        from the Faucet first!
                      </p>
                    )}

                  {/* LAUNCH BUTTON */}
                  {!isLaunchConfirmed && (
                    <button
                      onClick={handleLaunch}
                      disabled={!canLaunch}
                      className="w-full rounded-xl bg-linear-to-r from-orange-500 to-yellow-400 px-6 py-4 font-black text-black transition hover:scale-[1.02] hover:from-orange-400 hover:to-yellow-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isLaunchWriting
                        ? "CONFIRM IN WALLET..."
                        : isLaunchConfirming
                        ? "PREPARING LAUNCH..."
                        : netWinnings < 100
                        ? "ROCKET LOCKED"
                        : !hasEnoughFuel
                        ? "NOT ENOUGH FUEL"
                        : "🚀 LAUNCH ROCKET"}
                    </button>
                  )}

                  {/* TRANSACTION ERRORS */}
                  {(launchWriteError || launchTransactionError) && (
                    <p className="mt-4 wrap-break-word text-sm text-red-400">
                      {launchWriteError?.message ||
                        launchTransactionError?.message}
                    </p>
                  )}

                  {/* SUCCESS */}
                  {isLaunchConfirmed && (
                    <div className="mt-6 rounded-xl border border-green-400/30 bg-green-400/10 p-6">
                      <div className="animate-bounce text-7xl">🚀</div>

                      <h4 className="mt-4 text-2xl font-black text-green-300">
                        ROCKET LAUNCHED!
                      </h4>

                      <p className="mt-2 text-sm text-zinc-300">
                        Your rocket has successfully left the galaxy!
                      </p>
                    </div>
                  )}

                  {/* ETHERSCAN */}
                  {launchTransactionHash && (
                    <a
                      href={`https://sepolia.etherscan.io/tx/${launchTransactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 block text-sm text-cyan-400 underline"
                    >
                      View launch transaction on Etherscan
                    </a>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </section>

      <footer className="mt-8 text-center text-xs text-zinc-400">
        Space Fuel · Sepolia Testnet · ERC-20
      </footer>
    </main>
  );
}