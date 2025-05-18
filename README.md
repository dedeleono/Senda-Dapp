# Senda DApp

A Next.js-based decentralized application built on the Solana blockchain, focused on frictionless, off-chain access to programmable money through prepaid cards and smart wallet infrastructure.

Senda aims to empower users—especially those in unbanked and underbanked regions—by simplifying access to crypto-based remittances and real-world payments.

## Features

- **Custom Authentication System**: Secure user authentication built with Next-Auth
- **Solana Integration**: Built-in Solana wallet functionality and blockchain interactions
- **Modern UI/UX**: Built with Tailwind CSS and Radix UI components
- **Type Safety**: Full TypeScript support throughout the application
- **Coming Soon**: Fiat on-ramp functionality
- **Guest Wallet Support**: Seamless onboarding for users with no prior crypto experience
- **Prepaid Card Off-Ramps**: Let recipients withdraw to prepaid cards, avoiding banks and KYC

## Tech Stack

- **Frontend**: Next.js 15.3, React 19
- **Styling**: Tailwind CSS, Radix UI
- **Authentication**: Next-Auth v5
- **Database**: Prisma with PostgreSQL
- **Blockchain**: Solana Web3.js, Anchor Framework
- **State Management**: Zustand
- **API Layer**: tRPC
- **Type Safety**: TypeScript
- **On-Ramp**: Helio integration for fiat-to-crypto onboarding
- **Wallet Auth Layer**: Custom wallet + session system inspired by embedded onboarding

## Getting Started

### Prerequisites

- Node.js (LTS version recommended)
- PostgreSQL database
- Solana CLI tools (for development)

### Environment Setup

Create a `.env` file with the following variables:

```bash
# Authentication (NextAuth.js)
NEXTAUTH_URL=''
AUTH_SECRET=''

# Google OAuth (for Google Sign-in)
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""

EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=''
#EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=example@gmail.com
EMAIL_SERVER_PASSWORD=''
EMAIL_FROM=example@gmail.com

DATABASE_URL="postgresql://postgres:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:5432/postgres"

NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com

SOLANA_DEVNET_URL=https://api.devnet.solana.com
SOLANA_MAINNET_URL=https://api.mainnet-beta.solana.com
SENDA_PROGRAM_ID=HyavU5k2jA2D2oPUX7Ct8kUhXJQGaTum4nqnLW7f77wL
ANCHOR_WALLET=''
FACTORY_AUTHORITY_WALLET_PK=''

# NEXT_PUBLIC_USDC_MINT=EPjFWdd5AufqSSqeM2qctBxi8LoRBdQkj6mjjFG2Afa
# NEXT_PUBLIC_USDT_MINT = Es9vMFrzaCERnAawET5VsmZ6T4dQW5Ad9asmaaAEA7ZT
NEXT_PUBLIC_USDC_MINT=Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr
NEXT_PUBLIC_USDT_MINT=J2B12TxqtZkXtMAPY1BX2noiTSDNrz4VqiKfU5Sh9t5d
NEXT_PUBLIC_FEE_PAYER_WALLET=''
FEE_PAYER_SECRET_KEY=''

NODE_ENV=development
NEXT_PUBLIC_SOLANA_NETWORK=devnet

```

### Installation

1. Install dependencies:
   ```bash
   yarn install
   ```

2. Set up the database:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

3. Run the development server:
   ```bash
   yarn dev
   ```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Development

- `yarn dev`: Start the development server with Turbopack
- `yarn build`: Create a production build
- `yarn start`: Start the production server
- `yarn lint`: Run ESLint
- `yarn format`: Format code with Prettier

## Future Work

- Integrated prepaid card issuance
- Mobile app
