'use client';

import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface PDFViewerProps {
  fileId: string;
  fileName: string;
}

const ZOOM_STEP = 1.25;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;

export default function PDFViewer({ fileId }: PDFViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [zoom, setZoom] = useState(1); // 1 = ajustar al ancho disponible
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Medir el ancho del contenedor con ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w > 0) setContainerWidth(w);
    });
    ro.observe(containerRef.current);
    setContainerWidth(containerRef.current.clientWidth);
    return () => ro.disconnect();
  }, []);

  // A zoom=1 la página llena el ancho disponible (menos padding 48px)
  const pageWidth = containerWidth > 0
    ? Math.max(120, Math.floor((containerWidth - 48) * zoom))
    : undefined;

  const dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio) : 1;

  return (
    <div className="flex flex-col h-full">
      {/* Barra de zoom */}
      <div className="flex items-center justify-center gap-1.5 py-1.5 px-4 bg-background border-b border-border shrink-0">
        <button
          onClick={() => setZoom(z => Math.max(MIN_ZOOM, parseFloat((z / ZOOM_STEP).toFixed(4))))}
          disabled={zoom <= MIN_ZOOM}
          className="p-1.5 rounded hover:bg-muted disabled:opacity-40 transition-colors"
          title="Reducir zoom"
        >
          <ZoomOut className="size-4" />
        </button>

        <button
          onClick={() => setZoom(1)}
          className="text-xs tabular-nums min-w-14 text-center py-1 px-2 rounded hover:bg-muted transition-colors text-muted-foreground font-medium"
          title="Restablecer al ancho de pantalla"
        >
          {Math.round(zoom * 100)}%
        </button>

        <button
          onClick={() => setZoom(z => Math.min(MAX_ZOOM, parseFloat((z * ZOOM_STEP).toFixed(4))))}
          disabled={zoom >= MAX_ZOOM}
          className="p-1.5 rounded hover:bg-muted disabled:opacity-40 transition-colors"
          title="Aumentar zoom"
        >
          <ZoomIn className="size-4" />
        </button>

        <div className="w-px h-4 bg-border mx-1" />

        <button
          onClick={() => setZoom(1)}
          className={cn(
            'p-1.5 rounded transition-colors text-muted-foreground',
            zoom === 1 ? 'bg-muted' : 'hover:bg-muted'
          )}
          title="Ajustar al ancho de pantalla"
        >
          <Maximize2 className="size-3.5" />
        </button>

        {numPages > 0 && (
          <span className="ml-3 text-xs text-muted-foreground">
            {numPages} {numPages === 1 ? 'página' : 'páginas'}
          </span>
        )}
      </div>

      {/* Área de páginas — scroll vertical, centrado, libro */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-auto bg-muted/40"
      >
        {error ? (
          <div className="flex items-center justify-center h-full p-8">
            <div className="text-center">
              <p className="text-destructive font-medium mb-3">{error}</p>
              <button
                onClick={() => { setError(null); setLoading(true); }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors"
              >
                Reintentar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-5 py-6">
            <Document
              file={`/api/pdf/${fileId}`}
              onLoadSuccess={({ numPages }) => { setNumPages(numPages); setLoading(false); }}
              onLoadError={() => { setError('No se pudo cargar el PDF. Intenta de nuevo.'); setLoading(false); }}
              loading={null}
            >
              {numPages > 0 && Array.from({ length: numPages }, (_, i) => (
                <div
                  key={i + 1}
                  className="shadow-xl ring-1 ring-black/10 bg-white"
                >
                  <Page
                    pageNumber={i + 1}
                    width={pageWidth}
                    devicePixelRatio={dpr}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                </div>
              ))}
            </Document>
          </div>
        )}

        {/* Overlay de carga inicial */}
        {loading && !error && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center z-10 pointer-events-none">
            <div className="bg-background rounded-xl p-6 shadow-xl flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-muted-foreground">Cargando PDF...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
