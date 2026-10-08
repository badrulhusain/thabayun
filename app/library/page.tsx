import { Suspense } from 'react';
import { LibraryBrowser } from '@/components/library-browser';
export default function LibraryPage() { return <Suspense fallback={<p>Loading source preview...</p>}><LibraryBrowser /></Suspense>; }
