import { google } from "googleapis";
import { Readable } from "stream";

/**
 * Backup ke Google Drive PRIBADI via OAuth (bertindak sebagai akun pemilik).
 * Service account TIDAK bisa dipakai untuk personal Drive (kuota 0 → upload
 * gagal); maka pakai refresh token. SERVER-ONLY.
 *
 * Scope: drive.file (hanya file yang dibuat app). App membuat/menemukan folder
 * "QRensi Backup" sendiri, jadi tak perlu berbagi folder pra-buat.
 */

const APP_FOLDER = "QRensi Backup";

function getDrive() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN belum diset");
  }
  const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({ refresh_token: refreshToken });
  return google.drive({ version: "v3", auth: oauth2 });
}

async function ensureFolder(drive: ReturnType<typeof getDrive>): Promise<string> {
  // Scope drive.file hanya mengizinkan folder yang DIBUAT app -> selalu
  // find/create "QRensi Backup" (folder pra-buat manual tidak dipakai).
  const q = `mimeType='application/vnd.google-apps.folder' and name='${APP_FOLDER}' and trashed=false`;
  const found = await drive.files.list({ q, fields: "files(id)", spaces: "drive" });
  if (found.data.files && found.data.files.length > 0) return found.data.files[0].id!;

  const created = await drive.files.create({
    requestBody: { name: APP_FOLDER, mimeType: "application/vnd.google-apps.folder" },
    fields: "id",
  });
  return created.data.id!;
}

export async function uploadBackupDrive(
  filename: string,
  content: string,
  mimeType = "text/csv",
): Promise<{ id: string; url: string }> {
  const drive = getDrive();
  const folderId = await ensureFolder(drive);

  const res = await drive.files.create({
    requestBody: { name: filename, parents: [folderId] },
    media: { mimeType, body: Readable.from(content) },
    fields: "id, webViewLink",
  });

  return {
    id: res.data.id!,
    url: res.data.webViewLink ?? `https://drive.google.com/file/d/${res.data.id}/view`,
  };
}
