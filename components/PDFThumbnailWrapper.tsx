'use client';

import dynamic from 'next/dynamic';

const PDFThumbnail = dynamic(() => import('./PDFThumbnail'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-muted">
      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export default PDFThumbnail;
