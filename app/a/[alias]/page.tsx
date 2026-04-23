import { notFound, redirect } from 'next/navigation';
import { getFileIdByAlias, isPdfEnabled } from '@/lib/kv';

interface PageProps {
  params: Promise<{ alias: string }>;
}

// Alias válido: letras minúsculas, números, guiones (2-60 caracteres)
const VALID_ALIAS = /^[a-z0-9][a-z0-9-]{0,58}[a-z0-9]$|^[a-z0-9]{2}$/;

export default async function AliasPage({ params }: PageProps) {
  const { alias } = await params;

  if (!VALID_ALIAS.test(alias)) {
    notFound();
  }

  const fileId = await getFileIdByAlias(alias);
  if (!fileId) {
    notFound();
  }

  const enabled = await isPdfEnabled(fileId);
  if (!enabled) {
    notFound();
  }

  redirect(`/view/${fileId}`);
}
