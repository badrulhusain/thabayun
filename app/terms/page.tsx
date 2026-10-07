import type { Metadata } from 'next';
import Link from 'next/link';
import { operator, supportEmail } from '@/lib/site';
export const metadata: Metadata = { title: 'Terms of service | Tabayyun AI' };
export default function TermsPage() {
  return <article className="legal-page">
    <h1>Terms of service</h1><p>Last updated: 7 October 2026</p>
    <p>These terms apply to your use of Tabayyun AI, operated by {operator}. By using the service you agree to these terms and acknowledge our <Link href="/privacy">privacy policy</Link>. You must be at least 18 years old.</p>
    <h2>Research and source limitations</h2>
    <p>Tabayyun AI is a research aid. Automated extraction, wording comparison, OCR, and AI analysis can be incomplete or wrong. Check the original source, edition, translation, and surrounding context. Results are not religious rulings or a substitute for qualified scholarly advice. A missing source match does not establish fabrication or falsity.</p>
    <h2>Your material and permitted use</h2>
    <p>You retain rights in your submitted material. You authorize us and our service providers to process it only as needed for the features you request, storage, and service protection described in the privacy policy. Submit material you are entitled to process. Do not upload unlawful content, expose another person’s private data without authorization, abuse the service, bypass request budgets, or attempt unauthorized access.</p>
    <h2>Third-party content and integrations</h2>
    <p>Quran text, translations, tafsir, hadith, and other source material remain subject to their owners’ licenses and applicable provider terms. Preserve source attribution and context. Access through this app does not grant a right to resell or redistribute provider content or raw API data.</p>
    <p>Tabayyun AI is independent of Quran Foundation and does not imply its endorsement. The current application uses server-to-server Content API access and does not connect user Quran.com accounts. Any future account connection will require a separate authorization flow explaining its data access and revocation options.</p>
    <h2>Availability and saved research</h2>
    <p>Provider access, source coverage, and request budgets may limit features. Browser research is tied to the device, browser profile, and site origin; export important work. The service is provided as available, without a guarantee of uninterrupted access or accurate automated findings, subject to rights that cannot be excluded by applicable law.</p>
    <h2>Stopping use and changes</h2>
    <p>You can stop using the service and <Link href="/data">delete your session’s data</Link> at any time. We may restrict access for abuse or security reasons. Updated terms are published here with a new date and apply to subsequent use, subject to applicable law.</p>
    <h2>Contact</h2>
    {supportEmail ? <p>Questions: <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.</p> : <p>The operator has not yet published a support address. This deployment is not ready for public use.</p>}
  </article>;
}
