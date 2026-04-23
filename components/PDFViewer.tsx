'use client';

import { useState, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// ⚠️ El workerSrc DEBE configurarse en este mismo archivo (App Router requirement)
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface PDFViewerProps {
  fileId: string;
  fileName: string;
}

export default function PDFViewer({ fileId, fileName }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Medir el contenedor para que el PDF ocupe exactamente el ancho disponible
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      setContainerWidth(node.clientWidth);
    }
  }, []);

  // Re-medir en resize
  useEffect(() => {
    const handleResize = () => {
      const el = document.getElementById('pdf-container');
      if (el) setContainerWidth(el.clientWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
  }

  function onDocumentLoadError(err: Error) {
    console.error('PDF load error:', err);
    setError('No se pudo cargar el PDF. Intenta de nuevo.');
    setLoading(false);
  }

  const pdfUrl = `/api/pdf/${fileId}`;

  return (
    <div className="flex flex-col h-full">
      {/* Barra de navegación */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between shadow-sm">
        <span className="text-sm font-medium text-gray-700 truncate max-w-[50%]" title={fileName}>
          {fileName}
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Página anterior"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm text-gray-600 min-w-20 text-center">
            {loading ? '...' : `${pageNumber} / ${numPages}`}
          </span>
          <button
            onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
            disabled={pageNumber >= numPages}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Página siguiente"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Área del PDF */}
      <div
        id="pdf-container"
        ref={containerRef}
        className="flex-1 overflow-auto bg-gray-100 flex flex-col items-center"
      >
        {error ? (
          <div className="flex items-center justify-center h-full p-8">
            <div className="text-center">
              <p className="text-red-500 font-medium">{error}</p>
              <button
                onClick={() => { setError(null); setLoading(true); }}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
              >
                Reintentar
              </button>
            </div>
          </div>
        ) : (
          <TransformWrapper
            initialScale={1}
            minScale={0.5}
            maxScale={4}
            centerOnInit
            panning={{ disabled: false }}
          >
            <TransformComponent
              wrapperStyle={{ width: '100%', display: 'flex', justifyContent: 'center' }}
              contentStyle={{ display: 'flex', justifyContent: 'center' }}
            >
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={
                  <div className="flex items-center justify-center p-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm text-gray-500">Cargando PDF...</span>
                    </div>
                  </div>
                }
              >
                <Page
                  pageNumber={pageNumber}
                  width={containerWidth > 0 ? containerWidth : undefined}
                  // Limitar a 2x para evitar canvas gigantes en móviles Retina
                  devicePixelRatio={typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio) : 1}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  className="shadow-lg"
                />
              </Document>
            </TransformComponent>
          </TransformWrapper>
        )}
      </div>

      {/* Indicador de carga */}
      {loading && !error && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-white rounded-xl p-6 shadow-xl flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-600">Cargando...</span>
          </div>
        </div>
      )}
    </div>
  );
}
