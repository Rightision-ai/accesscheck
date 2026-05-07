import Link from "next/link";
import Image from "next/image";
import { Linkedin, MapPin } from "lucide-react";

const TRADEMARKS = [
  {
    src: "/assets/trademarks/foundations_logo_738_whiteout.webp",
    alt: "Foundations",
    width: 175,
    height: 175,
  },
  {
    src: "/assets/trademarks/Funded-by-MHCLG-400-x-200-px-200x100.webp",
    alt: "Funded by Ministry of Housing, Communities & Local Government",
    width: 200,
    height: 100,
  },
  {
    src: "/assets/trademarks/CCS_WHITE_Supplier_AW_72dpi-125x100.webp",
    alt: "Crown Commercial Service Supplier",
    width: 125,
    height: 100,
  },
  {
    src: "/assets/trademarks/ESPO-1-1-199x100.webp",
    alt: "ESPO Framework Supplier",
    width: 199,
    height: 100,
  },
  {
    src: "/assets/trademarks/MicrosoftTeams-image-4-e1638705704784-217x100.webp",
    alt: "Disability Confident Employer",
    width: 217,
    height: 100,
  },
  {
    src: "/assets/trademarks/6411e418db0c411bd57b286d_Cert-CE-100x100.webp",
    alt: "Cyber Essentials Certified",
    width: 100,
    height: 100,
  },
];

export default function MarketingFooter() {
  return (
    <footer role="contentinfo" className="bg-white">
      {/* Top: brand + nav columns */}
      <div className="border-t border-border"></div>

      {/* Green strip with parent branding + accreditations */}
      <section
        aria-label="Foundations and accreditations"
        className="bg-primary-dark text-white"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-5 min-w-0">
              <div>
                <div className="flex items-center gap-4 flex-wrap">
                  <Link
                    href="/"
                    aria-label="AccessCheck home"
                    className="inline-flex items-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-dark)] focus-visible:ring-offset-2"
                  >
                    <Image
                      src="/assets/logo/SVG/AcessCheck -24.svg"
                      alt="AccessCheck"
                      width={200}
                      height={64}
                      className="h-32 w-auto"
                    />
                  </Link>
                  <div className="mt-5">
                    <p className="text-sm font-semibold">
                      A service by Foundations
                    </p>
                    <p className="text-xs text-white/80 mt-2">
                      Powered by
                      <Image
                        src="/assets/media/rightision-bw-logo.svg"
                        alt="Rightision"
                        width={50}
                        height={50}
                        className="h-5 w-auto ml-2 brightness-0 invert"
                      />
                    </p>
                  </div>
                </div>
                <p className="mt-5 max-w-md text-sm text-white/80 leading-relaxed">
                  AccessCheck makes homes accessible for everyone through
                  AI-powered insights — built by Foundations, the national body
                  for home improvement agencies in England.
                </p>
                <a
                  href="https://www.linkedin.com/company/rightision/posts/?feedView=all"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="AccessCheck on LinkedIn"
                  className="mt-6 inline-flex items-center justify-center w-11 h-11 rounded-lg bg-white text-primary-dark hover:bg-transparent hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
                >
                  <Linkedin size={18} aria-hidden="true" />
                </a>
              </div>
            </div>
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-8 min-w-0">
              <nav aria-label="Product" className="min-w-0">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-white border-b-2 border-white pb-2 inline-block">
                    Product
                  </h2>
                  <ul className="mt-4 space-y-3 text-sm">
                    <li>
                      <Link
                        href="/solutions/floor-plan-analysis"
                        className="text-white hover:text-primary-light hover:underline"
                      >
                        Floor plan analysis
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/solutions/image-analysis"
                        className="text-white hover:text-primary-light hover:underline"
                      >
                        Image analysis
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/solutions/adaptation-plans"
                        className="text-white hover:text-primary-light hover:underline"
                      >
                        Adaptation plans
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/solutions/reports"
                        className="text-white hover:text-primary-light hover:underline"
                      >
                        Reports
                      </Link>
                    </li>
                  </ul>
                </nav>

                <nav aria-label="Company" className="min-w-0">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-white border-b-2 border-white pb-2 inline-block">
                    Company
                  </h2>
                  <ul className="mt-4 space-y-3 text-sm">
                    <li>
                      <Link
                        href="/about"
                        className="text-white hover:text-primary-light hover:underline"
                      >
                        About us
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/contact"
                        className="text-white hover:text-primary-light hover:underline"
                      >
                        Contact
                      </Link>
                    </li>

                    <li>
                      <Link
                        href="/privacy"
                        className="text-white hover:text-primary-light hover:underline"
                      >
                        Privacy policy
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/terms"
                        className="text-white hover:text-primary-light hover:underline"
                      >
                        Terms &amp; conditions
                      </Link>
                    </li>
                  </ul>
                </nav>

                <div className="min-w-0">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-white border-b-2 border-white pb-2 inline-block">
                    Get in touch
                  </h2>
                  <ul className="mt-4 space-y-3 text-sm">
                    <li className="flex items-start gap-2 text-white">
                      <MapPin
                        size={16}
                        className="mt-0.5 text-white shrink-0"
                        aria-hidden="true"
                      />
                      <span>
                        Colony One, Silk Street,
                        <br />
                        Manchester, M4 6LZ
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 bg-white/5 rounded-xl px-5 py-5">
            {TRADEMARKS.map((t) => (
              <li key={t.src} className="flex items-center">
                <Image
                  src={t.src}
                  alt={t.alt}
                  width={t.width}
                  height={t.height}
                  loading="lazy"
                  className="h-12 md:h-14 w-auto object-contain"
                />
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-xs text-white/85">
            <p>
              © {new Date().getFullYear()} AccessCheck — All rights reserved.
            </p>
          </div>
        </div>
      </section>
    </footer>
  );
}
