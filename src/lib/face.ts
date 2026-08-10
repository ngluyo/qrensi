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
  const URL = "/models";
  await faceapi.nets.tinyFaceDetector.loadFromUri(URL);
  await faceapi.nets.faceLandmark68Net.loadFromUri(URL);
  await faceapi.nets.faceRecognitionNet.loadFromUri(URL);
  loaded = true;
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
