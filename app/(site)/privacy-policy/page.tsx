import type { Metadata } from "next";
import { getPublicSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Privacy Policy" };

export default async function PrivacyPolicyPage() {
  const s = await getPublicSettings();
  const contact = s.email || "our support team";

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-bold text-navy-900">Privacy Policy</h1>
      <p className="mt-3 text-sm text-navy-500">Last updated: {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>

      <div className="prose prose-navy mt-8 max-w-none space-y-8 text-navy-700">
        <section>
          <p>
            {s.brandName} (&quot;we&quot;, &quot;us&quot;) operates a travel lead-matching platform that connects
            travellers with independent travel agents and vendors (&quot;partners&quot;). This policy explains what
            information we collect, why, and how it is used and protected. It applies to visitors, travellers who
            submit an enquiry, and agents/vendors who register a partner account.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-navy-900">Information we collect</h2>
          <h3 className="mt-4 text-lg font-semibold text-navy-900">When you submit a travel enquiry</h3>
          <p>
            When you use our enquiry form, we collect the details you provide — typically your name, phone number,
            email address, the destination and travel dates you&apos;re interested in, number of travellers, and any
            notes or preferences you add. We also record which page you submitted the form from and, where
            applicable, marketing attribution such as the campaign or advertisement that brought you to our site.
          </p>
          <h3 className="mt-4 text-lg font-semibold text-navy-900">When you register as an agent/vendor</h3>
          <p>
            Partner accounts provide their name, email, phone, and company details (business name, address, contact
            person, website and social links where supplied). Account authentication is handled by our identity
            provider (Supabase Auth); we do not store your password in plain text.
          </p>
          <h3 className="mt-4 text-lg font-semibold text-navy-900">Automatically collected information</h3>
          <p>
            Like most websites, our servers log basic technical information (such as browser type, device type, and
            referring page) to keep the service secure and working correctly. Where analytics tools are enabled by
            the site administrator (such as Google Analytics, Meta Pixel or Google Ads conversion tracking), those
            services may set cookies or similar identifiers in your browser, subject to your consent choices.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-navy-900">How we use your information</h2>
          <ul className="mt-3 space-y-2">
            <li>• To match a travel enquiry with a small number of relevant, vetted travel agents/vendors.</li>
            <li>• To let a partner who has purchased access to your enquiry contact you about your trip.</li>
            <li>• To operate partner accounts — verification, wallet/lead-credit balances, and purchase records.</li>
            <li>• To send transactional messages: enquiry confirmations, account and wallet notifications, and support replies.</li>
            <li>• To measure which marketing channels are effective, where analytics tools are enabled.</li>
            <li>• To detect fraud, spam, or misuse, and to keep the platform secure.</li>
          </ul>
          <p className="mt-3">
            A single travel enquiry is shared with a limited, capped number of agents (never published or broadcast
            widely). We do not sell your personal information to third parties.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-navy-900">Cookies and similar technologies</h2>
          <p>
            We use essential cookies to keep you signed in and to remember your enquiry form progress. Where enabled
            by the administrator, analytics/advertising cookies (e.g. Google Analytics, Google Ads, Meta Pixel) help
            us understand site usage and measure campaign performance. You can control cookies through your browser
            settings.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-navy-900">Third-party services we use</h2>
          <p>
            We rely on a small number of service providers to run the platform: a database and authentication
            provider (Supabase) to store account and enquiry data securely, an email delivery provider for
            transactional messages, and — where enabled — a payment gateway to process wallet/lead-credit purchases,
            and analytics/advertising platforms as noted above. These providers process data only as needed to
            deliver their service to us.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-navy-900">Data security</h2>
          <p>
            We apply reasonable technical and organizational safeguards to protect your information, including
            encrypted connections, role-based access controls limiting who can view enquiry details, and
            server-side enforcement of who may access, edit or export data. No online service can guarantee
            absolute security, but we work to reduce risk at every layer.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-navy-900">Data retention</h2>
          <p>
            We retain enquiry and account records for as long as needed to provide the service, meet our
            recordkeeping and legal obligations, and resolve disputes. You may request deletion of your personal
            information at any time, subject to any records we are required to keep by law.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-navy-900">Your rights</h2>
          <p>
            You may ask us to access, correct, or delete the personal information we hold about you, or to
            withdraw consent for optional processing such as marketing analytics. To make a request, contact{" "}
            {contact}.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-navy-900">Changes to this policy</h2>
          <p>
            We may update this policy from time to time as our product evolves. We will update the &quot;Last
            updated&quot; date above when we do, and material changes will be reflected on this page.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-navy-900">Contact us</h2>
          <p>
            Questions about this policy or how your data is handled? Reach us at {contact}
            {s.phone ? ` or ${s.phone}` : ""}.
          </p>
        </section>
      </div>
    </div>
  );
}
