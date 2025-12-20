export {};

declare global {
  type FileSystemHandleKind = "file" | "directory";

  interface FileSystemHandle {
    kind: FileSystemHandleKind;
    name: string;
  }

  interface FileSystemFileHandle extends FileSystemHandle {
    kind: "file";
    getFile(): Promise<File>;
    createWritable(options?: {
      keepExistingData?: boolean;
    }): Promise<FileSystemWritableFileStream>;
  }

  interface FileSystemDirectoryHandle extends FileSystemHandle {
    kind: "directory";
    entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
    getDirectoryHandle(
      name: string,
      options?: { create?: boolean }
    ): Promise<FileSystemDirectoryHandle>;
    getFileHandle(
      name: string,
      options?: { create?: boolean }
    ): Promise<FileSystemFileHandle>;
  }

  interface FileSystemWritableFileStream {
    write(data: string | BufferSource | Blob): Promise<void>;
    close(): Promise<void>;
  }

  interface Window {
    showDirectoryPicker?: (options?: {
      mode?: "read" | "readwrite";
      id?: string;
      startIn?: string;
    }) => Promise<FileSystemDirectoryHandle>;
  }
}
