import type { Metadata } from "next";
import { getPublicSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Terms & Conditions" };

export default async function TermsPage() {
  const s = await getPublicSettings();
  const contact = s.email || "our support team";

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-bold text-navy-900">Terms &amp; Conditions</h1>
      <p className="mt-3 text-sm text-navy-500">Last updated: {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>

      <div className="prose prose-navy mt-8 max-w-none space-y-8 text-navy-700">
        <section>
          <p>
            These terms govern your use of {s.brandName} (the &quot;platform&quot;), a service that connects
            travellers submitting a travel enquiry with independent travel agents and vendors (&quot;partners&quot;)
            who may purchase access to that enquiry. By using the platform, you agree to these terms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-navy-900">1. Using the website</h2>
          <p>
            Anyone may browse destinations, packages and tours, and submit a travel enquiry. We do not sell travel
            directly — {s.brandName} facilitates an introduction between travellers and independent partners. Any
            booking, itinerary, pricing or payment for the trip itself is agreed directly between you and the
            partner who contacts you; {s.brandName} is not a party to that arrangement.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-navy-900">2. Agent/vendor accounts</h2>
          <p>
            Partners register an account providing accurate business and contact details. Accounts may go through
            a verification review before a partner can purchase leads. We may suspend or reject an account that
            provides false information, is inactive, or violates these terms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-navy-900">3. Lead credits, purchases and sharing limits</h2>
          <p>
            Partners access traveller enquiries (&quot;leads&quot;) by spending Lead Credits from their account
            balance, purchased in packages set by {s.brandName}. Each lead is capped and made available to a
            limited number of partners — never broadcast without limit. Once a partner has spent a credit to
            access a lead, that spend is final except where a refund is approved under the spam/quality review
            process described below. Lead Credit pricing is set and managed by {s.brandName} and is shown in the
            partner dashboard before purchase.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-navy-900">4. Lead quality and spam reporting</h2>
          <p>
            If a partner believes a purchased lead is invalid, a duplicate, or spam, they may file a report through
            the platform. Reports are reviewed by {s.brandName}; approved reports may result in a credit refund or
            adjustment at our discretion. Submitting reports in bad faith, or attempting to reverse legitimate
            purchases, may result in account suspension.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-navy-900">5. Wallet, payments and refunds</h2>
          <p>
            Where online payment is enabled, Lead Credit purchases are processed through our payment gateway
            provider and are verified server-side before any credit is applied — a payment is never assumed
            successful based on a browser-side response alone. Except where required by law or approved through the
            spam/quality review process above, Lead Credit purchases are non-refundable once credits have been
            applied to your account.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-navy-900">6. Vendor content submissions and moderation</h2>
          <p>
            Partners may submit destinations, tours or package listings for consideration. Submitted content is
            reviewed by {s.brandName} before it can be published; partners cannot publish content directly to the
            public website. We may edit, approve, reject, or request changes to any submission, and may remove
            published content that later violates these terms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-navy-900">7. Prohibited activity</h2>
          <ul className="mt-3 space-y-2">
            <li>• Providing false identity, business, or contact information.</li>
            <li>• Attempting to bypass the lead-sharing cap, pricing, or credit system.</li>
            <li>• Harvesting, reselling, or publicly sharing traveller contact details obtained through the platform.</li>
            <li>• Uploading unlawful, infringing, or misleading content.</li>
            <li>• Interfering with the platform&apos;s security, integrity, or normal operation.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-navy-900">8. Account suspension</h2>
          <p>
            We may suspend or terminate an account that violates these terms, misuses purchased leads, or engages
            in fraudulent activity. Where reasonably possible we will explain the reason; some actions (e.g.
            suspected fraud) may require immediate suspension without prior notice.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-navy-900">9. Intellectual property</h2>
          <p>
            The {s.brandName} name, branding, website design and platform software are our property or that of our
            licensors. Content submitted by partners remains owned by the submitting partner, who grants us a
            licence to display it on the platform once approved and published.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-navy-900">10. Third-party services</h2>
          <p>
            The platform relies on third-party providers for hosting, authentication, payments, email delivery and
            analytics. We are not responsible for outages or issues originating from those third-party services,
            though we work to minimize their impact on you.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-navy-900">11. Limitation of liability</h2>
          <p>
            {s.brandName} facilitates introductions between travellers and independent partners; we are not
            responsible for the accuracy of any itinerary, quote, or service delivered by a partner, nor for any
            dispute arising from a booking made outside the platform. To the fullest extent permitted by law, our
            liability for any claim relating to the platform is limited to the amount (if any) you paid to
            {" "}{s.brandName} in the twelve months preceding the claim.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-navy-900">12. Changes to these terms</h2>
          <p>
            We may update these terms as the platform evolves. We will update the &quot;Last updated&quot; date
            above when changes are made; continued use of the platform after changes take effect constitutes
            acceptance of the revised terms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-navy-900">13. Contact</h2>
          <p>
            Questions about these terms can be sent to {contact}{s.phone ? ` or ${s.phone}` : ""}.
          </p>
        </section>
      </div>
    </div>
  );
}
