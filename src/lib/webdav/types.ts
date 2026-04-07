export interface WebDavFile {
  href: string;
  name: string;
  path: string;
  isDirectory: boolean;
  contentType: string | null;
  contentLength: number | null;
  lastModified: string | null;
  etag: string | null;
}

export interface WebDavListResponse {
  files: WebDavFile[];
  path: string;
}

export interface WebDavError {
  status: number;
  message: string;
}
