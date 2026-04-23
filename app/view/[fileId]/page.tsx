import { notFound } from 'next/navigation';
import Link from 'next/link';
import PDFViewerWrapper from '@/components/PDFViewerWrapper';
import { getPdfMeta } from '@/lib/googleDrive';
import { isPdfEnabled } from '@/lib/kv';

interface PageProps {
  params: Promise<{ fileId: string }>;
}

const VALID_FILE_ID = /^[a-zA-Z0-9_-]+$/;

export default async function ViewPage({ params }: PageProps) {
  const { fileId } = await params;

  if (!VALID_FILE_ID.test(fileId)) {
    notFound();
  }

  const enabled = await isPdfEnabled(fileId);
  if (!enabled) {
    notFound();
  }

  let fileName = 'Documento';
  try {
    const meta = await getPdfMeta(fileId);
    fileName = meta.name.replace(/\.pdf$/i, '');
  } catch {
    // Si falla la metadata igual mostramos el visor
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Breadcrumb / back */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-2 text-sm text-gray-500">
        <Link
          href="/"
          className="flex items-center gap-1 hover:text-blue-600 transition-colors"
          aria-label="Volver a documentos"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Documentos</span>
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-medium truncate">{fileName}</span>
      </div>

      {/* Visor PDF (carga en cliente) */}
      <div className="flex-1 overflow-hidden">
        <PDFViewerWrapper fileId={fileId} fileName={fileName} />
      </div>
    </div>
  );
}
