'use client';

import dynamic from 'next/dynamic';

// ⚠️ pdf.js no es compatible con SSR — debe cargarse solo en el cliente
const PDFViewerWrapper = dynamic(() => import('./PDFViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-500">Cargando visor...</span>
      </div>
    </div>
  ),
});

export default PDFViewerWrapper;
