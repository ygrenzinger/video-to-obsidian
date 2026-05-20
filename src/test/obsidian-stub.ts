export class TFile {
  constructor(public path: string) {}
}

export class TFolder {
  constructor(public path: string) {}
}

export function normalizePath(path: string): string {
  return path
    .replace(/\\+/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
}

export type Vault = unknown;
