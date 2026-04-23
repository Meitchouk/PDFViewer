import Link from 'next/link';
import { DriveFile } from '@/lib/googleDrive';

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

function formatSize(bytes: string): string {
  const n = parseInt(bytes, 10);
  if (isNaN(n)) return '';
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export const revalidate = 300;

export default async function HomePage() {
  const pdfs = await getPublicPdfs();

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-5 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">Documentos</h1>
          <p className="mt-1 text-sm text-gray-500">
            {pdfs.length > 0
              ? `${pdfs.length} documento${pdfs.length !== 1 ? 's' : ''} disponible${pdfs.length !== 1 ? 's' : ''}`
              : 'No hay documentos disponibles por el momento'}
          </p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6">
        {pdfs.length === 0 ? (
          <div className="text-center py-20">
            <svg className="w-16 h-16 mx-auto text-gray-200 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-400 text-lg">No hay documentos disponibles</p>
            <p className="text-gray-300 text-sm mt-1">Vuelve pronto</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {pdfs.map((pdf) => (
              <li key={pdf.id}>
                <Link
                  href={`/view/${pdf.id}`}
                  className="flex items-center gap-4 bg-white rounded-xl p-4 border border-gray-200 hover:border-blue-300 hover:shadow-md active:scale-[0.99] transition-all duration-150 group"
                >
                  <div className="shrink-0 w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center group-hover:bg-red-100 transition-colors">
                    <svg className="w-7 h-7 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate group-hover:text-blue-700 transition-colors">
                      {pdf.name.replace(/\.pdf$/i, '')}
                    </p>
                    {pdf.size && (
                      <p className="text-xs text-gray-400 mt-0.5">{formatSize(pdf.size)}</p>
                    )}
                  </div>
                  <svg className="w-5 h-5 text-gray-300 group-hover:text-blue-400 shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
