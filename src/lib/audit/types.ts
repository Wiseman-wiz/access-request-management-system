export type AuditAction = "download" | "view" | "upload" | "delete" | "move" | "copy" | "create_folder";

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: AuditAction;
  filePath: string;
  userId: string;
  userName: string;
  ipAddress: string | null;
  userAgent: string | null;
}
