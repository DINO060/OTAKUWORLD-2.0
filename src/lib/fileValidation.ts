// ─── File Upload Validation ──────────────────────────────────────────────────
// Centralised checks for MIME type (magic bytes) + file size.
// Always validate magic bytes, not just the file extension.

export interface FileValidationResult {
  ok: boolean;
  error?: string;
}

// ── Magic byte signatures ────────────────────────────────────────────────────
const MAGIC: Record<string, number[][]> = {
  // Images
  'image/jpeg':  [[0xFF, 0xD8, 0xFF]],
  'image/png':   [[0x89, 0x50, 0x4E, 0x47]],
  'image/webp':  [[0x52, 0x49, 0x46, 0x46]], // RIFF....WEBP — checked below
  'image/gif':   [[0x47, 0x49, 0x46, 0x38]],
  // PDF
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  // CBZ (ZIP)
  'application/zip': [[0x50, 0x4B, 0x03, 0x04], [0x50, 0x4B, 0x05, 0x06]],
};

async function readMagicBytes(file: File, n = 8): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(new Uint8Array(e.target!.result as ArrayBuffer));
    reader.onerror = reject;
    reader.readAsArrayBuffer(file.slice(0, n));
  });
}

function matchesMagic(bytes: Uint8Array, signatures: number[][]): boolean {
  return signatures.some(sig => sig.every((b, i) => bytes[i] === b));
}

// ── Size limits ──────────────────────────────────────────────────────────────
const MAX_SIZES: Record<string, number> = {
  avatar:  2 * 1024 * 1024,   //  2 MB  – profile pictures
  cover:   5 * 1024 * 1024,   //  5 MB  – chapter cover images
  image:  10 * 1024 * 1024,   // 10 MB  – chapter page images
  pdf:    50 * 1024 * 1024,   // 50 MB  – PDF chapters
  cbz:    100 * 1024 * 1024,  // 100 MB – CBZ chapters
};

// ── Public validators ────────────────────────────────────────────────────────

export async function validateAvatar(file: File): Promise<FileValidationResult> {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowed.includes(file.type)) {
    return { ok: false, error: 'Format non supporté. Utilise JPG, PNG, WebP ou GIF.' };
  }
  if (file.size > MAX_SIZES.avatar) {
    return { ok: false, error: 'Image trop lourde (max 2 MB).' };
  }
  const bytes = await readMagicBytes(file);
  if (!matchesMagic(bytes, MAGIC[file.type] || [])) {
    return { ok: false, error: 'Fichier corrompu ou type non conforme.' };
  }
  return { ok: true };
}

export async function validateCoverImage(file: File): Promise<FileValidationResult> {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) {
    return { ok: false, error: 'Format non supporté. Utilise JPG, PNG ou WebP.' };
  }
  if (file.size > MAX_SIZES.cover) {
    return { ok: false, error: 'Image trop lourde (max 5 MB).' };
  }
  const bytes = await readMagicBytes(file);
  if (!matchesMagic(bytes, MAGIC[file.type] || [])) {
    return { ok: false, error: 'Fichier corrompu ou type non conforme.' };
  }
  return { ok: true };
}

export async function validateChapterImage(file: File): Promise<FileValidationResult> {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) {
    return { ok: false, error: `${file.name}: format non supporté (JPG, PNG, WebP uniquement).` };
  }
  if (file.size > MAX_SIZES.image) {
    return { ok: false, error: `${file.name}: image trop lourde (max 10 MB).` };
  }
  const bytes = await readMagicBytes(file);
  if (!matchesMagic(bytes, MAGIC[file.type] || [])) {
    return { ok: false, error: `${file.name}: fichier corrompu ou type non conforme.` };
  }
  return { ok: true };
}

export async function validatePdfOrCbz(file: File): Promise<FileValidationResult> {
  const isPdf = file.name.toLowerCase().endsWith('.pdf');
  const isCbz = file.name.toLowerCase().endsWith('.cbz');

  if (!isPdf && !isCbz) {
    return { ok: false, error: `${file.name}: seuls les fichiers PDF et CBZ sont acceptés.` };
  }

  const maxSize = isPdf ? MAX_SIZES.pdf : MAX_SIZES.cbz;
  const maxLabel = isPdf ? '50 MB' : '100 MB';
  if (file.size > maxSize) {
    return { ok: false, error: `${file.name}: fichier trop lourd (max ${maxLabel}).` };
  }

  const bytes = await readMagicBytes(file);
  const expectedMagic = isPdf ? MAGIC['application/pdf'] : MAGIC['application/zip'];
  if (!matchesMagic(bytes, expectedMagic)) {
    return { ok: false, error: `${file.name}: fichier corrompu ou extension incorrecte.` };
  }

  return { ok: true };
}
