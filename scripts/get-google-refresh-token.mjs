// Ambil GOOGLE_REFRESH_TOKEN untuk backup Drive (scope drive.file).
// Jalankan LOKAL di komputer Anda (butuh browser):
//   node scripts/get-google-refresh-token.mjs <CLIENT_ID> <CLIENT_SECRET>
// atau set env GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET lalu:
//   node scripts/get-google-refresh-token.mjs
//
// Prasyarat: OAuth Client type "Desktop app" di Google Cloud Console
// (APIs & Services -> Credentials -> Create OAuth client ID -> Desktop app).
// Google Drive API harus di-Enable di project yang sama.

import http from "node:http";
import { google } from "googleapis";

const CLIENT_ID = process.argv[2] || process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.argv[3] || process.env.GOOGLE_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Kurang argumen. Contoh:\n  node scripts/get-google-refresh-token.mjs <CLIENT_ID> <CLIENT_SECRET>");
  process.exit(1);
}

const SCOPE = ["https://www.googleapis.com/auth/drive.file"];

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost`);
    const code = url.searchParams.get("code");
    if (!code) {
      res.writeHead(400).end("Tidak ada code.");
      return;
    }
    const port = server.address().port;
    const oauth2 = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, `http://localhost:${port}`);
    const { tokens } = await oauth2.getToken(code);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<h2>Berhasil! Refresh token sudah dicetak di terminal. Tutup tab ini.</h2>");
    console.log("\n==============================================");
    if (tokens.refresh_token) {
      console.log("GOOGLE_REFRESH_TOKEN=" + tokens.refresh_token);
      console.log("\nSalin baris di atas ke .env.local (dan ke Vercel env).");
    } else {
      console.log("Tidak dapat refresh_token. Hapus akses app di https://myaccount.google.com/permissions lalu ulangi (kami sudah pakai prompt=consent).");
    }
    console.log("==============================================\n");
    server.close();
    process.exit(0);
  } catch (e) {
    res.writeHead(500).end("Gagal: " + e.message);
    console.error("ERR:", e.message);
    server.close();
    process.exit(1);
  }
});

server.listen(0, () => {
  const port = server.address().port;
  const oauth2 = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, `http://localhost:${port}`);
  const authUrl = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPE,
  });
  console.log("\n1) Buka URL ini di browser (login dengan akun Google pemilik Drive):\n");
  console.log(authUrl);
  console.log("\n2) Setelah setuju, Anda diarahkan ke localhost dan token tercetak di sini.\n");
});
