import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";
import { siteOrigin } from '@/lib/site';
export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: "Tabayyun AI — Verify before you share",
  description: "Turn a quotation or screenshot into a reviewable, source-backed research trail.",
  icons: { icon: '/logo.svg', apple: '/logo.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <a className="skip" href="#main">Skip to content</a>
        <header className="site-header">
          <Link className="brand" href="/" aria-label="Tabayyun AI home">
            <Image src="/logo.svg" width={40} height={40} alt="" priority />
            <span className="brand-copy">
              <span>Tabayyun AI</span>
              <small>Verify before you share</small>
            </span>
          </Link>
          <nav className="main-nav" aria-label="Main navigation">
            <Link href="/">Verify</Link>
            <Link href="/projects">My inquiries</Link>
            <Link href="/research">Research hub</Link>
            <Link href="/sources">Sources</Link>
          </nav>
          <Link className="account-link" href="/account">Account</Link>
        </header>
        <main id="main">{children}</main>
        <footer>
          <div>
            <strong>Tabayyun AI</strong>
            <span>Evidence first. Conclusions second.</span>
          </div>
          <nav className="footer-links" aria-label="Legal and privacy">
            <Link href="/library">Library</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/data">My data</Link>
          </nav>
        </footer>
      </body>
    </html>
  );
}
