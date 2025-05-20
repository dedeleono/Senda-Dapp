import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms and Conditions | Senda',
  description: 'Terms and conditions for using Senda platform',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#d7dfbe]">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold mb-4 text-gray-900">
            TERMS AND CONDITIONS OF USE OF THE SENDA APPLICATION
          </h1>
          <p className="text-gray-600 mb-12 text-lg">Last updated: 2025/05/16</p>

          <div className="prose prose-lg max-w-none">
            <section className="mb-12 p-6 bg-gray-50 rounded-lg">
              <h2 className="text-2xl font-semibold mb-6 text-gray-900 border-b pb-2">1. Definitions</h2>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li className="text-gray-700">
                  <strong>User:</strong> Any person who accesses and uses the services of SENDA.
                </li>
                <li className="text-gray-700">
                  <strong>Digital Assets:</strong> Cryptocurrencies supported by the Application, including but not
                  limited to Tether (USDT), USD Coin (USDC), and Solana (SOL).
                </li>
                <li className="text-gray-700">
                  <strong>Services:</strong> Features that allow the User to send, receive, and trade digital assets via
                  smart contracts deployed on the blockchain.
                </li>
              </ul>
            </section>

            <section className="mb-12 p-6 bg-gray-50 rounded-lg">
              <h2 className="text-2xl font-semibold mb-6 text-gray-900 border-b pb-2">2. Nature of the Service</h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  SENDA does not operate as a self‑custody platform. Instead, it runs its own infrastructure that
                  enables Users to send and receive digital assets through smart contracts developed by SENDA.
                </p>
                <p>
                  Because Users do not manage external wallets or private keys, SENDA uses an operational model in which
                  transactions are signed and executed from its server infrastructure on the User&apos;s behalf, under the
                  conditions programmed into the smart contract.
                </p>
                <p>
                  Digital assets are deposited into multi‑signature smart contracts designed by SENDA. Release of
                  funds is subject to pre‑defined conditions — such as signatures established by the parties involved — according to each transaction workflow.
                </p>
                <p>
                  Although funds are not held in a traditional wallet accessible directly by the User, SENDA cannot
                  unilaterally release funds without meeting the contract conditions. SENDA does retain technical access
                  to the execution environment and the ability to sign transactions on behalf of Users, which
                  constitutes an indirect operational custody model.
                </p>
              </div>
            </section>

            <section className="mb-12 p-6 bg-gray-50 rounded-lg">
              <h2 className="text-2xl font-semibold mb-6 text-gray-900 border-b pb-2">3. Use of the Services</h2>
              <p className="mb-4 text-gray-700">Through SENDA, the User may:</p>
              <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
                <li>Send digital assets to third parties under the conditions programmed in a smart contract.</li>
                <li>Receive digital assets via protected logical custody structures (escrow).</li>
                <li>View balances, transaction history, and execution status.</li>
              </ul>
              <p className="mt-6 text-gray-700">
                Every transaction processed by SENDA uses decentralized blockchain infrastructure and is validated by
                the Application&apos;s infrastructure.
              </p>
            </section>

            <section className="mb-12 p-6 bg-gray-50 rounded-lg">
              <h2 className="text-2xl font-semibold mb-6 text-gray-900 border-b pb-2">
                4. Security and Technical Architecture
              </h2>
              <p className="mb-4 text-gray-700">
                SENDA&apos;s infrastructure combines centralized control with decentralized logic, based on the following
                principles:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
                <li>Funds are held in SENDA‑designed smart contracts, not in the User&apos;s personal wallets.</li>
                <li>
                  SENDA&apos;s backend signs transactions according to the conditions defined in the multi‑signature escrows.
                </li>
                <li>
                  SENDA may update, migrate, or deploy new smart contracts as technical or security needs arise; any
                  change affecting execution logic or User balances will be communicated promptly.
                </li>
                <li>
                  Transactions are final once signed and executed, though they can be canceled if all required
                  signatures have not yet been collected.
                </li>
              </ul>
              <p className="mt-6 text-gray-700">
                This model offers a controlled, secure, and automated experience for Users who neither wish to nor know
                how to manage private keys directly, but it does require operational trust in SENDA as the
                infrastructure provider.
              </p>
            </section>

            <section className="mb-12 p-6 bg-gray-50 rounded-lg">
              <h2 className="text-2xl font-semibold mb-6 text-gray-900 border-b pb-2">5. User Responsibilities</h2>
              <p className="mb-4 text-gray-700">The User is responsible for:</p>
              <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
                <li>Maintaining exclusive control over their access credentials and devices.</li>
                <li>Understanding and accepting the conditions under which a smart contract may release funds.</li>
                <li>Verifying email addresses, addresses, amounts, and terms before executing any operation.</li>
              </ul>
              <p className="mt-6 text-gray-700">
                Use of SENDA implies acceptance that smart‑contract operations are automated, immutable, and final.
              </p>
            </section>

            <section className="mb-12 p-6 bg-gray-50 rounded-lg">
              <h2 className="text-2xl font-semibold mb-6 text-gray-900 border-b pb-2">6. Fees</h2>
              <p className="mb-4 text-gray-700">SENDA may charge fees for using the Application, including:</p>
              <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
                <li>Network (gas) fees.</li>
                <li>Service fees associated with smart‑contract execution.</li>
                <li>Liquidity margins when converting between digital assets.</li>
              </ul>
              <p className="mt-6 text-gray-700">
                All fees will be disclosed to the User before they confirm any transaction.
              </p>
            </section>

            <section className="mb-12 p-6 bg-gray-50 rounded-lg">
              <h2 className="text-2xl font-semibold mb-6 text-gray-900 border-b pb-2">7. Risks</h2>
              <p className="mb-4 text-gray-700">The User acknowledges that:</p>
              <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
                <li>Cryptocurrencies are volatile and not government‑backed.</li>
                <li>
                  Smart contracts carry inherent risks, such as coding errors, network congestion, or execution delays.
                </li>
                <li>All use of SENDA is at the User&apos;s sole risk and responsibility.</li>
              </ul>
            </section>

            <section className="mb-12 p-6 bg-gray-50 rounded-lg">
              <h2 className="text-2xl font-semibold mb-6 text-gray-900 border-b pb-2">8. Privacy</h2>
              <p className="text-gray-700">
                SENDA does not require mandatory personal data to operate. Any technical or session information
                collected will be used exclusively for system functionality, without linking it to personal identities.
              </p>
            </section>

            <section className="mb-12 p-6 bg-gray-50 rounded-lg">
              <h2 className="text-2xl font-semibold mb-6 text-gray-900 border-b pb-2">9. Modifications</h2>
              <p className="text-gray-700">
                SENDA may update these Terms and Conditions as deemed necessary. Continued use of the Application after
                any update constitutes tacit acceptance of the new terms.
              </p>
            </section>

            <section className="mb-12 p-6 bg-gray-50 rounded-lg">
              <h2 className="text-2xl font-semibold mb-6 text-gray-900 border-b pb-2">
                10. Governing Law and Jurisdiction
              </h2>
              <p className="text-gray-700">
                These Terms are governed by the laws of the Republic of Guatemala. Any dispute will be submitted to the
                competent courts of the Municipality of Guatemala, unless explicitly agreed otherwise.
              </p>
            </section>

            <section className="mb-12 p-6 bg-gray-50 rounded-lg">
              <h2 className="text-2xl font-semibold mb-6 text-gray-900 border-b pb-2">11. Contact</h2>
              <p className="text-gray-700">
                For support or feedback regarding SENDA, Users may contact us through the official channels integrated
                into the Application.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
} 