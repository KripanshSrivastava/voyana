import Link from "next/link";
import { Plane, Mail, Phone, MapPin } from "lucide-react";
import type { getPublicSettings } from "@/lib/settings";

type Settings = Awaited<ReturnType<typeof getPublicSettings>>;

export function SiteFooter({ settings }: { settings: Settings }) {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t border-navy-100 bg-navy-950 text-navy-200">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4 lg:px-8">
        <div className="md:col-span-1">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
              <Plane className="h-5 w-5 -rotate-45 text-brand-300" />
            </span>
            <span className="text-xl font-bold text-white">{settings.brandName}</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-navy-300">
            {settings.footerText || settings.tagline}
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white">Explore</h4>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/destinations" className="hover:text-white">Destinations</Link></li>
            <li><Link href="/tours" className="hover:text-white">Tours</Link></li>
            <li><Link href="/packages" className="hover:text-white">Packages</Link></li>
            <li><Link href="/how-it-works" className="hover:text-white">How It Works</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white">Company</h4>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/about" className="hover:text-white">About</Link></li>
            <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
            <li><Link href="/request-quote" className="hover:text-white">Get Free Quotes</Link></li>
            <li><Link href="/agent/signup" className="hover:text-white">Become a Partner</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white">Get in touch</h4>
          <ul className="mt-4 space-y-3 text-sm">
            {settings.phone && (
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-brand-300" />
                <a href={`tel:${settings.phone}`} className="hover:text-white">{settings.phone}</a>
              </li>
            )}
            {settings.email && (
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-brand-300" />
                <a href={`mailto:${settings.email}`} className="hover:text-white">{settings.email}</a>
              </li>
            )}
            {settings.address && (
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-brand-300" />
                <span>{settings.address}</span>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-navy-400 sm:flex-row sm:px-6 lg:px-8">
          <p>© {year} {settings.brandName}. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy-policy" className="hover:text-white">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white">Terms &amp; Conditions</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
