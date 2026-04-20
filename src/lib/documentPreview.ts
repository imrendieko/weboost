export interface DocumentPreviewCandidate {
  label: string;
  url: string;
}

const OFFICE_VIEWER_EXTENSIONS = new Set(['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx']);

export function getFileExtensionFromUrl(rawUrl: string): string {
  const match = rawUrl.toLowerCase().match(/\.([^.?#]+)(?:[?#].*)?$/);
  return match ? match[1] : '';
}

export function extractGoogleDriveFileId(url: string): string | null {
  const pattern1 = /\/file\/d\/([a-zA-Z0-9-_]+)/;
  const match1 = url.match(pattern1);
  if (match1) return match1[1];

  const pattern2 = /[?&]id=([a-zA-Z0-9-_]+)/;
  const match2 = url.match(pattern2);
  if (match2) return match2[1];

  const pattern3 = /\/open\?id=([a-zA-Z0-9-_]+)/;
  const match3 = url.match(pattern3);
  if (match3) return match3[1];

  return null;
}

export function isGoogleDriveUrl(url: string): boolean {
  return url.includes('drive.google.com') || url.includes('docs.google.com');
}

function dedupeCandidates(candidates: DocumentPreviewCandidate[]): DocumentPreviewCandidate[] {
  const seen = new Set<string>();
  const result: DocumentPreviewCandidate[] = [];

  for (const candidate of candidates) {
    const key = candidate.url.trim();
    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(candidate);
  }

  return result;
}

export function buildDocumentPreviewCandidates(rawUrl: string): DocumentPreviewCandidate[] {
  if (!rawUrl) {
    return [];
  }

  const extension = getFileExtensionFromUrl(rawUrl);
  const candidates: DocumentPreviewCandidate[] = [];

  if (isGoogleDriveUrl(rawUrl)) {
    const fileId = extractGoogleDriveFileId(rawUrl);
    if (fileId) {
      candidates.push({
        label: 'Google Drive Preview',
        url: `https://drive.google.com/file/d/${fileId}/preview`,
      });
    }
  }

  if (extension === 'pdf') {
    candidates.push({ label: 'Browser PDF Viewer', url: rawUrl });
  }

  if (OFFICE_VIEWER_EXTENSIONS.has(extension)) {
    candidates.push({
      label: 'Microsoft Office Viewer',
      url: `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(rawUrl)}`,
    });
  }

  candidates.push({
    label: 'Google Docs Viewer',
    url: `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(rawUrl)}`,
  });

  candidates.push({ label: 'Direct File URL', url: rawUrl });

  return dedupeCandidates(candidates);
}
