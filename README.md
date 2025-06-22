# Senda DApp

A frictionless, off-chain gateway to programmable money on Solana—combining prepaid cards, smart wallets and seamless remittances for underbanked users.

Features
--------
- Custom Authentication: NextAuth.js–powered, extensible login flows
- Solana Wallet Integration: On-chain interactions via @solana/web3.js & Anchor
- Prepaid Card Off-Ramps: Withdraw to prepaid cards with minimal KYC
- Guest Wallet Support: Zero-touch onboarding for crypto novices
- Fiat On-Ramp (soon): Integrate Helio for seamless credit-card funding
- Modern UI: Tailwind CSS + Radix UI components, fully TypeScript-typed

Tech Stack
----------
- Frontend: Next.js 15.x, React 19
- Styling: Tailwind CSS, Radix UI
- Auth: NextAuth v5
- API Layer: tRPC
- DB: Prisma + PostgreSQL
- Blockchain: Solana Web3.js, Anchor (Rust)
- State: Zustand
- Hosting: Vercel

Repository Layout
----------------
```text
.
├── senda-dapp/           # Next.js frontend application
│   ├── pages/            # Next.js pages & API routes
│   ├── components/       # Reusable React components
│   ├── styles/           # Global & component styles
│   └── package.json
├── senda-smartc/         # Solana smart-contract (Rust + Anchor)
│   ├── programs/         # Anchor programs source
│   ├── migrations/       # Anchor deploy scripts
│   └── Cargo.toml
├── .gitignore
└── README.md             # This file
```

Getting Started
---------------
### Prerequisites
- Node.js (v16+), Yarn or npm
- PostgreSQL (local or managed)
- Solana CLI (v1.14+)
- Anchor CLI (v0.27+)

### Environment Variables
Copy the template and fill in your own values:
```bash
cp .env.example .env  # in both senda-dapp/ and senda-smartc/
```
Edit each `.env`:
```env
# senda-dapp/.env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
SENDA_PROGRAM_ID=<YOUR_DEPLOYED_PROGRAM_ID>
# ...auth, DB, third-party keys...

# senda-smartc/.env
ANCHOR_WALLET=<path to your Anchor keypair>
CLUSTER_URL=https://api.devnet.solana.com
```

Frontend Setup
--------------
```bash
cd senda-dapp
yarn install
npx prisma generate
npx prisma migrate dev --name init
yarn dev
```
Open http://localhost:3000

Smart Contract Setup
--------------------
```bash
cd senda-smartc
anchor build
anchor deploy
```
Copy the new program ID into `senda-dapp/.env` under `SENDA_PROGRAM_ID`.

Development
-----------
- `yarn dev` in `senda-dapp`: Start frontend & API
- `anchor test` in `senda-smartc`: Run on-chain tests
- `yarn lint`, `yarn format`: Code quality

Future Roadmap
--------------
- Fiat On-Ramp: full credit-card funding via Helio
- Mobile SDK: React Native library
- Analytics Dashboard: Remittance flow insights

Contributing
------------
1. Fork the repo & create a feature branch
2. Commit with clear messages
3. Open a PR against `main`
4. Address review feedback
