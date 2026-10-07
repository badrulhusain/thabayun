import type { Metadata } from 'next';
import Link from 'next/link';
import DataControls from '@/components/data-controls';
export const metadata: Metadata = { title: 'Manage my data | Tabayyun AI' };
export default function DataPage() {
  return <article className="legal-page"><h1>Manage my data</h1>
    <p>Delete submitted text, claims, retrieval history, and findings and research projects, notes, comparisons and briefs associated with your signed-in account, or this browser’s guest session. Account credentials are retained. You can also erase all projects, materials, notes, and research stored locally.</p>
    <p>Export important work from <Link href="/projects">Recent Inquiries</Link> first. Stop pending OCR, extraction, retrieval, and analysis requests and close other Tabayyun tabs before deleting.</p>
    <p>Sign in to delete account research. If a guest ownership cookie has expired or was cleared, this session cannot identify those older guest records. See our <Link href="/privacy">privacy policy</Link> for contact information and retention details. Public source records, downloaded exports, and provider backups are separate from this deletion.</p>
    <DataControls />
  </article>;
}
