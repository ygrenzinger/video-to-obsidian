export function sanitizeFileName(value: string): string {
  return value
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/[\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/-+/g, '-')
    .trim()
    .replace(/^\.+/, '')
    .slice(0, 120) || 'Untitled video';
}

export function markdownLinkTarget(path: string): string {
  return path.replace(/\.md$/i, '').split('/').pop() ?? path;
}

export function yamlString(value: string): string {
  return JSON.stringify(value);
}
