import { DriveFile } from '@/lib/googleDrive';
import { ModeToggle } from '@/components/ModeToggle';
import PublicPDFList from '@/components/PublicPDFList';

async function getPublicPdfs(): Promise<DriveFile[]> {
  try {
    const { listPdfsFromDrive } = await import('@/lib/googleDrive');
    const { getEnabledMap, listBlobFiles } = await import('@/lib/kv');

    const [driveFiles, blobFiles] = await Promise.all([
      listPdfsFromDrive(),
      listBlobFiles(),
    ]);

    const allFiles: DriveFile[] = [
      ...driveFiles,
      ...blobFiles.map((b) => ({
        id: b.id,
        name: b.name,
        size: b.size,
        modifiedTime: b.uploadedAt,
      })),
    ];

    const enabledMap = await getEnabledMap(allFiles.map((f) => f.id));
    return allFiles.filter((f) => enabledMap[f.id]);
  } catch {
    return [];
  }
}

export const revalidate = 300;

export default async function HomePage() {
  const pdfs = await getPublicPdfs();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border px-4 py-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Documentos</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {pdfs.length > 0
                ? `${pdfs.length} documento${pdfs.length !== 1 ? 's' : ''} disponible${pdfs.length !== 1 ? 's' : ''}`
                : 'No hay documentos disponibles'}
            </p>
          </div>
          <ModeToggle />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 sm:px-6">
        {pdfs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
            <svg className="size-16 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div className="text-center">
              <p className="text-lg">No hay documentos disponibles</p>
              <p className="text-sm mt-1 opacity-70">Vuelve pronto</p>
            </div>
          </div>
        ) : (
          <PublicPDFList pdfs={pdfs} />
        )}
      </main>
    </div>
  );
}
