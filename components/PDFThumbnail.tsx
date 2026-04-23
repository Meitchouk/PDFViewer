'use client';

import { useEffect, useRef, useState } from 'react';
import { pdfjs } from 'react-pdf';
import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

// El worker se puede haber configurado ya en PDFViewer, pero lo garantizamos aquí también
if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
}

interface PDFThumbnailProps {
  fileId: string;
  /** Ancho del canvas de salida (px). Alto se calcula proporcional. Por defecto 120 */
  width?: number;
  className?: string;
  /** Clases CSS adicionales para el wrapper externo */
  wrapperClassName?: string;
}

export default function PDFThumbnail({
  fileId,
  width = 120,
  className,
  wrapperClassName,
}: PDFThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<'loading' | 'done' | 'error'>('loading');
  const [aspectRatio, setAspectRatio] = useState(1.414); // A4 por defecto

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        setState('loading');

        // Cargar el worker config (puede que pdfjs no esté inicializado aún)
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString();

        const loadingTask = pdfjsLib.getDocument({
          url: `/api/pdf/${fileId}`,
          disableAutoFetch: true,
          disableStream: false,
        });
        const pdf = await loadingTask.promise;

        if (cancelled) return;

        const page = await pdf.getPage(1);
        if (cancelled) return;

        const viewport = page.getViewport({ scale: 1 });
        const ratio = viewport.height / viewport.width;
        setAspectRatio(ratio);

        const scale = width / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;

        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        await page.render({ canvasContext: ctx, canvas, viewport: scaledViewport }).promise;

        if (!cancelled) setState('done');
        pdf.destroy();
      } catch {
        if (!cancelled) setState('error');
      }
    }

    render();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId, width]);

  const height = Math.round(width * aspectRatio);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded bg-muted shrink-0',
        wrapperClassName
      )}
      style={{ width, height }}
    >
      {/* Canvas de la miniatura */}
      <canvas
        ref={canvasRef}
        className={cn(
          'w-full h-full object-contain transition-opacity duration-300',
          state === 'done' ? 'opacity-100' : 'opacity-0',
          className
        )}
      />

      {/* Placeholder mientras carga */}
      {state === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Fallback en error */}
      {state === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <FileText className="size-6 text-muted-foreground/40" />
        </div>
      )}
    </div>
  );
}
