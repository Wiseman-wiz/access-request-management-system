import type { WebDavFile, WebDavListResponse } from "./types";

const NEXTCLOUD_URL = process.env.NEXTCLOUD_URL!.replace(/\/+$/, "");

export interface WebDavAuth {
  username: string;
  accessToken: string;
}

function getWebDavBase(username: string): string {
  return `${NEXTCLOUD_URL}/remote.php/dav/files/${username}`;
}

function getAuthHeaders(auth: WebDavAuth): HeadersInit {
  return {
    Authorization: `Bearer ${auth.accessToken}`,
  };
}

function buildUrl(path: string, username: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${getWebDavBase(username)}${cleanPath}`;
}

function parseMultistatus(xml: string, basePath: string, username: string): WebDavFile[] {
  const files: WebDavFile[] = [];
  const responseRegex = /<d:response>([\s\S]*?)<\/d:response>/g;

  let match;
  while ((match = responseRegex.exec(xml)) !== null) {
    const block = match[1];

    const href = extractTag(block, "d:href") ?? "";
    const displayName = extractTag(block, "d:displayname") ?? "";
    const contentType = extractTag(block, "d:getcontenttype");
    const contentLength = extractTag(block, "d:getcontentlength");
    const lastModified = extractTag(block, "d:getlastmodified");
    const etag = extractTag(block, "d:getetag");
    const isCollection = block.includes("<d:collection/>");

    const decodedHref = decodeURIComponent(href);
    const pathParts = decodedHref.replace(/\/$/, "").split("/");
    const name = displayName || pathParts[pathParts.length - 1] || "";

    const davPrefix = `/remote.php/dav/files/${username}`;
    const relativePath = decodedHref.startsWith(davPrefix)
      ? decodedHref.slice(davPrefix.length)
      : decodedHref;

    files.push({
      href: decodedHref,
      name,
      path: relativePath,
      isDirectory: isCollection,
      contentType: contentType,
      contentLength: contentLength ? parseInt(contentLength, 10) : null,
      lastModified: lastModified,
      etag: etag?.replace(/"/g, "") ?? null,
    });
  }

  const normalizedBase = basePath.replace(/\/$/, "");
  return files.filter((f) => f.path.replace(/\/$/, "") !== normalizedBase);
}

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`);
  const match = regex.exec(xml);
  return match ? match[1].trim() : null;
}

/**
 * List files and folders at the given path.
 */
export async function listFiles(
  auth: WebDavAuth,
  path: string = "/"
): Promise<WebDavListResponse> {
  const url = buildUrl(path, auth.username);

  const response = await fetch(url, {
    method: "PROPFIND",
    headers: {
      ...getAuthHeaders(auth),
      Depth: "1",
      "Content-Type": "application/xml",
    },
    body: `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns" xmlns:nc="http://nextcloud.org/ns">
  <d:prop>
    <d:displayname/>
    <d:getcontenttype/>
    <d:getcontentlength/>
    <d:getlastmodified/>
    <d:getetag/>
    <d:resourcetype/>
  </d:prop>
</d:propfind>`,
  });

  if (!response.ok) {
    throw new Error(`PROPFIND failed: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  const files = parseMultistatus(xml, path, auth.username);

  return { files, path };
}

/**
 * Download a file from Nextcloud.
 */
export async function downloadFile(
  auth: WebDavAuth,
  path: string
): Promise<Response> {
  const url = buildUrl(path, auth.username);

  const response = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(auth),
  });

  if (!response.ok) {
    throw new Error(`GET failed: ${response.status} ${response.statusText}`);
  }

  return response;
}

/**
 * Upload a file to Nextcloud.
 */
export async function uploadFile(
  auth: WebDavAuth,
  path: string,
  content: Uint8Array | ReadableStream,
  contentType: string = "application/octet-stream"
): Promise<void> {
  const url = buildUrl(path, auth.username);

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      ...getAuthHeaders(auth),
      "Content-Type": contentType,
    },
    body: content as BodyInit,
  });

  if (!response.ok) {
    throw new Error(`PUT failed: ${response.status} ${response.statusText}`);
  }
}

/**
 * Create a new folder at the given path.
 */
export async function createFolder(
  auth: WebDavAuth,
  path: string
): Promise<void> {
  const url = buildUrl(path, auth.username);

  const response = await fetch(url, {
    method: "MKCOL",
    headers: getAuthHeaders(auth),
  });

  if (!response.ok) {
    throw new Error(`MKCOL failed: ${response.status} ${response.statusText}`);
  }
}

/**
 * Delete a file or folder at the given path.
 */
export async function deleteFile(
  auth: WebDavAuth,
  path: string
): Promise<void> {
  const url = buildUrl(path, auth.username);

  const response = await fetch(url, {
    method: "DELETE",
    headers: getAuthHeaders(auth),
  });

  if (!response.ok) {
    throw new Error(`DELETE failed: ${response.status} ${response.statusText}`);
  }
}

/**
 * Move or rename a file/folder.
 */
export async function moveFile(
  auth: WebDavAuth,
  sourcePath: string,
  destinationPath: string,
  overwrite: boolean = false
): Promise<void> {
  const sourceUrl = buildUrl(sourcePath, auth.username);
  const destinationUrl = buildUrl(destinationPath, auth.username);

  const response = await fetch(sourceUrl, {
    method: "MOVE",
    headers: {
      ...getAuthHeaders(auth),
      Destination: destinationUrl,
      Overwrite: overwrite ? "T" : "F",
    },
  });

  if (!response.ok) {
    throw new Error(`MOVE failed: ${response.status} ${response.statusText}`);
  }
}

/**
 * Copy a file/folder.
 */
export async function copyFile(
  auth: WebDavAuth,
  sourcePath: string,
  destinationPath: string,
  overwrite: boolean = false
): Promise<void> {
  const sourceUrl = buildUrl(sourcePath, auth.username);
  const destinationUrl = buildUrl(destinationPath, auth.username);

  const response = await fetch(sourceUrl, {
    method: "COPY",
    headers: {
      ...getAuthHeaders(auth),
      Destination: destinationUrl,
      Overwrite: overwrite ? "T" : "F",
    },
  });

  if (!response.ok) {
    throw new Error(`COPY failed: ${response.status} ${response.statusText}`);
  }
}
