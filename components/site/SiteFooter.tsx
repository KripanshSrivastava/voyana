import Link from "next/link";
import { Plane, Mail, Phone, MapPin, ShieldCheck } from "lucide-react";
import { FaFacebookF, FaInstagram, FaTwitter, FaYoutube, FaPinterestP, FaLinkedinIn } from "react-icons/fa";
import type { IconType } from "react-icons";
import type { getPublicSettings } from "@/lib/settings";

type Settings = Awaited<ReturnType<typeof getPublicSettings>>;

type SocialEntry = { href: string; Icon: IconType; label: string };

/** Only render a social button when the admin has actually configured that
 *  URL under Site Settings → Socials — no empty placeholders that lead nowhere. */
function socialLinks(socials: Settings["socials"]): SocialEntry[] {
  const list: SocialEntry[] = [];
  if (socials.facebook) list.push({ href: socials.facebook, Icon: FaFacebookF, label: "Facebook" });
  if (socials.instagram) list.push({ href: socials.instagram, Icon: FaInstagram, label: "Instagram" });
  if (socials.twitter) list.push({ href: socials.twitter, Icon: FaTwitter, label: "Twitter" });
  if (socials.youtube) list.push({ href: socials.youtube, Icon: FaYoutube, label: "YouTube" });
  if (socials.pinterest) list.push({ href: socials.pinterest, Icon: FaPinterestP, label: "Pinterest" });
  if (socials.linkedin) list.push({ href: socials.linkedin, Icon: FaLinkedinIn, label: "LinkedIn" });
  return list;
}

/**
 * Shared marketing footer for every /(site) page. Visually identical to the
 * landing's LandingFooter — same cream palette, same brand block, same
 * column layout, same trust badge, same social row. Design tokens live at
 * :root in globals.css so nothing here needs a scope class.
 */
export function SiteFooter({ settings }: { settings: Settings }) {
  const year = new Date().getFullYear();
  const socials = socialLinks(settings.socials);
  return (
    <footer
      style={{
        borderTop: "1px solid var(--mb-line)",
        background: "var(--mb-surface)",
        marginTop: 48,
        color: "var(--mb-ink)",
      }}
    >
      <div
        className="mb-site-footer-inner"
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          padding: "64px 48px 40px",
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr 1fr 1.2fr",
          gap: 48,
        }}
      >
        {/* Brand block --------------------------------------------------- */}
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            {settings.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logoUrl} alt={settings.brandName} style={{ height: 40, width: "auto", display: "block" }} />
            ) : (
              <span
                aria-hidden="true"
                style={{
                  display: "inline-flex",
                  width: 36,
                  height: 36,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 8,
                  background: "var(--mb-accent)",
                  color: "#fff",
                }}
              >
                <Plane style={{ width: 18, height: 18, transform: "rotate(-45deg)" }} />
              </span>
            )}
            <h3 style={{ fontSize: 20, margin: 0, color: "var(--mb-ink)" }}>{settings.brandName}</h3>
          </div>
          <p style={{ fontSize: 14, color: "var(--mb-muted)", lineHeight: 1.6, maxWidth: 300, margin: "0 0 18px" }}>
            {settings.footerText || settings.tagline}
          </p>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#fff",
              border: "1px solid var(--mb-line)",
              borderRadius: 999,
              padding: "8px 14px",
              fontSize: 12.5,
              color: "var(--mb-ink)",
            }}
          >
            <ShieldCheck style={{ width: 14, height: 14, color: "var(--mb-green)" }} />
            <span style={{ fontWeight: 500 }}>Secure &amp; encrypted enquiries</span>
          </div>
        </div>

        {/* Explore column -------------------------------------------------- */}
        <div>
          <h4 className="mb-site-footer-heading">Explore</h4>
          <ul className="mb-site-footer-list">
            <li><Link href="/destinations">Destinations</Link></li>
            <li><Link href="/tours">Tours</Link></li>
            <li><Link href="/packages">Packages</Link></li>
            <li><Link href="/how-it-works">How It Works</Link></li>
            <li><Link href="/about">About</Link></li>
          </ul>
        </div>

        {/* Travel Agents column ------------------------------------------- */}
        <div>
          <h4 className="mb-site-footer-heading">Travel Agents</h4>
          <ul className="mb-site-footer-list">
            <li><Link href="/login?intent=agent">Vendor Login</Link></li>
            <li><Link href="/agent/signup">Become a Partner</Link></li>
            <li><Link href="/contact">Vendor Support</Link></li>
          </ul>
        </div>

        {/* Support / Contact column --------------------------------------- */}
        <div>
          <h4 className="mb-site-footer-heading">Support</h4>
          <ul className="mb-site-footer-list mb-site-footer-contact">
            {settings.phone && (
              <li>
                <a href={`tel:${settings.phone}`}>
                  <Phone style={{ width: 14, height: 14, color: "var(--mb-accent)" }} />
                  <span>{settings.phone}</span>
                </a>
              </li>
            )}
            {settings.email && (
              <li>
                <a href={`mailto:${settings.email}`}>
                  <Mail style={{ width: 14, height: 14, color: "var(--mb-accent)" }} />
                  <span>{settings.email}</span>
                </a>
              </li>
            )}
            {settings.address && (
              <li className="mb-site-footer-address">
                <MapPin style={{ width: 14, height: 14, color: "var(--mb-accent)", marginTop: 3 }} />
                <span>{settings.address}</span>
              </li>
            )}
            <li>
              <Link href="/contact">
                <span style={{ fontSize: 13.5 }}>Contact us →</span>
              </Link>
            </li>
          </ul>

          {socials.length > 0 && (
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              {socials.map(({ href, Icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="mb-site-footer-social"
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <div
        className="mb-site-footer-legal"
        style={{
          borderTop: "1px solid var(--mb-line)",
          maxWidth: 1320,
          margin: "0 auto",
          padding: "20px 48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          fontSize: 12.5,
          color: "var(--mb-muted)",
        }}
      >
        <span>© {year} {settings.brandName}. All rights reserved.</span>
        <div style={{ display: "flex", gap: 20 }}>
          <Link href="/privacy-policy">Privacy Policy</Link>
          <Link href="/terms">Terms &amp; Conditions</Link>
        </div>
      </div>

      <style>{`
        .mb-site-footer-heading {
          font-size: 13px; font-weight: 600; color: var(--mb-ink);
          letter-spacing: 0.5px; text-transform: uppercase; margin: 6px 0 16px;
        }
        .mb-site-footer-list { list-style: none; padding: 0; margin: 0; }
        .mb-site-footer-list li { margin-bottom: 10px; font-size: 14px; }
        .mb-site-footer-list a {
          color: var(--mb-muted); text-decoration: none; transition: color 150ms;
          display: inline-flex; align-items: center; gap: 8px;
        }
        .mb-site-footer-list a:hover { color: var(--mb-ink); }
        .mb-site-footer-contact li { margin-bottom: 12px; }
        .mb-site-footer-address { display: flex; gap: 8px; color: var(--mb-muted); font-size: 13.5px; line-height: 1.5; }
        .mb-site-footer-social {
          display: inline-flex; width: 34px; height: 34px; align-items: center; justify-content: center;
          border-radius: 8px; background: #fff; border: 1px solid var(--mb-line);
          color: var(--mb-muted); transition: all 150ms;
        }
        .mb-site-footer-social:hover { color: var(--mb-accent); border-color: var(--mb-accent); }
        .mb-site-footer-legal a { color: var(--mb-muted); text-decoration: none; }
        .mb-site-footer-legal a:hover { color: var(--mb-ink); }
        @media (max-width: 900px) {
          .mb-site-footer-inner {
            padding: 48px 20px 32px !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 32px !important;
          }
          .mb-site-footer-legal { padding: 20px !important; flex-direction: column; text-align: center; gap: 10px; }
        }
        @media (max-width: 620px) {
          .mb-site-footer-inner { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </footer>
  );
}
