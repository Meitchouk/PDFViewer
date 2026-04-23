'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, Save, RefreshCw, ImagePlus, X } from 'lucide-react';
import type { QRItem } from './AdminTabs';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface QROptions {
  title: string;
  subtitle: string;
  url: string;
  primaryColor: string;
  secondaryColor: string;
  bgColor: string;
  dotsType: string;
  cornersType: string;
  logoDataUrl: string | null;
}

interface QREditorProps {
  linkedPdfId: string | null;
  initialPdfUrl: string | null;
  existingQR: QRItem | null;
  onSaved: (qr: QRItem) => void;
  onCancel: () => void;
}

const defaultOptions = (url: string): QROptions => ({
  title: '',
  subtitle: '',
  url,
  primaryColor: '#000000',
  secondaryColor: '#000000',
  bgColor: '#ffffff',
  dotsType: 'rounded',
  cornersType: 'square',
  logoDataUrl: null,
});

const DOT_TYPES = [
  { value: 'square', label: 'Cuadrado' },
  { value: 'rounded', label: 'Redondeado' },
  { value: 'dots', label: 'Puntos' },
  { value: 'classy', label: 'Classy' },
  { value: 'classy-rounded', label: 'Classy redondeado' },
  { value: 'extra-rounded', label: 'Extra redondeado' },
];

const CORNER_TYPES = [
  { value: 'square', label: 'Cuadrado' },
  { value: 'extra-rounded', label: 'Redondeado' },
  { value: 'dot', label: 'Punto' },
];

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function QREditor({ linkedPdfId, initialPdfUrl, existingQR, onSaved, onCancel }: QREditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qrRef = useRef<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [opts, setOpts] = useState<QROptions>(() => {
    if (existingQR) {
      return {
        title: existingQR.title,
        subtitle: existingQR.subtitle,
        url: existingQR.url,
        primaryColor: existingQR.primaryColor,
        secondaryColor: existingQR.secondaryColor,
        bgColor: existingQR.bgColor,
        dotsType: existingQR.dotsType,
        cornersType: existingQR.cornersType,
        logoDataUrl: existingQR.logoUrl,
      };
    }
    return defaultOptions(initialPdfUrl ?? '');
  });

  // Build QR config
  const buildConfig = useCallback((o: QROptions) => ({
    width: 280,
    height: 280,
    type: 'canvas' as const,
    data: o.url || 'https://example.com',
    image: o.logoDataUrl ?? undefined,
    dotsOptions: { color: o.primaryColor, type: o.dotsType as never },
    backgroundOptions: { color: o.bgColor },
    cornersSquareOptions: { color: o.primaryColor, type: o.cornersType as never },
    cornersDotOptions: { color: o.secondaryColor },
    imageOptions: { crossOrigin: 'anonymous', margin: 8, imageSize: 0.35 },
    qrOptions: { errorCorrectionLevel: 'M' as const },
  }), []);

  // Init QR instance
  useEffect(() => {
    let mounted = true;
    import('qr-code-styling').then(({ default: QRCodeStyling }) => {
      if (!mounted || !containerRef.current) return;
      containerRef.current.innerHTML = '';
      const instance = new QRCodeStyling(buildConfig(opts));
      instance.append(containerRef.current);
      qrRef.current = instance;
    });
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update QR when options change
  useEffect(() => {
    if (!qrRef.current) return;
    qrRef.current.update(buildConfig(opts));
  }, [opts, buildConfig]);

  function set<K extends keyof QROptions>(key: K, value: QROptions[K]) {
    setOpts((prev) => ({ ...prev, [key]: value }));
  }

  // Download
  async function handleDownload() {
    if (!qrRef.current) return;
    const slug = (opts.title || 'qr').replace(/[^a-z0-9]/gi, '-').toLowerCase();
    await qrRef.current.download({ name: slug, extension: 'png' });
  }

  // Logo upload
  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set('logoDataUrl', reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  // Save to Vercel Blob
  async function handleSave() {
    if (!opts.url.trim()) { setSaveError('El contenido/URL es obligatorio'); return; }
    if (!qrRef.current) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const rawBlob: Blob | undefined = await qrRef.current.getRawData('png');
      if (!rawBlob) throw new Error('No se pudo generar la imagen');

      const fd = new FormData();
      fd.append('file', new File([rawBlob], 'qr.png', { type: 'image/png' }));
      fd.append('meta', JSON.stringify({
        title: opts.title || 'Sin título',
        subtitle: opts.subtitle,
        url: opts.url,
        linkedPdfId: linkedPdfId ?? existingQR?.linkedPdfId ?? null,
        primaryColor: opts.primaryColor,
        secondaryColor: opts.secondaryColor,
        bgColor: opts.bgColor,
        dotsType: opts.dotsType,
        cornersType: opts.cornersType,
        logoUrl: opts.logoDataUrl,
      }));

      const res = await fetch('/api/admin/qr', { method: 'POST', body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Error al guardar');
      }
      const saved = await res.json();
      onSaved(saved as QRItem);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* ── Left: Preview ── */}
      <div className="flex flex-col items-center gap-4 lg:w-80 shrink-0">
        <div className="rounded-xl border border-border p-4 bg-card shadow-sm w-full flex flex-col items-center gap-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vista previa</p>
          <div
            ref={containerRef}
            className="rounded-lg overflow-hidden"
            style={{ width: 280, height: 280 }}
          />
          {(opts.title || opts.subtitle) && (
            <div className="text-center">
              {opts.title && <p className="font-semibold text-sm text-foreground">{opts.title}</p>}
              {opts.subtitle && <p className="text-xs text-muted-foreground">{opts.subtitle}</p>}
            </div>
          )}
        </div>
        <div className="flex gap-2 w-full">
          <Button variant="outline" className="flex-1" onClick={handleDownload}>
            <Download className="size-4" />
            Descargar
          </Button>
        </div>
      </div>

      {/* ── Right: Options ── */}
      <div className="flex-1 space-y-5">
        {/* Content/URL */}
        <div className="space-y-1.5">
          <Label htmlFor="qr-url">Contenido / URL <span className="text-destructive">*</span></Label>
          <Textarea
            id="qr-url"
            placeholder="https://mi-sitio.com/doc o texto libre"
            value={opts.url}
            onChange={(e) => set('url', e.target.value)}
            rows={2}
            className="resize-none"
          />
        </div>

        {/* Title / Subtitle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="qr-title">Título</Label>
            <Input
              id="qr-title"
              placeholder="Ej. Catálogo 2026"
              value={opts.title}
              onChange={(e) => set('title', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qr-subtitle">Subtítulo</Label>
            <Input
              id="qr-subtitle"
              placeholder="Opcional"
              value={opts.subtitle}
              onChange={(e) => set('subtitle', e.target.value)}
            />
          </div>
        </div>

        <Separator />

        {/* Colors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="qr-primary">Color principal</Label>
            <div className="flex items-center gap-2">
              <input
                id="qr-primary"
                type="color"
                value={opts.primaryColor}
                onChange={(e) => set('primaryColor', e.target.value)}
                className="size-8 rounded cursor-pointer border border-border p-0.5 bg-transparent"
              />
              <Input
                value={opts.primaryColor}
                onChange={(e) => set('primaryColor', e.target.value)}
                className="font-mono text-xs"
                maxLength={7}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qr-secondary">Color secundario</Label>
            <div className="flex items-center gap-2">
              <input
                id="qr-secondary"
                type="color"
                value={opts.secondaryColor}
                onChange={(e) => set('secondaryColor', e.target.value)}
                className="size-8 rounded cursor-pointer border border-border p-0.5 bg-transparent"
              />
              <Input
                value={opts.secondaryColor}
                onChange={(e) => set('secondaryColor', e.target.value)}
                className="font-mono text-xs"
                maxLength={7}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qr-bg">Fondo</Label>
            <div className="flex items-center gap-2">
              <input
                id="qr-bg"
                type="color"
                value={opts.bgColor}
                onChange={(e) => set('bgColor', e.target.value)}
                className="size-8 rounded cursor-pointer border border-border p-0.5 bg-transparent"
              />
              <Input
                value={opts.bgColor}
                onChange={(e) => set('bgColor', e.target.value)}
                className="font-mono text-xs"
                maxLength={7}
              />
            </div>
          </div>
        </div>

        {/* Shapes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Estilo de puntos</Label>
            <Select value={opts.dotsType} onValueChange={(v) => set('dotsType', v ?? '')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Estilo de esquinas</Label>
            <Select value={opts.cornersType} onValueChange={(v) => set('cornersType', v ?? '')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CORNER_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Logo */}
        <div className="space-y-1.5">
          <Label>Logo / imagen central</Label>
          <div className="flex items-center gap-2">
            <label
              htmlFor="qr-logo-input"
              className="flex items-center gap-2 text-sm cursor-pointer border border-border rounded-lg px-3 py-2 hover:bg-muted transition-colors"
            >
              <ImagePlus className="size-4 text-muted-foreground" />
              {opts.logoDataUrl ? 'Cambiar imagen' : 'Subir logo (PNG/SVG)'}
            </label>
            <input
              id="qr-logo-input"
              type="file"
              accept="image/png,image/svg+xml,image/jpeg,image/webp"
              onChange={handleLogoChange}
              className="sr-only"
            />
            {opts.logoDataUrl && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => set('logoDataUrl', null)}
                title="Quitar logo"
              >
                <X className="size-4" />
              </Button>
            )}
            {opts.logoDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={opts.logoDataUrl} alt="Logo" className="size-8 object-contain rounded border border-border" />
            )}
          </div>
        </div>

        <Separator />

        {/* Save / Cancel */}
        {saveError && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            {saveError}
          </p>
        )}
        <div className="flex gap-2 pt-1">
          <Button onClick={handleSave} disabled={isSaving} className="flex-1 sm:flex-none">
            {isSaving ? <RefreshCw className="size-4 animate-spin" /> : <Save className="size-4" />}
            {isSaving ? 'Guardando…' : 'Guardar QR'}
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
