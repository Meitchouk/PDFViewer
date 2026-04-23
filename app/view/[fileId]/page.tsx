import { notFound } from 'next/navigation';
import Link from 'next/link';
import PDFViewerWrapper from '@/components/PDFViewerWrapper';
import PrintButton from '@/components/PrintButton';
import { getPdfMeta } from '@/lib/googleDrive';
import { isPdfEnabled, getBlobMeta } from '@/lib/kv';
import { ChevronLeft, Download } from 'lucide-react';

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
    if (fileId.startsWith('vb')) {
      const meta = await getBlobMeta(fileId);
      if (meta) fileName = meta.name.replace(/\.pdf$/i, '');
    } else {
      const meta = await getPdfMeta(fileId);
      fileName = meta.name.replace(/\.pdf$/i, '');
    }
  } catch {
    // Fallback to default name
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Sticky toolbar */}
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border px-3 py-2 flex items-center gap-2">
        {/* Back */}
        <Link
          href="/"
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors shrink-0 text-sm px-1 py-0.5 rounded hover:bg-muted"
          aria-label="Volver a documentos"
        >
          <ChevronLeft className="size-4" />
          <span className="hidden sm:inline">Documentos</span>
        </Link>

        <span className="text-muted-foreground/40 hidden sm:inline">·</span>

        {/* Title */}
        <span className="font-medium text-sm text-foreground truncate flex-1 min-w-0">
          {fileName}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <a
            href={`/api/pdf/${fileId}?download=1`}
            download
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded hover:bg-muted"
            title="Descargar PDF"
          >
            <Download className="size-4" />
            <span className="hidden sm:inline">Descargar</span>
          </a>
          <PrintButton pdfUrl={`/api/pdf/${fileId}`} />
        </div>
      </header>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-hidden">
        <PDFViewerWrapper fileId={fileId} fileName={fileName} />
      </div>
    </div>
  );
}

