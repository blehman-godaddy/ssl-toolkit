export type KeystoreFormat = 'JKS' | 'P12' | 'PFX';
export type AppMode = 'workflow' | 'csr-only' | 'cleanup';

export interface Project {
  domain: string;
  outputDir: string;
  keyFile?: string;
  csrFile?: string;
  certFile?: string;
  keystoreFormat: KeystoreFormat;
  keystorePassword: string;
  alias: string;
  legacyMode: boolean;
  caChain: string;
}

export interface CommandResult {
  success: boolean;
  stdout?: string;
  stderr?: string;
  error?: string;
}

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  modified: string;
}

export type Step = 1 | 2 | 3 | 4;

// Global type declaration for Tauri API (set by api/tauri.ts)
declare global {
  interface Window {
    electronAPI: {
      selectDirectory: () => Promise<string | null>;
      selectFile: (filters?: { name: string; extensions: string[] }[]) => Promise<string | null>;
      executeCommand: (args: string[]) => Promise<CommandResult>;
      fileExists: (filePath: string) => Promise<boolean>;
      getCaChainPath: () => Promise<string>;
      readFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>;
      writeFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
      listFiles: (dirPath: string, extensions: string[]) => Promise<{ success: boolean; files: FileInfo[]; error?: string }>;
      deleteFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
      generateCSR: (domain: string, outputDir: string) => Promise<CommandResult>;
      createKeystore: (
        domain: string,
        outputDir: string,
        keyFile: string,
        certFile: string,
        format: string,
        extension: string,
        password: string,
        alias: string,
        legacyMode: boolean
      ) => Promise<CommandResult>;
      writeClipboard: (text: string) => Promise<void>;
    };
  }
}

export {};
