'use client';

import { Printer } from 'lucide-react';

interface PrintButtonProps {
  pdfUrl: string;
}

export default function PrintButton({ pdfUrl }: PrintButtonProps) {
  function handlePrint() {
    // Crear un iframe oculto que carga el PDF y lanza la impresión nativa del navegador
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;visibility:hidden;width:1px;height:1px;top:-200px;left:-200px;';
    iframe.src = pdfUrl;
    document.body.appendChild(iframe);

    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        // Fallback: abrir en nueva pestaña para que el usuario imprima desde ahí
        window.open(pdfUrl, '_blank');
      }
      // Limpiar el iframe después de que el diálogo de impresión haya tenido tiempo de abrirse
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 120_000);
    };
  }

  return (
    <button
      onClick={handlePrint}
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded hover:bg-muted"
      title="Imprimir PDF"
    >
      <Printer className="size-4" />
      <span className="hidden sm:inline">Imprimir</span>
    </button>
  );
}
