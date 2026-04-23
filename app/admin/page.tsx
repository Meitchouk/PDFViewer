import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import { listPdfsFromDrive } from '@/lib/googleDrive';
import { getEnabledMap } from '@/lib/kv';
import PDFToggleList from '@/components/admin/PDFToggleList';
import LogoutButton from './LogoutButton';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  // Verificar sesión (el middleware ya protege, pero doble verificación)
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token || !(await verifyToken(token))) {
    redirect('/admin/login');
  }

  // Obtener todos los PDFs de Drive con su estado
  let pdfs: Array<{
    id: string;
    name: string;
    size: string;
    modifiedTime: string;
    enabled: boolean;
  }> = [];

  let fetchError: string | null = null;

  try {
    const [driveFiles, blobFiles] = await Promise.all([
      listPdfsFromDrive(),
      import('@/lib/kv').then((m) => m.listBlobFiles()),
    ]);

    const allFiles = [
      ...driveFiles,
      ...blobFiles.map((b) => ({
        id: b.id,
        name: b.name,
        size: b.size,
        modifiedTime: b.uploadedAt,
      })),
    ];

    const enabledMap = await getEnabledMap(allFiles.map((f) => f.id));
    pdfs = allFiles.map((f) => ({ ...f, enabled: enabledMap[f.id] }));
  } catch (err) {
    console.error('[Admin] Error cargando PDFs:', err);
    fetchError = 'No se pudo conectar con Google Drive o la base de datos. Verifica las variables de entorno.';
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Panel Admin</h1>
            <p className="text-xs text-gray-400 mt-0.5">Gestión de documentos PDF</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-500 hover:text-blue-600 transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Ver sitio
            </a>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Contenido */}
      <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-800">
              Documentos en Google Drive
            </h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-md">
              Activa o desactiva la visibilidad de cada PDF
            </span>
          </div>

          {fetchError ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
              <p className="font-medium mb-1">Error de configuración</p>
              <p>{fetchError}</p>
            </div>
          ) : (
            <PDFToggleList initialPdfs={pdfs} />
          )}
        </div>

        {/* Nota informativa */}
        <div className="mt-4 flex items-start gap-2 text-xs text-gray-400">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>
            Los cambios son inmediatos. Los documentos desactivados no aparecen en el sitio público
            ni pueden descargarse. Para agregar nuevos PDFs, súbelos directamente a la carpeta de
            Google Drive configurada.
          </p>
        </div>
      </div>
    </div>
  );
}
