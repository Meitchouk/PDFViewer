'use client';

import { useState, useEffect } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { QrCode, Plus, Trash2, Download, Edit2, Link2, FileText } from 'lucide-react';
import QREditor from './QREditor';
import type { QRItem, PdfItem } from './AdminTabs';

interface QRTabProps {
  qrs: QRItem[];
  pdfs: PdfItem[];
  initialLinkedPdfId: string | null;
  initialEditQRId: string | null;
  onQRSaved: (qr: QRItem) => void;
  onQRDeleted: (qrId: string) => void;
}

export default function QRTab({
  qrs,
  pdfs,
  initialLinkedPdfId,
  initialEditQRId,
  onQRSaved,
  onQRDeleted,
}: QRTabProps) {
  // Modes: 'list' | 'create' | 'edit'
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [editQRId, setEditQRId] = useState<string | null>(null);
  const [linkedPdfId, setLinkedPdfId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // React to parent-triggered tab switch
  useEffect(() => {
    if (initialLinkedPdfId) {
      setLinkedPdfId(initialLinkedPdfId);
      setEditQRId(null);
      setMode('create');
    } else if (initialEditQRId) {
      setEditQRId(initialEditQRId);
      setLinkedPdfId(null);
      setMode('edit');
    }
  }, [initialLinkedPdfId, initialEditQRId]);

  function getPdfName(id: string | null) {
    if (!id) return null;
    return pdfs.find((p) => p.id === id)?.name.replace(/\.pdf$/i, '') ?? id;
  }

  function getPdfUrl(id: string | null) {
    if (!id) return null;
    return typeof window !== 'undefined'
      ? `${window.location.origin}/view/${id}`
      : `/view/${id}`;
  }

  async function handleDelete(qrId: string) {
    setDeletingId(qrId);
    try {
      const res = await fetch(`/api/admin/qr/${qrId}`, { method: 'DELETE' });
      if (res.ok) onQRDeleted(qrId);
    } finally {
      setDeletingId(null);
    }
  }

  function handleEdit(qr: QRItem) {
    setEditQRId(qr.id);
    setLinkedPdfId(qr.linkedPdfId);
    setMode('edit');
  }

  function handleSaved(qr: QRItem) {
    onQRSaved(qr);
    setMode('list');
    setEditQRId(null);
    setLinkedPdfId(null);
  }

  function handleCancel() {
    setMode('list');
    setEditQRId(null);
    setLinkedPdfId(null);
  }

  const existingQR = editQRId ? (qrs.find((q) => q.id === editQRId) ?? null) : null;

  // ── Editor view ──────────────────────────────
  if (mode === 'create' || mode === 'edit') {
    const pdfUrl = getPdfUrl(linkedPdfId ?? existingQR?.linkedPdfId ?? null);
    const pdfName = getPdfName(linkedPdfId ?? existingQR?.linkedPdfId ?? null);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">
              {mode === 'edit' ? 'Editar QR' : 'Nuevo QR'}
            </h3>
            {pdfName && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <FileText className="size-3" />
                Vinculado a: {pdfName}
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={handleCancel}>
            ← Volver
          </Button>
        </div>

        <QREditor
          linkedPdfId={linkedPdfId ?? existingQR?.linkedPdfId ?? null}
          initialPdfUrl={pdfUrl}
          existingQR={existingQR}
          onSaved={handleSaved}
          onCancel={handleCancel}
        />
      </div>
    );
  }

  // ── List view ────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {qrs.length === 0 ? 'No hay QRs creados aún.' : `${qrs.length} QR${qrs.length !== 1 ? 's' : ''} guardados`}
        </p>
        <Button size="sm" onClick={() => { setLinkedPdfId(null); setEditQRId(null); setMode('create'); }}>
          <Plus className="size-3.5" />
          Nuevo QR libre
        </Button>
      </div>

      {/* Empty state */}
      {qrs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-muted-foreground">
          <QrCode className="size-12 opacity-20" />
          <div className="text-center">
            <p>Crea tu primer QR desde aquí</p>
            <p className="text-xs mt-1">o usando el botón "Crear QR" en la fila de un PDF</p>
          </div>
          <Button onClick={() => { setLinkedPdfId(null); setMode('create'); }}>
            <Plus className="size-4" />
            Crear QR
          </Button>
        </div>
      )}

      {/* QR grid */}
      {qrs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {qrs.map((qr) => {
            const pdfName = getPdfName(qr.linkedPdfId);
            return (
              <Card key={qr.id} className="overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  {/* QR image */}
                  <div className="flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/qr-image/${qr.id}`}
                      alt={qr.title}
                      className="size-28 rounded-lg object-contain border border-border"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>

                  {/* Info */}
                  <div className="space-y-1 text-center">
                    <p className="font-semibold text-sm truncate">{qr.title || 'Sin título'}</p>
                    {qr.subtitle && <p className="text-xs text-muted-foreground truncate">{qr.subtitle}</p>}
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {pdfName ? (
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        <FileText className="size-2.5" />
                        {pdfName}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Link2 className="size-2.5" />
                        QR libre
                      </Badge>
                    )}
                  </div>

                  {/* URL preview */}
                  <p className="text-[10px] text-muted-foreground truncate text-center" title={qr.url}>
                    {qr.url}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEdit(qr)}
                    >
                      <Edit2 className="size-3.5" />
                      Editar
                    </Button>
                    <a
                      href={`/api/qr-image/${qr.id}?download=1`}
                      download={`${qr.title || 'qr'}.png`}
                      title="Descargar"
                      className={cn(buttonVariants({ variant: 'outline', size: 'icon-sm' }))}
                    >
                      <Download className="size-3.5" />
                    </a>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(qr.id)}
                      disabled={deletingId === qr.id}
                      className="text-destructive hover:text-destructive"
                      title="Eliminar"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
