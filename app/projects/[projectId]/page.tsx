import { Workspace } from "@/components/workspace";
import { NotebookImport } from '@/components/notebook-import';
export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <><Workspace projectId={projectId} /><NotebookImport projectId={projectId} /></>;
}
