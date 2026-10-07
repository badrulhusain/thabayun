import type { Metadata } from 'next';
import Link from 'next/link';
import { operator, supportEmail, postalAddress } from '@/lib/site';
export const metadata: Metadata = { title: 'Privacy policy | Tabayyun AI' };

export default function PrivacyPage() {
  return <article className="legal-page">
    <h1>Privacy policy</h1><p>Last updated: 7 October 2026</p>
    <p>Tabayyun AI is operated by {operator}. It helps you investigate quotations and organize source evidence. It is an independent application, not an official Quran Foundation product.</p>
    <h2>What we collect and why</h2>
    <p>Projects, notes, reviewed text, research history, and exports are stored in this browser’s IndexedDB so you can continue your work. The app has no user account or cross-device synchronization.</p>
    <p>When you request source retrieval, the server stores submitted and reviewed text, the selected claim and reference, retrieval attempts, evidence snapshots, and findings in MongoDB Atlas. These records support source verification and grounded analysis. When you request analysis, its result is also stored on the server.</p>
    <p>A random, HttpOnly ownership cookie identifies this browser’s server records for 30 days. It is an essential session cookie, not an advertising identifier. Request counters enforce service budgets. Vercel and our service providers may process operational data such as IP addresses and request metadata to deliver and protect the service.</p>
    <h2>External services and your choices</h2>
    <ul>
      <li>OCR.space receives your selected screenshot only when you request text extraction. This app does not store screenshot files on its server.</li>
      <li>Groq receives submitted text when you request automated claim extraction, or a selected claim and selected source passages when you request analysis. Project notes are not included in these model requests.</li>
      <li>Quran Foundation and Sunnah receive source reference lookups when their integrations are enabled. We use Quran Foundation’s Content API with server credentials; we do not connect your Quran.com account or access its profile, bookmarks, reading history, or private notes.</li>
      <li>MongoDB Atlas hosts server research records, and Vercel hosts the application. Their processing and retention are governed by the applicable provider agreements and policies.</li>
    </ul>
    <p>Research can reveal religious beliefs or other sensitive information. Submit only what is necessary and avoid personal information in quotations or screenshots. You can use pasted text and manual claims without requesting OCR or AI processing. We do not sell your research, build advertising profiles from it, or use it to train our own models. Third-party processing is subject to each provider’s terms.</p>
    <h2>Retention, access, correction, and deletion</h2>
    <p>Browser research remains until you delete it or clear site storage. Server research records currently remain until deletion is requested; the ownership cookie’s expiry does not delete them. Public source evidence is stored separately from personal research.</p>
    <p>Review, edit, and export local projects in Recent Inquiries. Visit <Link href="/data">Manage my data</Link> to delete server records associated with your current browser session and optionally erase local research. Deletion removes personal records from the active database before success is reported. Copies in provider backups or operational logs follow the configured provider retention schedule. Losing or clearing the ownership cookie prevents self-service access to older server records; contact us for help.</p>
    <h2>Security and international processing</h2>
    <p>Production uses HTTPS, server-only API secrets, a Secure HttpOnly session cookie, ownership checks, request size limits, and shared request budgets. Data may be processed outside your country by our hosting, database, OCR, and AI providers. No system can guarantee complete security.</p>
    <h2>Children and policy updates</h2>
    <p>The service is intended for adults aged 18 or older. We do not knowingly collect children’s personal information. Contact us if you believe a child has submitted personal data. Changes to this policy are published here with an updated date; review this page before submitting new sensitive material.</p>
    <h2>Contact</h2>
    {supportEmail ? <p>Privacy, security, access, and deletion questions: <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.</p> : <p>The operator has not yet published a contact address. This deployment is not ready for public use.</p>}
    {postalAddress && <p>Postal address: {postalAddress}</p>}
  </article>;
}
