export type CameraPresetKey = 'near' | 'standard' | 'wide';

export interface CameraPreset {
  key: CameraPresetKey;
  label: string;
  shortLabel: string;
  desc: string;
  distance: number;
  fov: number;
  pitch: number;
  portraitHalfW: number;
  portraitPitch: number;
  portraitMaxFov: number;
}

export const CAMERA_PRESET_STORAGE_KEY = 'tsry.cameraPreset';
export const DEFAULT_CAMERA_PRESET: CameraPresetKey = 'standard';

export const CAMERA_PRESETS: Record<CameraPresetKey, CameraPreset> = {
  near: {
    key: 'near',
    label: '近景（原版）',
    shortLabel: '近景',
    desc: '紧凑近景特写，人物动作细节最清晰。',
    distance: 27.5,
    fov: 32,
    pitch: 46,
    portraitHalfW: 7.5,
    portraitPitch: 54,
    portraitMaxFov: 44,
  },
  standard: {
    key: 'standard',
    label: '标准（推荐）',
    shortLabel: '标准',
    desc: '推荐标准视野（较近景拉远约 24%），兼顾技能预判与团战全局。',
    distance: 34.0,
    fov: 35,
    pitch: 48.5,
    portraitHalfW: 9.2,
    portraitPitch: 55.5,
    portraitMaxFov: 46,
  },
  wide: {
    key: 'wide',
    label: '广角（开阔）',
    shortLabel: '广角',
    desc: '大范围全局视野，适合远程消耗与河道支援观察。',
    distance: 37.5,
    fov: 37,
    pitch: 50,
    portraitHalfW: 10.2,
    portraitPitch: 57,
    portraitMaxFov: 48,
  },
};

export const CAMERA_PRESET_LIST: readonly CameraPreset[] = [
  CAMERA_PRESETS.near,
  CAMERA_PRESETS.standard,
  CAMERA_PRESETS.wide,
];

export function isCameraPresetKey(v: unknown): v is CameraPresetKey {
  return v === 'near' || v === 'standard' || v === 'wide';
}

export function loadCameraPreset(): CameraPresetKey {
  try {
    const raw = globalThis.localStorage?.getItem(CAMERA_PRESET_STORAGE_KEY);
    if (isCameraPresetKey(raw)) return raw;
  } catch {
    // ignore storage errors
  }
  return DEFAULT_CAMERA_PRESET;
}

export function saveCameraPreset(key: CameraPresetKey): void {
  try {
    globalThis.localStorage?.setItem(CAMERA_PRESET_STORAGE_KEY, key);
  } catch {
    // ignore storage errors
  }
}

export function getCameraPresetConfig(key: unknown): CameraPreset {
  return isCameraPresetKey(key) ? CAMERA_PRESETS[key] : CAMERA_PRESETS[DEFAULT_CAMERA_PRESET];
}
