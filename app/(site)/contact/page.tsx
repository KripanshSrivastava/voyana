import type { Metadata } from "next";
import { Phone, Mail, MapPin, MessageCircle } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { getPublicSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Contact" };
export const revalidate = 3600;

export default async function ContactPage() {
  const s = await getPublicSettings();
  const whatsappDigits = s.whatsapp?.replace(/[^\d]/g, "");
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-bold text-navy-900">Get in touch</h1>
      <p className="mt-3 text-lg text-navy-500">
        Have a question? Reach out, or request a free quote and an expert will contact you.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {s.phone && (
          <a href={`tel:${s.phone}`} className="flex items-center gap-3 rounded-2xl border border-navy-100 bg-white p-5 shadow-sm hover:border-brand-300">
            <Phone className="h-5 w-5 text-brand-600" />
            <div>
              <div className="text-sm text-navy-400">Call us</div>
              <div className="font-medium text-navy-900">{s.phone}</div>
            </div>
          </a>
        )}
        {whatsappDigits && (
          <a href={`https://wa.me/${whatsappDigits}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl border border-navy-100 bg-white p-5 shadow-sm hover:border-brand-300">
            <MessageCircle className="h-5 w-5 text-emerald-600" />
            <div>
              <div className="text-sm text-navy-400">WhatsApp</div>
              <div className="font-medium text-navy-900">{s.whatsapp}</div>
            </div>
          </a>
        )}
        {s.email && (
          <a href={`mailto:${s.email}`} className="flex items-center gap-3 rounded-2xl border border-navy-100 bg-white p-5 shadow-sm hover:border-brand-300">
            <Mail className="h-5 w-5 text-brand-600" />
            <div>
              <div className="text-sm text-navy-400">Email</div>
              <div className="font-medium text-navy-900">{s.email}</div>
            </div>
          </a>
        )}
        {s.address && (
          <div className="flex items-center gap-3 rounded-2xl border border-navy-100 bg-white p-5 shadow-sm">
            <MapPin className="h-5 w-5 text-brand-600" />
            <div>
              <div className="text-sm text-navy-400">Visit</div>
              <div className="font-medium text-navy-900">{s.address}</div>
            </div>
          </div>
        )}
      </div>

      {!s.phone && !s.email && !s.address && !whatsappDigits && (
        <p className="mt-8 rounded-xl border border-navy-100 bg-navy-50 p-4 text-navy-500">
          Contact details will be available soon. In the meantime, request a free quote and we&apos;ll reach out.
        </p>
      )}

      <div className="mt-10">
        <ButtonLink href="/request-quote" variant="primary" size="lg">Get Free Quotes</ButtonLink>
      </div>
    </div>
  );
}
