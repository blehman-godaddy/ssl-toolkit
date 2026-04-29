import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import type { CommandResult, FileInfo } from '../types';

// Tauri API wrapper that matches the Electron API interface
export const tauriAPI = {
  selectDirectory: async (): Promise<string | null> => {
    const selected = await open({
      directory: true,
      multiple: false,
    });
    return selected as string | null;
  },

  selectFile: async (filters?: { name: string; extensions: string[] }[]): Promise<string | null> => {
    const selected = await open({
      multiple: false,
      filters: filters?.map(f => ({
        name: f.name,
        extensions: f.extensions
      }))
    });
    return selected as string | null;
  },

  executeCommand: async (args: string[]): Promise<CommandResult> => {
    try {
      const result = await invoke<CommandResult>('execute_command', { args });
      return result;
    } catch (error) {
      return {
        success: false,
        error: String(error)
      };
    }
  },

  fileExists: async (filePath: string): Promise<boolean> => {
    return invoke<boolean>('file_exists', { filePath });
  },

  getCaChainPath: async (): Promise<string> => {
    return invoke<string>('get_ca_chain_path');
  },

  readFile: async (filePath: string): Promise<{ success: boolean; content?: string; error?: string }> => {
    try {
      const content = await invoke<string>('read_file', { filePath });
      return { success: true, content };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },

  writeFile: async (filePath: string, content: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await invoke('write_file', { filePath, content });
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },

  listFiles: async (dirPath: string, extensions: string[]): Promise<{ success: boolean; files: FileInfo[]; error?: string }> => {
    try {
      const files = await invoke<FileInfo[]>('list_files', { dirPath, extensions });
      return { success: true, files };
    } catch (error) {
      return { success: false, files: [], error: String(error) };
    }
  },

  deleteFile: async (filePath: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await invoke('delete_file', { filePath });
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },

  // Secure command execution for keystores
  generateCSR: async (domain: string, outputDir: string): Promise<CommandResult> => {
    return invoke<CommandResult>('generate_csr', { domain, outputDir });
  },

  createKeystore: async (
    domain: string,
    outputDir: string,
    keyFile: string,
    certFile: string,
    format: string,
    extension: string,
    password: string,
    alias: string,
    legacyMode: boolean
  ): Promise<CommandResult> => {
    return invoke<CommandResult>('create_keystore', {
      domain,
      outputDir,
      keyFile,
      certFile,
      format,
      extension,
      password,
      alias,
      legacyMode
    });
  },

  writeClipboard: async (text: string): Promise<void> => {
    await writeText(text);
  }
};

// Make it available globally to match Electron API pattern
if (typeof window !== 'undefined') {
  (window as any).electronAPI = tauriAPI;
}
