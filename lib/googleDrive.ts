import { google } from 'googleapis';
import { Readable } from 'stream';

// Singleton para reutilizar el cliente entre requests (evita cold start lento)
let driveClient: ReturnType<typeof google.drive> | null = null;

function getDriveClient() {
  if (driveClient) return driveClient;

  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
  const auth = new google.auth.GoogleAuth({
    credentials,
    // drive.file: permite leer/subir/modificar solo archivos creados por esta app
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  driveClient = google.drive({ version: 'v3', auth });
  return driveClient;
}

export interface DriveFile {
  id: string;
  name: string;
  size: string;
  modifiedTime: string;
}

export interface DriveFileWithStatus extends DriveFile {
  mimeType: string;
  status: 'ok' | 'invalid_type' | 'too_large';
}

const MAX_DISPLAY_BYTES = 50 * 1024 * 1024;

export async function listAllDriveFilesWithStatus(): Promise<DriveFileWithStatus[]> {
  const drive = getDriveClient();
  const res = await drive.files.list({
    q: `'${process.env.DRIVE_FOLDER_ID}' in parents and trashed=false`,
    fields: 'files(id, name, size, modifiedTime, mimeType)',
    pageSize: 100,
    orderBy: 'name',
  });
  return ((res.data.files ?? []) as Array<{
    id: string; name: string; size: string; modifiedTime: string; mimeType: string;
  }>).map((f) => {
    let status: DriveFileWithStatus['status'] = 'ok';
    if (f.mimeType !== 'application/pdf') status = 'invalid_type';
    else if (parseInt(f.size ?? '0', 10) > MAX_DISPLAY_BYTES) status = 'too_large';
    return { id: f.id, name: f.name, size: f.size ?? '0', modifiedTime: f.modifiedTime, mimeType: f.mimeType, status };
  });
}


export async function listPdfsFromDrive(): Promise<DriveFile[]> {
  const drive = getDriveClient();
  const res = await drive.files.list({
    q: `'${process.env.DRIVE_FOLDER_ID}' in parents and mimeType='application/pdf' and trashed=false`,
    fields: 'files(id, name, size, modifiedTime)',
    pageSize: 100,
    orderBy: 'name',
  });
  return (res.data.files ?? []) as DriveFile[];
}

export async function getPdfMeta(fileId: string): Promise<{ name: string; mimeType: string }> {
  const drive = getDriveClient();
  const meta = await drive.files.get({ fileId, fields: 'id, name, mimeType' });
  return { name: meta.data.name ?? 'document.pdf', mimeType: meta.data.mimeType ?? '' };
}

export async function getPdfStream(
  fileId: string
): Promise<{ stream: NodeJS.ReadableStream; name: string }> {
  const drive = getDriveClient();

  const meta = await getPdfMeta(fileId);
  if (meta.mimeType !== 'application/pdf') {
    throw new Error('Not a PDF');
  }

  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );

  return {
    stream: response.data as NodeJS.ReadableStream,
    name: meta.name,
  };
}

export async function uploadPdfToDrive(
  buffer: Buffer,
  fileName: string
): Promise<DriveFile> {
  const drive = getDriveClient();

  // Convertir Buffer a ReadableStream para la API de Drive
  const readable = Readable.from(buffer);

  const res = await drive.files.create({
    requestBody: {
      name: fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`,
      parents: [process.env.DRIVE_FOLDER_ID!],
      mimeType: 'application/pdf',
    },
    media: {
      mimeType: 'application/pdf',
      body: readable,
    },
    fields: 'id, name, size, modifiedTime',
  });

  return res.data as DriveFile;
}

export async function deletePdfFromDrive(fileId: string): Promise<void> {
  const drive = getDriveClient();
  await drive.files.delete({ fileId });
}

export async function replacePdfOnDrive(
  fileId: string,
  buffer: Buffer,
  fileName: string
): Promise<{ name: string; size: string; modifiedTime: string }> {
  const drive = getDriveClient();
  const readable = Readable.from(buffer);

  await drive.files.update({
    fileId,
    requestBody: {
      name: fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`,
    },
    media: {
      mimeType: 'application/pdf',
      body: readable,
    },
    fields: 'id, name, size, modifiedTime',
  });

  // Obtener metadata actualizada
  const meta = await drive.files.get({ fileId, fields: 'name, size, modifiedTime' });
  return {
    name: meta.data.name ?? fileName,
    size: meta.data.size ?? String(buffer.length),
    modifiedTime: meta.data.modifiedTime ?? new Date().toISOString(),
  };
}
