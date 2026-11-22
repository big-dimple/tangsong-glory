const SCALES = [0.6, 0.72, 0.85, 1] as const;
const FULL = SCALES.length - 1;

/** Adjust the 3D buffer over sustained frame-rate changes. HUD layout stays in CSS pixels. */
export class RenderResolution {
  private level = FULL;
  private elapsed = 0;
  private frames = 0;
  private slowWindows = 0;
  private fastWindows = 0;

  get scale() {
    return SCALES[this.level];
  }

  sample(frameSeconds: number): boolean {
    if (!(frameSeconds > 0)) {
      this.elapsed = this.frames = this.slowWindows = this.fastWindows = 0;
      return false;
    }

    this.elapsed += frameSeconds;
    this.frames++;
    if (this.elapsed < 1.5) return false;

    const fps = this.frames / this.elapsed;
    this.elapsed = this.frames = 0;
    this.slowWindows = fps < 26 ? this.slowWindows + 1 : 0;
    this.fastWindows = fps >= 48 ? this.fastWindows + 1 : 0;

    if (this.slowWindows >= 3 && this.level > 0) {
      this.level--;
    } else if (this.fastWindows >= 6 && this.level < FULL) {
      this.level++;
    } else {
      return false;
    }
    this.slowWindows = this.fastWindows = 0;
    return true;
  }
}
