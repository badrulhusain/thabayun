import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
export const metadata: Metadata = { title: "Tabayyun AI — Evidence & Citation Desk", description: "Investigate quotations, inspect original sources, and organize evidence." };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><a className="skip" href="#main">Skip to content</a><header className="site-header"><Link className="brand" href="/"><span className="brand-seal" aria-hidden="true">❧</span><span className="brand-copy">Tabayyun AI <span lang="ar" dir="rtl">تَبَيُّن</span><small>EDITORIAL EVIDENCE & CITATION DESK</small></span></Link><span className="header-index"><i /> Source-led research workspace</span><nav aria-label="Main navigation"><Link href="/">Investigate</Link><Link href="/projects">Recent Inquiries</Link><Link href="/sources">Source Corpora & Methodology</Link></nav></header><main id="main">{children}</main><footer><span>Tabayyun AI · Editorial Evidence & Citation Desk</span><span>Primary sources. Transparent limitations. Thoughtful research.</span></footer></body></html>;
}
