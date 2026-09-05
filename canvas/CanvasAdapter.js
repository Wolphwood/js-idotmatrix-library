export class CanvasAdapter {
  constructor({ width = 16, height = 16 } = {}) {
    this.width = width;
    this.height = height;

    this.canvas = null;
    this.context = null;

    this.lastbuffer = null;
  }

  get size() {
    return {
      width: this.width,
      height: this.height
    };
  }

  get ctx() {
    return this.context;
  }

  clear() {
    if (!this.context) return;
    this.context.clearRect(0, 0, this.width, this.height);
  }

  resize(width = this.width, height = this.height) {
    if (!this.canvas) return;

    if (Number.isFinite(width) && width > 0) this.width = width;
    if (Number.isFinite(height) && height > 0) this.height = height;

    if (!this.canvas) return;

    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.context = this.canvas.getContext("2d");
  }

  async toBuffer() {
    throw new Error("toBuffer() must be implemented by the adapter");
  }
}