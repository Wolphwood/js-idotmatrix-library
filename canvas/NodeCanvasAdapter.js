import { createCanvas } from "canvas";
import { CanvasAdapter } from "./CanvasAdapter.js";

export class NodeCanvasAdapter extends CanvasAdapter {
  constructor(options = {}) {
    super(options);

    this.canvas = createCanvas(
      this.width,
      this.height
    );

    this.context = this.canvas.getContext("2d", options.options ?? {});
  }

  async toBuffer(format = "image/png") {
    if (!this.canvas) return null;

    const buffer = this.canvas.toBuffer(format);
    const bytes = new Uint8Array(buffer);

    this.lastbuffer = bytes;

    return bytes;
  }
}