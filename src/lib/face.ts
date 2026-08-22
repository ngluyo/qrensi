"use client";

/**
 * Wrapper face-api.js (client-only). Menghitung descriptor 128-d di HP.
 * Keputusan lolos/tidak TETAP di server (blueprint §6.2).
 */

let loaded = false;

type FaceApi = typeof import("@vladmandic/face-api");
let api: FaceApi | null = null;

async function getApi(): Promise<FaceApi> {
  if (!api) api = await import("@vladmandic/face-api");
  return api;
}

export async function loadFaceModels(): Promise<void> {
  if (loaded) return;
  const faceapi = await getApi();

  // Inisialisasi backend TF eksplisit; bila WebGL gagal, jatuh ke CPU/WASM.
  // (ADR-0020 — kegagalan backend dulu membuat kamera tak pernah diminta.)
  try {
    const tf = faceapi.tf as unknown as {
      setBackend?: (b: string) => Promise<boolean>;
      ready?: () => Promise<void>;
      getBackend?: () => string;
    };
    if (tf?.ready) {
      await tf.ready();
      if (!tf.getBackend?.()) {
        await tf.setBackend?.("cpu");
        await tf.ready();
      }
    }
  } catch {
    // Abaikan: face-api akan memilih backend sendiri.
  }

  const URL = "/models";
  await faceapi.nets.tinyFaceDetector.loadFromUri(URL);
  await faceapi.nets.faceLandmark68Net.loadFromUri(URL);
  await faceapi.nets.faceRecognitionNet.loadFromUri(URL);
  loaded = true;
}

/**
 * Minta akses kamera. HARUS dipanggil SEBELUM loadFaceModels() agar prompt izin
 * langsung muncul walau pemuatan model kelak gagal (AUDIT A3 / ADR-0020).
 * `facingMode` hanya preferensi (ideal) supaya webcam PC tetap terpakai.
 */
export async function requestCamera(prefer: "user" | "environment" = "user"): Promise<MediaStream> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("Browser ini tidak mendukung akses kamera.");
  }
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: prefer }, width: { ideal: 640 }, height: { ideal: 480 } },
    audio: false,
  });
}

/** Ubah error kamera jadi pesan berbahasa Indonesia yang bisa ditindaklanjuti. */
export function pesanErrorKamera(e: unknown): string {
  const name = (e as { name?: string })?.name ?? "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Izin kamera ditolak. Klik ikon gembok di address bar → izinkan Kamera → muat ulang.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "Kamera tidak ditemukan di perangkat ini.";
    case "NotReadableError":
      return "Kamera sedang dipakai aplikasi lain. Tutup aplikasi itu lalu coba lagi.";
    default:
      return "Kamera gagal dibuka: " + ((e as Error)?.message ?? "penyebab tidak diketahui");
  }
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Eye Aspect Ratio dari 6 titik mata face-api. Kecil = mata tertutup. */
function ear(eye: { x: number; y: number }[]) {
  return (dist(eye[1], eye[5]) + dist(eye[2], eye[4])) / (2 * dist(eye[0], eye[3]));
}

/**
 * Metrik liveness dari landmark (tanpa descriptor, ringan untuk loop).
 * - ear: rata-rata Eye Aspect Ratio (deteksi kedip)
 * - yaw: posisi hidung relatif garis rahang (deteksi menoleh); |yaw| besar = menoleh
 */
export async function getLandmarkMetrics(
  input: HTMLVideoElement,
): Promise<{ ear: number; yaw: number } | null> {
  const faceapi = await getApi();
  const res = await faceapi
    .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 }))
    .withFaceLandmarks();
  if (!res) return null;
  const lm = res.landmarks;
  const earAvg = (ear(lm.getLeftEye()) + ear(lm.getRightEye())) / 2;
  const pos = lm.positions;
  const jawL = pos[0],
    jawR = pos[16],
    nose = pos[30];
  const midX = (jawL.x + jawR.x) / 2;
  const width = Math.abs(jawR.x - jawL.x) || 1;
  const yaw = (nose.x - midX) / width;
  return { ear: earAvg, yaw };
}

/** Deteksi 1 wajah + descriptor dari <video>/<canvas>/<img>. null jika tak ada wajah. */
export async function getDescriptor(
  input: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
): Promise<number[] | null> {
  const faceapi = await getApi();
  const res = await faceapi
    .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();
  if (!res?.descriptor) return null;
  return Array.from(res.descriptor);
}
