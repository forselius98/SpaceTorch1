# 🚀 Space Fuel (FUEL)

**Fuel your spaceship. Flip your luck. Launch your mission.**

Space Fuel is a space-themed meme token ecosystem built on Ethereum Sepolia. It combines an ERC-20 token, a token faucet, an interactive Coin Flip game, and a Rocket Launch challenge.

The project was created as part of a Web3 development challenge, using Solidity, Foundry, Next.js, TypeScript, Wagmi, and Viem.

> **Network:** Ethereum Sepolia Testnet  
> **Token:** Space Fuel  
> **Symbol:** FUEL  
> **Maximum Supply:** 1,000,000 FUEL

All tokens are testnet tokens and have no real-world monetary value.

---

## 🌌 About the Project

Space Fuel is built around a simple idea: users need fuel to explore space and launch their rockets.

The website lets users connect their wallets, claim FUEL tokens, play Coin Flip to earn virtual Space Credits, and unlock a Rocket Launch challenge.

The ecosystem includes:

- An ERC-20 token with a fixed maximum supply.
- Owner-only token minting.
- Token burning.
- A faucet with a 24-hour claim cooldown.
- A Coin Flip game with SUN and MOON choices.
- A virtual points system called Space Credits (SC).
- A Rocket Launch feature that requires burning 100 FUEL.

## ✨ Features

### 1. FUEL Token

Space Fuel is an ERC-20 token implemented using OpenZeppelin.

| Property | Value |
|---|---|
| Token name | Space Fuel |
| Symbol | FUEL |
| Network | Ethereum Sepolia |
| Decimals | 18 |
| Maximum supply | 1,000,000 FUEL |
| Initial supply | 900,000 FUEL |
| Standard | ERC-20 |

The token contract includes:

- `mint()` – Allows only the contract owner to mint new tokens, while respecting the maximum supply.
- `burn()` – Allows token holders to burn their own tokens.
- `claimFaucet()` – Allows users to claim a fixed amount of FUEL, subject to a 24-hour cooldown.
- `fundFaucet()` – Allows the owner to fund the faucet.

### 2. Token Faucet

Users can claim free FUEL tokens directly from the website.

Faucet functionality:

- Claim 100 FUEL per wallet.
- One claim every 24 hours.
- A countdown displays when the next claim becomes available.
- Claims are prevented if the faucet does not have enough tokens.
- The user's token balance updates after the transaction is confirmed.

### 3. Coin Flip Game

Players can choose between SUN and MOON in a virtual coin flip game.

The game uses Space Credits (SC), an off-chain points system.

Game mechanics:

- Players start with 1,000 SC.
- Players choose SUN or MOON.
- A correct guess awards points based on the selected bet.
- A losing guess awards no points.
- Consecutive wins build a win streak.
- From the third consecutive win, points are doubled.
- Game history displays previous results.

**Important:** Coin Flip outcomes and Space Credits are handled on the frontend. They do not represent on-chain token transfers or blockchain-based randomness.

### 4. Rocket Launch

Rocket Launch is the on-chain part of the game.

Once a player has earned at least 100 SC, they can unlock the Rocket Launch challenge.

To launch:

1. Earn at least 100 SC through Coin Flip.
2. Connect a wallet holding at least 100 FUEL.
3. Start the Rocket Launch.
4. Approve the transaction in the wallet.
5. The smart contract burns 100 FUEL from the user's wallet.
6. After transaction confirmation, the rocket launch animation begins.

The interface displays the transaction status and updates the user's FUEL balance after confirmation.

The Rocket Launch therefore provides a real smart contract interaction, while Coin Flip and its points system remain frontend-based.

---

## 🛠️ Technology Stack

### Smart Contracts

- Solidity
- OpenZeppelin Contracts
- Foundry
- Ethereum Sepolia Testnet

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- Wagmi
- Viem
- MetaMask / injected wallets

---

## 📁 Project Structure

```text
my-meme-ecosystem/
│
├── src/
│   ├── MemeToken.sol
│   └── SpaceLaunchCoinFlip.sol
│
├── script/
│   └── Deploy.s.sol
│
├── test/
│   └── ...
│
├── lib/
│   ├── forge-std/
│   └── openzeppelin-contracts/
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   ├── providers.tsx
│   │   └── game/
│   │       └── page.tsx
│   │
│   ├── public/
│   │   ├── Space.png
│   │   └── SpaceGirl.png
│   │
│   └── package.json
│
├── foundry.toml
└── README.md
```

---

## 🚀 Getting Started

Follow these steps to run the project locally.

### Prerequisites

Make sure you have installed:

- [Node.js](https://nodejs.org/) (LTS recommended)
- npm
- [Git](https://git-scm.com/)
- [Foundry](https://getfoundry.sh/)
- [MetaMask](https://metamask.io/)

You will also need access to the Ethereum Sepolia testnet and some Sepolia ETH to pay for transaction gas fees.

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd my-meme-ecosystem
```

### 2. Install smart contract dependencies

```bash
forge install
```

If the repository already includes its Git submodules, initialize them with:

```bash
git submodule update --init --recursive
```

### 3. Build the smart contracts

```bash
forge build
```

### 4. Run the smart contract tests

```bash
forge test -vv
```

The tests cover token functionality, faucet behaviour, access control, and game functionality.

### 5. Install frontend dependencies

```bash
cd frontend
npm install
```

### 6. Start the development server

```bash
npm run dev
```

Open the application in your browser:

```text
http://localhost:3000
```

---

## 🦊 Connecting Your Wallet

1. Install MetaMask.
2. Create or import a wallet.
3. Switch the network to **Ethereum Sepolia**.
4. Obtain Sepolia ETH from a Sepolia faucet to pay for gas.
5. Open the Space Fuel website.
6. Click **Connect Wallet**.
7. Confirm the connection in MetaMask.

You can use the following resources:

- [Sepolia Etherscan](https://sepolia.etherscan.io/)
- [Ethereum Sepolia Faucet – Google Cloud](https://cloud.google.com/application/web3/faucet/ethereum/sepolia)
- [MetaMask](https://metamask.io/)

Never share your wallet's private key or recovery phrase.

---

## 📜 Smart Contract Deployment

The token is deployed on Ethereum Sepolia.

### FUEL Token Contract

```text
0x2e59788EE9A102dc1f7ADaAd6E0e2dFeCB8A60DB
```

View the token contract:

[Space Fuel on Sepolia Etherscan](https://sepolia.etherscan.io/address/0x2e59788EE9A102dc1f7ADaAd6E0e2dFeCB8A60DB)

### Other Contract Addresses

| Contract | Address |
|---|---|
| Space Fuel Token | `0x2e59788EE9A102dc1f7ADaAd6E0e2dFeCB8A60DB` |


**Note:** Only add a game contract address if the contract has actually been deployed and is used by the application.

### Deploying Your Own Contracts

To deploy your own version, configure a Sepolia RPC endpoint and a deployment wallet.

For example, environment variables can be configured in your local shell:

```bash
export SEPOLIA_RPC_URL="YOUR_SEPOLIA_RPC_URL"
export PRIVATE_KEY="YOUR_PRIVATE_KEY"
```

Never commit private keys or secret environment files to GitHub.

Review `script/Deploy.s.sol` to confirm the required deployment parameters and constructor arguments before running a deployment.

A typical Foundry deployment command is:

```bash
forge script script/Deploy.s.sol:Deploy \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast
```

Deployment flags and constructor parameters may need to be adjusted to match the deployment script.

---

## 🧪 Testing

The smart contracts are tested using Foundry.

Run all tests:

```bash
forge test -vv
```

Format Solidity files:

```bash
forge fmt
```

The project has included tests for:

- Coin Flip choices.
- Faucet claims.
- Faucet cooldown.
- Empty faucet protection.
- Unauthorized minting.

Additional tests can be added for minting limits, burning,
=======

## Foundry

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

- **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
- **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
- **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
- **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

https://book.getfoundry.sh/

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy

```shell
$ forge script script/Counter.s.sol:CounterScript --rpc-url <your_rpc_url> --private-key <your_private_key>
```

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```


# SpaceTorch1

> > > > > > > 74cbbe93f1c6102d8f7b8c7e05517bc159fb01e4
