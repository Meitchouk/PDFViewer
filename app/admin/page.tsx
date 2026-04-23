import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import { listAllDriveFilesWithStatus } from '@/lib/googleDrive';
import { getEnabledMap, listBlobFiles, listQRs, getAliasMap } from '@/lib/kv';
import AdminTabs, { type PdfItem } from '@/components/admin/AdminTabs';
import LogoutButton from './LogoutButton';
import { ModeToggle } from '@/components/ModeToggle';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token || !(await verifyToken(token))) {
    redirect('/admin/login');
  }

  let pdfs: PdfItem[] = [];
  let fetchError: string | null = null;

  const [qrs] = await Promise.all([listQRs()]).catch(() => [[]]);

  try {
    const [driveFiles, blobFiles] = await Promise.all([
      listAllDriveFilesWithStatus(),
      listBlobFiles(),
    ]);

    const allFiles = [
      ...driveFiles.map((f) => ({
        id: f.id,
        name: f.name,
        size: f.size,
        modifiedTime: f.modifiedTime,
        status: f.status,
      })),
      ...blobFiles.map((b) => ({
        id: b.id,
        name: b.name,
        size: b.size,
        modifiedTime: b.uploadedAt,
        status: 'ok' as const,
      })),
    ];

    const validIds = allFiles.filter((f) => !f.status || f.status === 'ok').map((f) => f.id);
    const [enabledMap, aliasMap] = await Promise.all([
      getEnabledMap(validIds),
      getAliasMap(validIds),
    ]);

    pdfs = allFiles.map((f) => ({
      ...f,
      enabled: enabledMap[f.id] ?? true,
      alias: aliasMap[f.id],
    }));
  } catch (err) {
    console.error('[Admin] Error cargando PDFs:', err);
    fetchError = 'No se pudo conectar con Google Drive o la base de datos.';
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border px-4 py-3 sm:px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold leading-tight">Panel Admin</h1>
            <p className="text-xs text-muted-foreground">Gestión de documentos PDF</p>
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted"
            >
              <ExternalLink className="size-3.5" />
              <span className="hidden sm:inline">Ver sitio</span>
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6">
        {fetchError ? (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-sm text-destructive">
            <p className="font-medium mb-1">Error de configuración</p>
            <p>{fetchError}</p>
          </div>
        ) : (
          <AdminTabs initialPdfs={pdfs} initialQRs={qrs} />
        )}
      </div>
    </div>
  );
}

