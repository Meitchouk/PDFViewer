'use client';

import { useState, useRef, DragEvent } from 'react';

interface UploadedFile {
  id: string;
  name: string;
  size: string;
  modifiedTime: string;
  alias?: string;
}

interface UploadButtonProps {
  onUploadComplete: (file: UploadedFile) => void;
}

export default function UploadButton({ onUploadComplete }: UploadButtonProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File) {
    if (file.type !== 'application/pdf') {
      setError('Solo se permiten archivos PDF');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('El archivo supera el límite de 50 MB');
      return;
    }

    setError(null);
    setUploading(true);
    setProgress(`Subiendo "${file.name}"...`);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? 'Error desconocido');
      }

      setProgress(null);
      onUploadComplete({ ...data, enabled: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir el archivo');
      setProgress(null);
    } finally {
      setUploading(false);
      // Limpiar input para permitir subir el mismo archivo de nuevo
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  return (
    <div className="space-y-3">
      {/* Zona de drop */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-blue-400 bg-blue-50'
            : uploading
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : 'border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-blue-600 font-medium">{progress}</p>
            <p className="text-xs text-gray-400">Esto puede tardar unos segundos...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">
                {isDragging ? 'Suelta el PDF aquí' : 'Sube un PDF'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Arrastra y suelta o haz clic · Máx. 50 MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}
    </div>
  );
}
