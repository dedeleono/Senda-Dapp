import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | Senda',
  description: 'Privacy policy for Senda platform',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#d7dfbe]">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold mb-6 text-gray-900">Privacy Policy</h1>

          <div className="prose prose-lg max-w-none">
            <section className="mb-12 p-6 bg-gray-50 rounded-lg">
              <h2 className="text-2xl font-semibold mb-6 text-gray-900 border-b pb-2">1. Information We Collect</h2>

              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-semibold mb-4 text-gray-800">1.1. Account & Registration Data</h3>
                  <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
                    <li>
                      <strong>Credentials:</strong> Email address, hashed password, device identifiers.
                    </li>
                    <li>
                      <strong>Profile Information:</strong> User-provided name or alias (optional).
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-4 text-gray-800">1.2. Transactional & Blockchain Data</h3>
                  <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
                    <li>
                      <strong>On‑Chain Activity:</strong> Public wallet addresses, transaction hashes, timestamps,
                      smart‑contract parameters.
                    </li>
                    <li>
                      <strong>Balances & Trade History:</strong> Records of assets sent, received, or converted via
                      Senda&apos;s escrow contracts.
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-4 text-gray-800">1.3. Technical & Usage Data</h3>
                  <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
                    <li>
                      <strong>Device & Connection:</strong> IP address, browser or app version, operating system, device
                      type.
                    </li>
                    <li>
                      <strong>Logs & Analytics:</strong> Session identifiers, pages/screens viewed, performance metrics,
                      error reports.
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-4 text-gray-800">1.4. Support & Communications</h3>
                  <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
                    <li>
                      <strong>User Inquiries:</strong> Messages submitted via in‑app support channels.
                    </li>
                    <li>
                      <strong>Feedback:</strong> Survey responses or voluntary ratings.
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-12 p-6 bg-gray-50 rounded-lg">
              <h2 className="text-2xl font-semibold mb-6 text-gray-900 border-b pb-2">
                2. How We Use Your Information
              </h2>

              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-semibold mb-4 text-gray-800">Service Delivery</h3>
                  <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
                    <li>Execute smart‑contract transactions on your behalf.</li>
                    <li>Display your balances, history, and execution statuses.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-4 text-gray-800">Security & Fraud Prevention</h3>
                  <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
                    <li>Detect and mitigate unauthorized access or malicious activity.</li>
                    <li>Sign and validate multi‑signature escrow transactions.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-4 text-gray-800">Product Improvement & Analytics</h3>
                  <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
                    <li>Analyze usage patterns to improve features, performance, and user experience.</li>
                    <li>Test and roll out updates or new smart‑contract versions.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-4 text-gray-800">Communication</h3>
                  <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
                    <li>Send service notifications, updates to Terms & Conditions or this Privacy Policy.</li>
                    <li>Respond to your support requests.</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-12 p-6 bg-gray-50 rounded-lg">
              <h2 className="text-2xl font-semibold mb-6 text-gray-900 border-b pb-2">3. How We Share Information</h2>

              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-semibold mb-4 text-gray-800">3.1. Service Providers & Partners</h3>
                  <p className="text-gray-700">
                    We may share data with third‑party vendors who assist with hosting, analytics, customer support, and
                    legal compliance. All such providers are contractually obligated to protect your information and use
                    it only for the purposes we specify.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-4 text-gray-800">3.2. Blockchain Networks</h3>
                  <p className="text-gray-700">
                    By nature of on‑chain transactions, certain data (addresses, amounts, timestamps) become public on
                    the blockchain. Senda does not control or limit access to this public blockchain data.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-4 text-gray-800">3.3. Legal Requirements</h3>
                  <p className="text-gray-700">
                    We may disclose information if required by law, regulation, court order, or governmental authority,
                    or to investigate potential fraud or security breaches.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-12 p-6 bg-gray-50 rounded-lg">
              <h2 className="text-2xl font-semibold mb-6 text-gray-900 border-b pb-2">4. Data Retention</h2>
              <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
                <li>
                  <strong>Account & Transaction Records:</strong> Retained as long as your account remains active and
                  for a reasonable period thereafter to comply with legal obligations (e.g., anti‑money‑laundering
                  rules).
                </li>
                <li>
                  <strong>Log Data & Analytics:</strong> Typically retained for up to 24 months, then anonymized or
                  aggregated.
                </li>
                <li>
                  <strong>Support Correspondence:</strong> Retained until the inquiry is resolved, plus up to 12 months
                  for quality assurance.
                </li>
              </ul>
            </section>

            <section className="mb-12 p-6 bg-gray-50 rounded-lg">
              <h2 className="text-2xl font-semibold mb-6 text-gray-900 border-b pb-2">5. Your Rights & Choices</h2>
              <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
                <li>
                  <strong>Access & Portability:</strong> You may request a copy of the personal data we hold about you.
                </li>
                <li>
                  <strong>Correction:</strong> You may update or correct inaccuracies in your account information.
                </li>
                <li>
                  <strong>Deletion:</strong> You may request deletion of your personal data; note that
                  blockchain‑recorded transactions cannot be erased, but your account and associated metadata can be
                  deactivated.
                </li>
                <li>
                  <strong>Opt‑Out of Communications:</strong> You may unsubscribe from non‑essential service
                  announcements and marketing messages.
                </li>
              </ul>
              <p className="mt-6 text-gray-700">
                To exercise these rights, contact us via the channels listed in Section 10.
              </p>
            </section>

            <section className="mb-12 p-6 bg-gray-50 rounded-lg">
              <h2 className="text-2xl font-semibold mb-6 text-gray-900 border-b pb-2">6. Security Measures</h2>
              <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
                <li>
                  <strong>Encryption:</strong> All communications between your device and our servers use TLS
                  encryption.
                </li>
                <li>
                  <strong>Access Controls:</strong> Strict role‑based access for our personnel; multi‑factor
                  authentication for administrative access.
                </li>
                <li>
                  <strong>Infrastructure:</strong> Smart contracts audited by third‑party security firms; regular
                  penetration testing on our backend systems.
                </li>
                <li>
                  <strong>Incident Response:</strong> Defined protocol for detecting, containing, and notifying users of
                  any suspected data breach.
                </li>
              </ul>
            </section>

            <section className="mb-12 p-6 bg-gray-50 rounded-lg">
              <h2 className="text-2xl font-semibold mb-6 text-gray-900 border-b pb-2">7. Children&apos;s Privacy</h2>
              <p className="text-gray-700">
                Our Service is intended for users aged 18 and older. We do not knowingly collect or store personal data
                from minors. If you believe we have inadvertently collected data from someone under 18, please contact
                us to have it removed.
              </p>
            </section>

            <section className="mb-12 p-6 bg-gray-50 rounded-lg">
              <h2 className="text-2xl font-semibold mb-6 text-gray-900 border-b pb-2">8. International Transfers</h2>
              <p className="text-gray-700">
                Senda is based in Guatemala. By using our Service, you acknowledge that your data may be transferred to
                and processed in countries with different data protection laws. We take measures to ensure your data
                remains protected in accordance with this Privacy Policy.
              </p>
            </section>

            <section className="mb-12 p-6 bg-gray-50 rounded-lg">
              <h2 className="text-2xl font-semibold mb-6 text-gray-900 border-b pb-2">9. Changes to This Policy</h2>
              <p className="text-gray-700">
                We may modify this Privacy Policy at any time. If changes are material, we will notify you via in‑app
                notice or email at least 30 days before they take effect. Continued use of the Service after the
                effective date constitutes acceptance of the revised policy.
              </p>
            </section>

            {/* <section className="mb-12 p-6 bg-gray-50 rounded-lg">
              <h2 className="text-2xl font-semibold mb-6 text-gray-900 border-b pb-2">10. Contact Information</h2>
              <p className="mb-4 text-gray-700">
                If you have questions, requests, or concerns about this Privacy Policy, please reach out:
              </p>

              <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
                <li>
                  <strong>In‑App Support:</strong> Use the "Help" or "Support" section within Senda.
                </li>
                <li>
                  <strong>Email:</strong> privacy@senda.app
                </li>
                <li>
                  <strong>Mailing Address:</strong>
                  <br />
                  Senda, Inc.
                  <br />
                  1234 Avenida Reforma
                  <br />
                  Guatemala City, Guatemala
                </li>
              </ul>
            </section> */}
          </div>
        </div>
      </div>
    </div>
  )
} 