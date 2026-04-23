'use client';

import { useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import {
  FileText,
  MoreHorizontal,
  Eye,
  EyeOff,
  Download,
  QrCode,
  RefreshCw,
  AlertTriangle,
  Ban,
  Upload,
} from 'lucide-react';
import UploadButton from './UploadButton';
import QRTab from './QRTab';
import PDFThumbnail from '@/components/PDFThumbnailWrapper';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface PdfItem {
  id: string;
  name: string;
  size: string;
  modifiedTime: string;
  enabled: boolean;
  status?: 'ok' | 'invalid_type' | 'too_large';
}

export interface QRItem {
  id: string;
  title: string;
  subtitle: string;
  url: string;
  blobUrl: string;
  linkedPdfId: string | null;
  primaryColor: string;
  secondaryColor: string;
  bgColor: string;
  dotsType: string;
  cornersType: string;
  logoUrl: string | null;
  createdAt: string;
}

interface AdminTabsProps {
  initialPdfs: PdfItem[];
  initialQRs: QRItem[];
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function formatSize(bytes: string): string {
  const n = parseInt(bytes, 10);
  if (isNaN(n) || n === 0) return '—';
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

// ──────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────

export default function AdminTabs({ initialPdfs, initialQRs }: AdminTabsProps) {
  const router = useRouter();
  const [pdfs, setPdfs] = useState<PdfItem[]>(initialPdfs);
  const [qrs, setQRs] = useState<QRItem[]>(initialQRs);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeQRPdfId, setActiveQRPdfId] = useState<string | null>(null);
  const [activeQRId, setActiveQRId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('docs');

  const showSuccess = useCallback((msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  }, []);

  // ── Sync ────────────────────────────────────
  async function handleSync() {
    setIsSyncing(true);
    router.refresh();
    setTimeout(() => setIsSyncing(false), 1500);
  }

  // ── Toggle visibility ────────────────────────
  async function handleToggle(fileId: string) {
    if ((pdfs.find(p => p.id === fileId)?.status ?? 'ok') !== 'ok') return;
    setTogglingId(fileId);
    setError(null);
    setPdfs((prev) => prev.map((p) => p.id === fileId ? { ...p, enabled: !p.enabled } : p));

    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/pdfs/${fileId}/toggle`, { method: 'POST' });
        if (!res.ok) throw new Error('Error del servidor');
        const data = await res.json();
        setPdfs((prev) => prev.map((p) => p.id === fileId ? { ...p, enabled: data.enabled } : p));
      } catch {
        setPdfs((prev) => prev.map((p) => p.id === fileId ? { ...p, enabled: !p.enabled } : p));
        setError('No se pudo actualizar. Intenta de nuevo.');
      } finally {
        setTogglingId(null);
      }
    });
  }

  // ── Upload ───────────────────────────────────
  function handleUploadComplete(newFile: { id: string; name: string; size: string; modifiedTime: string }) {
    const newPdf: PdfItem = { ...newFile, enabled: true, status: 'ok' };
    setPdfs((prev) => {
      if (prev.some((p) => p.id === newPdf.id)) return prev;
      return [newPdf, ...prev].sort((a, b) => a.name.localeCompare(b.name));
    });
    showSuccess(`"${newFile.name}" subido correctamente`);
  }

  // ── Open QR editor ───────────────────────────
  function openQRForPdf(pdfId: string) {
    setActiveQRPdfId(pdfId);
    setActiveQRId(null);
    setActiveTab('qr');
  }
  function openQREditor(qrId: string) {
    setActiveQRId(qrId);
    setActiveQRPdfId(null);
    setActiveTab('qr');
  }
  function openNewQR() {
    setActiveQRPdfId(null);
    setActiveQRId(null);
    setActiveTab('qr');
  }

  // ── QR saved callback ────────────────────────
  function handleQRSaved(qr: QRItem) {
    setQRs((prev) => {
      const idx = prev.findIndex((q) => q.id === qr.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = qr;
        return next;
      }
      return [qr, ...prev];
    });
    showSuccess('QR guardado correctamente');
    setActiveQRPdfId(null);
    setActiveQRId(null);
  }

  function handleQRDeleted(qrId: string) {
    setQRs((prev) => prev.filter((q) => q.id !== qrId));
    showSuccess('QR eliminado');
  }

  // ── Stats ────────────────────────────────────
  const validPdfs = pdfs.filter((p) => !p.status || p.status === 'ok');
  const blockedPdfs = pdfs.filter((p) => p.status && p.status !== 'ok');
  const visibleCount = validPdfs.filter((p) => p.enabled).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleSync} disabled={isSyncing}>
            <RefreshCw className={`size-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            Sincronizar Drive
          </Button>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded-md px-2 py-1">
            <FileText className="size-3" />
            Solo PDF · Máx. 50 MB
          </div>
        </div>
        <Button size="sm" onClick={openNewQR}>
          <QrCode className="size-3.5" />
          Crear QR
        </Button>
      </div>

      {/* Toasts */}
      {successMsg && (
        <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900 rounded-lg px-3 py-2">
          <span className="size-2 rounded-full bg-green-500 shrink-0" />
          {successMsg}
        </div>
      )}
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="docs" className="flex-1 sm:flex-none gap-1.5">
            <FileText className="size-3.5" />
            Documentos
            {blockedPdfs.length > 0 && (
              <Badge variant="destructive" className="ml-1 text-[10px] h-4 px-1">
                {blockedPdfs.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="qr" className="flex-1 sm:flex-none gap-1.5">
            <QrCode className="size-3.5" />
            QR
            {qrs.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">
                {qrs.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Documents tab ── */}
        <TabsContent value="docs" className="mt-4 space-y-4">
          {/* Upload zone */}
          <UploadButton onUploadComplete={handleUploadComplete} />

          {/* Summary */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground px-1">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-green-500" />
              {visibleCount} visibles
            </span>
            <span>·</span>
            <span>{validPdfs.length - visibleCount} ocultos</span>
            <span>·</span>
            <span>{validPdfs.length} válidos</span>
            {blockedPdfs.length > 0 && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="size-3" />
                  {blockedPdfs.length} bloqueados
                </span>
              </>
            )}
          </div>

          {/* Table */}
          {pdfs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Upload className="size-10 opacity-20" />
              <p>No hay archivos en la carpeta de Drive.</p>
              <p className="text-xs">Sube PDFs usando el botón de arriba.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Nombre</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground hidden sm:table-cell">Tamaño</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground hidden md:table-cell">Fecha</th>
                    <th className="px-4 py-2.5 text-center font-medium text-muted-foreground w-20">Estado</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground w-16">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pdfs.map((pdf) => {
                    const isBlocked = pdf.status && pdf.status !== 'ok';
                    return (
                      <tr key={pdf.id} className={`transition-colors ${isBlocked ? 'bg-muted/30' : pdf.enabled ? 'bg-background' : 'bg-muted/20'}`}>
                        {/* Name */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Miniatura */}
                            {isBlocked ? (
                              <div className="shrink-0 w-8 h-11 rounded bg-muted flex items-center justify-center">
                                <Ban className="size-4 text-muted-foreground/40" />
                              </div>
                            ) : (
                              <div className={`shrink-0 rounded overflow-hidden shadow-sm ring-1 ring-black/10 transition-opacity ${pdf.enabled ? 'opacity-100' : 'opacity-40'}`}>
                                <PDFThumbnail fileId={pdf.id} width={32} />
                              </div>
                            )}
                            <span
                              className={`truncate max-w-35 sm:max-w-xs font-medium ${isBlocked ? 'text-muted-foreground line-through' : pdf.enabled ? 'text-foreground' : 'text-muted-foreground'}`}
                              title={pdf.name}
                            >
                              {pdf.name}
                            </span>
                          </div>
                        </td>
                        {/* Size */}
                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                          {formatSize(pdf.size)}
                        </td>
                        {/* Date */}
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                          {formatDate(pdf.modifiedTime)}
                        </td>
                        {/* Status */}
                        <td className="px-4 py-3 text-center">
                          {isBlocked ? (
                            <Badge variant="destructive" className="text-[10px]">
                              {pdf.status === 'invalid_type' ? 'Tipo inválido' : 'Muy grande'}
                            </Badge>
                          ) : pdf.enabled ? (
                            <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800">
                              Visible
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              Oculto
                            </Badge>
                          )}
                        </td>
                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          {isBlocked ? (
                            <span className="text-xs text-muted-foreground/50">—</span>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <Switch
                                checked={pdf.enabled}
                                onCheckedChange={() => handleToggle(pdf.id)}
                                disabled={togglingId === pdf.id || isPending}
                                aria-label={`${pdf.enabled ? 'Ocultar' : 'Mostrar'} ${pdf.name}`}
                              />
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
                                  aria-label="Más acciones"
                                >
                                  <MoreHorizontal className="size-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44">
                                  <DropdownMenuItem render={<a href={`/view/${pdf.id}`} target="_blank" rel="noopener noreferrer" />}>
                                    <Eye className="size-4" />
                                    Vista previa
                                  </DropdownMenuItem>
                                  <DropdownMenuItem render={<a href={`/api/pdf/${pdf.id}?download=1`} download />}>
                                    <Download className="size-4" />
                                    Descargar
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => openQRForPdf(pdf.id)}>
                                    <QrCode className="size-4" />
                                    Crear QR
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleToggle(pdf.id)}
                                    className={pdf.enabled ? 'text-destructive focus:text-destructive' : ''}
                                  >
                                    {pdf.enabled ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                    {pdf.enabled ? 'Ocultar' : 'Mostrar'}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ── QR tab ── */}
        <TabsContent value="qr" className="mt-4">
          <QRTab
            qrs={qrs}
            pdfs={validPdfs}
            initialLinkedPdfId={activeQRPdfId}
            initialEditQRId={activeQRId}
            onQRSaved={handleQRSaved}
            onQRDeleted={handleQRDeleted}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
