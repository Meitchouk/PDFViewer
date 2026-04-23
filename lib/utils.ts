import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Convierte un nombre de archivo en un slug válido para alias.
 * Elimina extensión .pdf, normaliza acentos, reemplaza caracteres no válidos por guiones.
 */
export function toSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\.pdf$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    || 'documento';
}

/**
 * Parsea la respuesta de fetch como JSON de forma segura.
 * Si el servidor devuelve texto plano (ej. 413 Request Entity Too Large de Vercel),
 * lanza un Error con el texto legible en lugar de un error de parseo JSON críptico.
 */
export async function safeJson<T = unknown>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    // El servidor devolvió texto plano (error de proxy/edge, 413, 504, etc.)
    const msg = text.trim().slice(0, 150);
    throw new Error(msg || `Error HTTP ${res.status}`);
  }
}
