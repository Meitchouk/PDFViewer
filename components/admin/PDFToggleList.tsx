'use client';

import { useState, useTransition } from 'react';
import UploadButton from './UploadButton';

interface PdfItem {
  id: string;
  name: string;
  size: string;
  modifiedTime: string;
  enabled: boolean;
}

interface PDFToggleListProps {
  initialPdfs: PdfItem[];
}

function formatSize(bytes: string): string {
  const n = parseInt(bytes, 10);
  if (isNaN(n)) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function PDFToggleList({ initialPdfs }: PDFToggleListProps) {
  const [pdfs, setPdfs] = useState<PdfItem[]>(initialPdfs);
  const [isPending, startTransition] = useTransition();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  function handleUploadComplete(newFile: { id: string; name: string; size: string; modifiedTime: string }) {
    const newPdf: PdfItem = { ...newFile, enabled: true };
    setPdfs((prev) => {
      // Evitar duplicados si Drive ya lo incluye
      if (prev.some((p) => p.id === newPdf.id)) return prev;
      return [newPdf, ...prev].sort((a, b) => a.name.localeCompare(b.name));
    });
    setUploadSuccess(`"${newFile.name}" subido correctamente`);
    setTimeout(() => setUploadSuccess(null), 5000);
  }

  async function handleToggle(fileId: string) {
    setTogglingId(fileId);
    setError(null);

    // Optimistic update
    setPdfs((prev) =>
      prev.map((p) => (p.id === fileId ? { ...p, enabled: !p.enabled } : p))
    );

    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/pdfs/${fileId}/toggle`, { method: 'POST' });
        if (!res.ok) throw new Error('Error del servidor');
        const data = await res.json();
        // Confirmar con el valor real del servidor
        setPdfs((prev) =>
          prev.map((p) => (p.id === fileId ? { ...p, enabled: data.enabled } : p))
        );
      } catch {
        // Revertir si falla
        setPdfs((prev) =>
          prev.map((p) => (p.id === fileId ? { ...p, enabled: !p.enabled } : p))
        );
        setError('No se pudo actualizar. Intenta de nuevo.');
      } finally {
        setTogglingId(null);
      }
    });
  }

  const enabledCount = pdfs.filter((p) => p.enabled).length;

  return (
    <div>
      {/* Zona de carga */}
      <div className="mb-5">
        <UploadButton onUploadComplete={handleUploadComplete} />
      </div>

      {/* Mensajes de estado */}
      {uploadSuccess && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {uploadSuccess}
        </div>
      )}

      {/* Resumen */}
      <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          {enabledCount} visibles
        </span>
        <span>·</span>
        <span>{pdfs.length - enabledCount} ocultos</span>
        <span>·</span>
        <span>{pdfs.length} total</span>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {pdfs.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>No hay PDFs en la carpeta de Drive.</p>
          <p className="text-xs mt-1">Sube archivos PDF a la carpeta configurada y recarga.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Nombre</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 hidden sm:table-cell">Tamaño</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 hidden md:table-cell">Modificado</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Visible</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pdfs.map((pdf) => (
                <tr
                  key={pdf.id}
                  className={`transition-colors ${pdf.enabled ? 'bg-white' : 'bg-gray-50'}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <svg className={`w-5 h-5 shrink-0 ${pdf.enabled ? 'text-red-500' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                      </svg>
                      <span className={`font-medium truncate max-w-50 sm:max-w-none ${pdf.enabled ? 'text-gray-800' : 'text-gray-400'}`} title={pdf.name}>
                        {pdf.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                    {formatSize(pdf.size)}
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                    {formatDate(pdf.modifiedTime)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleToggle(pdf.id)}
                      disabled={togglingId === pdf.id || isPending}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70 ${
                        pdf.enabled ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                      role="switch"
                      aria-checked={pdf.enabled}
                      aria-label={`${pdf.enabled ? 'Ocultar' : 'Mostrar'} ${pdf.name}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          pdf.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
