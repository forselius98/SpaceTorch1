"use client";

import Image from "next/image";
import Link from "next/link";
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

type Game = {
  choice: "SUN" | "MOON";
  result: "SUN" | "MOON";
  won: boolean;
  bet: number;
  pointsEarned: number;
};

export default function GamePage() {
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const [betAmount, setBetAmount] = useState("10");
  const [selectedSide, setSelectedSide] = useState<"SUN" | "MOON">("SUN");
  const [credits, setCredits] = useState(1000);
  const [netWinnings, setNetWinnings] = useState(0);
  const [winStreak, setWinStreak] = useState(0);
  const [gameResult, setGameResult] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const [gameHistory, setGameHistory] = useState<Game[]>([]);
  const [launchStage, setLaunchStage] = useState<
    "idle" | "igniting" | "launched"
  >("idle");
  const [countdown, setCountdown] = useState<number | null>(null);

  const isSepolia = chainId === sepolia.id;

  const balance = useReadContract({
    address: TOKEN_ADDRESS,
    abi: tokenAbi,
    functionName: "balanceOf",
    args: [address ?? TOKEN_ADDRESS],
    query: { enabled: Boolean(address) && isSepolia },
  });

  const refetchBalance = balance.refetch;

  const {
    writeContract: launchWriteContract,
    data: launchTransactionHash,
    isPending: isLaunchWriting,
    error: launchWriteError,
    reset: resetLaunchTransaction,
  } = useWriteContract();

  const {
    isLoading: isLaunchConfirming,
    isSuccess: isLaunchConfirmed,
    error: launchTransactionError,
  } = useWaitForTransactionReceipt({
    hash: launchTransactionHash,
  });

  // Starta raketanimationen först när burn-transaktionen är bekräftad.
  useEffect(() => {
    if (!isLaunchConfirmed) return;

    void refetchBalance();

    let countdownInterval: number | undefined;

    const ignitionTimer = window.setTimeout(() => {
      setLaunchStage("igniting");
      setCountdown(3);

      countdownInterval = window.setInterval(() => {
        setCountdown((current) => {
          if (current === null || current <= 1) return 0;
          return current - 1;
        });
      }, 1000);
    }, 0);

    const launchTimer = window.setTimeout(() => {
      setCountdown(null);
      setLaunchStage("launched");
    }, 4200);

    return () => {
      window.clearTimeout(ignitionTimer);
      window.clearTimeout(launchTimer);

      if (countdownInterval !== undefined) {
        window.clearInterval(countdownInterval);
      }
    };
  }, [isLaunchConfirmed, refetchBalance]);

  const numericBet = Number(betAmount);

  const hasValidBet =
    Number.isFinite(numericBet) && numericBet > 0 && numericBet <= credits;

  const canPlay = isConnected && isSepolia && hasValidBet && !isAnimating;

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

  // Återställ hela spelomgången efter uppskjutningen.
  function handleSideSelection(side: "SUN" | "MOON") {
    if (launchStage === "launched") {
      // Virtuella spelvärden börjar om från start.
      setCredits(1000);
      setNetWinnings(0);
      setWinStreak(0);
      setGameResult("");
      setGameHistory([]);
      setBetAmount("10");

      // Raketen och Space Girl återgår till startläget.
      setLaunchStage("idle");
      setCountdown(null);

      // Nollställ den gamla transaktionen så en ny launch kan göras.
      resetLaunchTransaction();
    }

    setSelectedSide(side);
  }

  function handleFlip() {
    if (!canPlay) return;

    setIsAnimating(true);
    setGameResult("");

    const bet = numericBet;

    window.setTimeout(() => {
      const result: "SUN" | "MOON" = Math.random() < 0.5 ? "SUN" : "MOON";

      const won = result === selectedSide;
      let pointsWon = 0;

      if (won) {
        const newStreak = winStreak + 1;

        setWinStreak(newStreak);

        pointsWon = newStreak >= 3 ? bet * 2 : bet;

        setNetWinnings((previous) => previous + pointsWon);
        setCredits((previous) => previous + pointsWon);

        setGameResult(
          newStreak >= 3
            ? `🔥 ${newStreak} wins in a row! DOUBLE POINTS! +${pointsWon} SC`
            : `🎉 YOU WON! +${pointsWon} SC`,
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
        ].slice(0, 5),
      );

      setIsAnimating(false);
    }, 1200);
  }

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
    <main className="min-h-screen bg-black/15 px-3 py-4 text-white sm:px-5 sm:py-5">
      <header className="mx-auto mb-4 flex max-w-6xl items-center justify-between gap-4">
        <Link
          href="/"
          className="rounded-xl border border-cyan-400/30 bg-[#080b1b]/60 px-4 py-2 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400/10"
        >
          ← BACK TO HOME
        </Link>

        <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
          SEPOLIA TESTNET
        </span>
      </header>

      <div className="mx-auto mb-5 max-w-3xl text-center">
        <p className="text-sm font-bold uppercase tracking-[0.4em] text-purple-300">
          Mission Control
        </p>

        <h1 className="mt-1 text-4xl font-black sm:text-5xl">
          SPACE <span className="text-cyan-400">GAME</span>
        </h1>

        <p className="mt-2 text-sm text-zinc-300">
          Win Space Credits, build your streak and fuel your rocket launch.
        </p>
      </div>

      <section className="mx-auto max-w-6xl rounded-3xl border border-cyan-400/25 bg-[#11172d]/55 p-3 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl sm:p-5">
        {!mounted || !isConnected ? (
          <div>
            <p className="mb-4 text-center text-zinc-300">
              Connect your wallet to play and launch your rocket.
            </p>

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
          </div>
        ) : (
          <>
            <div className="mb-4 rounded-2xl border border-white/10 bg-[#080b1b]/45 p-3">
              <p className="mb-1 text-xs text-zinc-400">Connected wallet</p>

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

              {isSepolia && (
                <p className="mt-2 text-sm text-zinc-300">
                  FUEL balance:{" "}
                  <span className="font-bold text-cyan-300">
                    {balance.data === undefined
                      ? "..."
                      : Number(formatUnits(balance.data, 18)).toLocaleString(
                          "en-US",
                          {
                            maximumFractionDigits: 2,
                          },
                        )}{" "}
                    FUEL
                  </span>
                </p>
              )}
            </div>

            {!isSepolia && (
              <div className="mb-6 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
                <p className="mb-3 text-sm text-amber-200">
                  Switch your wallet to Sepolia to play and launch.
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
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch">
                  {/* COIN FLIP */}
                  <div className="rounded-2xl border border-purple-400/25 bg-[#080b1b]/45 p-4 backdrop-blur-md">
                    <div className="text-center">
                      <p className="text-sm font-bold uppercase tracking-[0.3em] text-purple-300">
                        Space Casino
                      </p>

                      <h3 className="mt-1 text-2xl font-black">
                        COIN <span className="text-purple-400">FLIP</span>
                      </h3>

                      <p className="mt-2 text-sm text-zinc-300">
                        Choose your side and test your luck!
                      </p>
                    </div>

                    {/* VIRTUAL CREDITS */}
                    <div className="my-3 rounded-2xl border border-purple-400/20 bg-purple-400/10 p-3 text-center">
                      <p className="text-sm text-zinc-300">
                        Your Space Credits
                      </p>

                      <p className="my-1 text-3xl font-black text-purple-300">
                        {credits.toLocaleString("en-US", {
                          maximumFractionDigits: 2,
                        })}
                      </p>

                      <p className="text-xs tracking-widest text-zinc-400">
                        SC
                      </p>

                      <p className="mt-2 text-xs text-zinc-300">
                        Mission points:{" "}
                        <span className="font-bold text-green-300">
                          {netWinnings} / 100 SC
                        </span>
                      </p>
                    </div>

                    {/* SIDE SELECTION */}
                    <div className="my-3 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleSideSelection("SUN")}
                        disabled={isAnimating}
                        className={`rounded-xl border p-3 text-center transition ${
                          selectedSide === "SUN"
                            ? "border-yellow-400 bg-yellow-400/20 text-yellow-300"
                            : "border-white/10 bg-white/5 text-zinc-300"
                        }`}
                      >
                        <span className="block text-3xl">☀️</span>
                        <span className="mt-2 block font-bold">SUN</span>
                      </button>

                      <button
                        onClick={() => handleSideSelection("MOON")}
                        disabled={isAnimating}
                        className={`rounded-xl border p-3 text-center transition ${
                          selectedSide === "MOON"
                            ? "border-purple-400 bg-purple-400/20 text-purple-300"
                            : "border-white/10 bg-white/5 text-zinc-300"
                        }`}
                      >
                        <span className="block text-3xl">🌙</span>
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
                      className="w-full rounded-xl border border-white/15 bg-[#11172d]/45 p-3 text-white outline-none backdrop-blur-md focus:border-purple-400"
                      placeholder="Enter credits"
                    />

                    <div className="my-2 flex justify-between text-xs text-zinc-300">
                      <span>Your choice</span>
                      <span className="font-bold text-white">
                        {selectedSide}
                      </span>
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
                      className="w-full rounded-xl bg-cyan-500 px-5 py-3 font-black text-[#080b1b] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isAnimating ? "FLIPPING COIN..." : "FLIP COIN"}
                    </button>

                    {/* COIN ANIMATION */}
                    {isAnimating && (
                      <div className="my-3 flex justify-center">
                        <div className="animate-bounce text-5xl">🪙</div>
                      </div>
                    )}

                    {/* GAME RESULT */}
                    {gameResult && !isAnimating && (
                      <div className="mt-3 rounded-xl border border-purple-400/30 bg-purple-400/10 p-3 text-center">
                        <p className="text-lg font-black text-purple-300">
                          {gameResult}
                        </p>
                      </div>
                    )}

                    {launchStage === "idle" &&
                      netWinnings === 0 &&
                      gameHistory.length === 0 && (
                        <p className="mt-3 text-center text-xs text-zinc-500">
                          Start playing to build your launch progress!
                        </p>
                      )}
                  </div>

                  {/* ROCKET LAUNCH */}
                  <div className="rounded-2xl border border-orange-400/25 bg-[#080b1b]/45 p-4 text-center backdrop-blur-md">
                    <p className="text-sm font-bold uppercase tracking-[0.3em] text-orange-300">
                      Mission Control
                    </p>

                    <h3 className="mt-1 text-2xl font-black">
                      ROCKET <span className="text-orange-400">LAUNCH</span>
                    </h3>

                    {/* SPACE GIRL AND ROCKET */}
                    <div className="relative my-3 h-52 overflow-hidden rounded-2xl border border-orange-300/15 bg-linear-to-b from-indigo-950/70 via-[#11172d]/80 to-orange-950/30">
                      <div className="absolute inset-0 launch-stars" />

                      {launchStage !== "launched" ? (
                        <>
                          <div
                            className={`absolute bottom-3 left-3 z-10 flex flex-col items-center ${
                              launchStage === "igniting" ? "girl-igniting" : ""
                            }`}
                          >
                            <Image
                              src="/SpaceGirl.png"
                              alt="Space Girl preparing the rocket for launch"
                              width={112}
                              height={144}
                              priority
                              className="h-32 w-auto object-contain drop-shadow-[0_0_18px_rgba(56,189,248,0.45)]"
                            />

                            <span className="rounded-full bg-black/50 px-2 py-1 text-[10px] font-bold tracking-wider text-cyan-200">
                              {launchStage === "igniting"
                                ? "IGNITION!"
                                : "SPACE GIRL"}
                            </span>
                          </div>

                          <div
                            className={`absolute bottom-5 left-1/2 z-10 -translate-x-1/2 text-6xl ${
                              launchStage === "igniting"
                                ? "rocket-shaking"
                                : "rocket-idle"
                            }`}
                          >
                            🚀
                          </div>

                          {launchStage === "igniting" && (
                            <>
                              <div className="absolute bottom-2 left-[56%] z-20 text-4xl launch-flame">
                                🔥
                              </div>

                              <div className="absolute bottom-1 left-[49%] z-0 h-12 w-12 rounded-full bg-orange-500/40 blur-xl flame-glow" />

                              <p className="absolute right-3 top-3 rounded-full border border-orange-300/40 bg-orange-500/20 px-3 py-1 text-xs font-black tracking-widest text-orange-200">
                                {countdown === 0
                                  ? "LIFTOFF!"
                                  : `${countdown ?? 3}…`}
                              </p>
                            </>
                          )}

                          {launchStage === "idle" && (
                            <p className="absolute right-3 top-3 max-w-32 text-right text-xs text-orange-100/80">
                              Space Girl is ready to ignite your engines!
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="absolute bottom-0 left-1/2 z-10 -translate-x-1/2 text-6xl rocket-flight">
                            🚀
                          </div>

                          <div className="absolute bottom-0 left-1/2 h-32 w-2 -translate-x-1/2 rounded-full bg-linear-to-t from-transparent via-orange-400 to-yellow-100 blur-md launch-trail" />

                          <p className="absolute bottom-3 left-0 right-0 text-center text-xs font-black tracking-[0.25em] text-cyan-200">
                            DESTINATION: THE STARS
                          </p>
                        </>
                      )}
                    </div>

                    <p className="text-sm text-zinc-300">
                      Earn 100 SC to unlock your rocket launch. Losses never
                      remove your points.
                    </p>

                    {/* PROGRESS */}
                    <div className="my-3">
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
                            width: `${Math.min(
                              Math.max(netWinnings, 0),
                              100,
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* FUEL COST */}
                    <div className="mb-3 rounded-xl border border-orange-400/20 bg-orange-400/10 p-3">
                      <p className="text-sm text-zinc-300">Launch cost</p>

                      <p className="mt-1 text-2xl font-black text-orange-300">
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
                          You need at least 100 FUEL in your wallet. Claim
                          tokens from the Faucet first!
                        </p>
                      )}

                    {/* LAUNCH BUTTON */}
                    {!isLaunchConfirmed && (
                      <button
                        onClick={handleLaunch}
                        disabled={!canLaunch}
                        className="w-full rounded-xl bg-linear-to-r from-orange-500 to-yellow-400 px-5 py-3 font-black text-black transition hover:scale-[1.02] hover:from-orange-400 hover:to-yellow-300 disabled:cursor-not-allowed disabled:opacity-40"
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
                      <div className="mt-3 rounded-xl border border-green-400/30 bg-green-400/10 p-3">
                        <div className="animate-bounce text-5xl">🚀</div>

                        <h4 className="mt-2 text-xl font-black text-green-300">
                          {launchStage === "igniting"
                            ? "IGNITING ENGINES..."
                            : "ROCKET LAUNCHED!"}
                        </h4>

                        <p className="mt-2 text-sm text-zinc-300">
                          {launchStage === "igniting"
                            ? "Space Girl is lighting the engines. Prepare for takeoff!"
                            : "Your rocket has successfully left the galaxy!"}
                        </p>

                        {launchStage === "launched" && (
                          <p className="mt-3 text-xs font-semibold text-cyan-200">
                            Choose SUN or MOON to start your next mission!
                          </p>
                        )}
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
                </div>

                {/* GAME HISTORY */}
                <div className="mt-4 rounded-2xl border border-white/10 bg-[#080b1b]/45 p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h4 className="text-sm font-bold text-white">
                      Recent Games
                    </h4>

                    <span className="text-xs text-zinc-400">Last 5 rounds</span>
                  </div>

                  {gameHistory.length === 0 ? (
                    <p className="text-xs text-zinc-400">
                      No games played yet.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {gameHistory.map((game, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs"
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

                  <p className="mt-2 text-center text-[11px] text-zinc-500">
                    Space Credits are virtual game points and have no real token
                    value.
                  </p>
                </div>
              </>
            )}
          </>
        )}
      </section>

      <style jsx>{`
        @keyframes star-drift {
          from {
            transform: translateY(0);
            opacity: 0.35;
          }
          to {
            transform: translateY(-18px);
            opacity: 0.8;
          }
        }

        @keyframes girl-ignite {
          0%,
          100% {
            transform: translateY(0) rotate(0);
          }
          25% {
            transform: translateY(-3px) rotate(-3deg);
          }
          50% {
            transform: translateY(0) rotate(3deg);
          }
          75% {
            transform: translateY(-2px) rotate(-2deg);
          }
        }

        @keyframes rocket-shake {
          0%,
          100% {
            transform: translateX(-50%) rotate(0);
          }
          25% {
            transform: translateX(calc(-50% - 2px)) rotate(-3deg);
          }
          75% {
            transform: translateX(calc(-50% + 2px)) rotate(3deg);
          }
        }

        @keyframes flame-flicker {
          0%,
          100% {
            transform: scale(1) rotate(-4deg);
            filter: brightness(1);
          }
          50% {
            transform: scale(1.25) rotate(5deg);
            filter: brightness(1.5);
          }
        }

        @keyframes rocket-launch {
          0% {
            transform: translate(-50%, 0) scale(1);
            opacity: 1;
          }
          12% {
            transform: translate(-50%, 8px) scale(1.05);
          }
          100% {
            transform: translate(-50%, -260px) scale(0.55);
            opacity: 0;
          }
        }

        @keyframes trail-fade {
          0% {
            opacity: 0;
            transform: scaleY(0.3);
          }
          20% {
            opacity: 0.9;
            transform: scaleY(1);
          }
          100% {
            opacity: 0;
            transform: scaleY(1.3);
          }
        }

        .launch-stars {
          background-image: radial-gradient(
              2px 2px at 18% 24%,
              #fff 45%,
              transparent 55%
            ),
            radial-gradient(1px 1px at 72% 18%, #bae6fd 45%, transparent 55%),
            radial-gradient(2px 2px at 84% 62%, #fff 45%, transparent 55%),
            radial-gradient(1px 1px at 43% 48%, #c4b5fd 45%, transparent 55%),
            radial-gradient(1px 1px at 63% 82%, #fff 45%, transparent 55%);
          animation: star-drift 3s ease-in-out infinite alternate;
        }

        .girl-igniting {
          animation: girl-ignite 0.35s ease-in-out infinite;
        }

        .rocket-idle {
          filter: drop-shadow(0 0 12px rgba(251, 146, 60, 0.25));
        }

        .rocket-shaking {
          animation: rocket-shake 0.12s linear infinite;
        }

        .launch-flame {
          transform-origin: center;
          animation: flame-flicker 0.16s ease-in-out infinite;
        }

        .flame-glow {
          animation: flame-flicker 0.2s ease-in-out infinite;
        }

        .rocket-flight {
          animation: rocket-launch 3.2s cubic-bezier(0.2, 0.65, 0.25, 1)
            forwards;
        }

        .launch-trail {
          transform-origin: bottom;
          animation: trail-fade 3.2s ease-out forwards;
        }
      `}</style>

      <footer className="mt-4 text-center text-xs text-zinc-400">
        Space Fuel · Space Game · Sepolia Testnet
      </footer>
    </main>
  );
}
