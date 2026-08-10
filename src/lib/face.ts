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
