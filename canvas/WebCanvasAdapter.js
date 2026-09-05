import { CanvasAdapter } from "./CanvasAdapter.js";

export class WebCanvasAdapter extends CanvasAdapter {
  constructor(options = {}) {
    super(options);

    this.canvas = document.createElement("canvas");
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.context = this.canvas.getContext("2d", options.options ?? {});
  }
  
  toBuffer(format = 'image/png') {
    if (!this.canvas) return;
    
    return new Promise(resolve => {
      this.canvas.toBlob(async (blob) => {
        const arrayBuffer = await blob.arrayBuffer();
        const pngBytes = new Uint8Array(arrayBuffer);
        
        this.lastbuffer = pngBytes;

        resolve(pngBytes);
      }, format);
    });
  }
}