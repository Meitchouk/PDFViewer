'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, X } from 'lucide-react';
import PDFThumbnail from '@/components/PDFThumbnailWrapper';

interface PDF {
  id: string;
  name: string;
  size: string;
}

function formatSize(bytes: string): string {
  const n = parseInt(bytes, 10);
  if (isNaN(n) || n === 0) return '';
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PublicPDFList({ pdfs }: { pdfs: PDF[] }) {
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? pdfs.filter((p) => p.name.toLowerCase().includes(query.toLowerCase().trim()))
    : pdfs;

  return (
    <div className="space-y-5">
      {/* Search */}
      {pdfs.length > 3 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder="Buscar documento…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Limpiar búsqueda"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && query ? (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="size-10 mx-auto mb-3 opacity-20" />
          <p>No se encontraron resultados para &ldquo;{query}&rdquo;</p>
        </div>
      ) : (
        /* Gallery grid — 2 cols en móvil, 3 en sm, 4 en lg */
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {filtered.map((pdf) => (
            <li key={pdf.id}>
              <Link
                href={`/view/${pdf.id}`}
                className="group flex flex-col rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/40 hover:shadow-lg active:scale-[0.98] transition-all duration-150"
              >
                {/* Thumbnail area — aspect-ratio fijo tipo A4 */}
                <div className="relative w-full overflow-hidden bg-muted" style={{ aspectRatio: '1 / 1.414' }}>
                  <PDFThumbnail
                    fileId={pdf.id}
                    width={300}
                    className="absolute inset-0 w-full h-full object-cover"
                    wrapperClassName="absolute inset-0 w-full h-full rounded-none"
                  />
                  {/* Overlay sutil al hacer hover */}
                  <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors duration-150" />
                </div>

                {/* Info footer */}
                <div className="px-3 py-2.5">
                  <p
                    className="text-sm font-semibold text-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors"
                    title={pdf.name.replace(/\.pdf$/i, '')}
                  >
                    {pdf.name.replace(/\.pdf$/i, '')}
                  </p>
                  {pdf.size && (
                    <p className="text-[11px] text-muted-foreground mt-1">{formatSize(pdf.size)}</p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
