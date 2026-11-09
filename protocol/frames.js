/** Pure iDotMatrix protocol frame builders; no Bluetooth I/O. */
export const MEDIA_BLOCK_BYTES = 4096;

function bytes(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  throw new TypeError('Expected an ArrayBuffer or typed byte array');
}

function assertByte(value, name) {
  if (!Number.isInteger(value) || value < 0 || value > 255) {
    throw new RangeError(`${name} must be an integer from 0 to 255`);
  }
}

function assertDuration(value) {
  if (!Number.isInteger(value) || value < 0 || value > 65535) {
    throw new RangeError('durationValue must be an integer from 0 to 65535');
  }
}

export function crc32(input) {
  const data = bytes(input);
  let crc = 0xFFFFFFFF;
  for (const byte of data) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xEDB88320 : 0);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

/** Build image(2), GIF(1), or text(3) logical blocks with a global CRC. */
export function encodeMediaBlocks(input, { type, slotIndex = 12, durationValue = 0 } = {}) {
  if (![1, 2, 3].includes(type)) throw new RangeError('type must be GIF(1), image(2) or text(3)');
  assertByte(slotIndex, 'slotIndex');
  assertDuration(durationValue);
  const data = bytes(input);
  if (data.length === 0) throw new RangeError('Media payload must not be empty');
  if (data.length > 0xFFFFFFFF) throw new RangeError('Media payload too large');
  const blocks = [];
  const checksum = crc32(data);
  // APK constructors set the duration field to zero for the special index 12.
  const time = slotIndex === 12 ? 0 : durationValue;
  for (let start = 0; start < data.length; start += MEDIA_BLOCK_BYTES) {
    const chunk = data.subarray(start, start + MEDIA_BLOCK_BYTES);
    const frame = new Uint8Array(chunk.length + 16);
    const view = new DataView(frame.buffer);
    view.setUint16(0, frame.length, true);
    view.setUint16(2, type, true);
    frame[4] = start === 0 ? 0 : 2;
    view.setUint32(5, data.length, true);
    view.setUint32(9, checksum, true);
    view.setUint16(13, time, true);
    frame[15] = slotIndex;
    frame.set(chunk, 16);
    blocks.push(frame);
  }
  return blocks;
}

/** Build the 9-byte DIY envelope, little-endian length fields, no CRC. */
export function encodeDIYBlocks(input) {
  const data = bytes(input);
  if (data.length === 0) throw new RangeError('DIY payload must not be empty');
  if (data.length > 0xFFFFFFFF) throw new RangeError('DIY payload too large');
  const blocks = [];
  for (let start = 0; start < data.length; start += MEDIA_BLOCK_BYTES) {
    const chunk = data.subarray(start, start + MEDIA_BLOCK_BYTES);
    const frame = new Uint8Array(chunk.length + 9);
    const view = new DataView(frame.buffer);
    view.setUint16(0, frame.length, true);
    frame[4] = start === 0 ? 0 : 2;
    view.setUint32(5, data.length, true);
    frame.set(chunk, 9);
    blocks.push(frame);
  }
  return blocks;
}

/** Parse known response opcodes. Raw bytes are intentionally retained. */
export function decodeNotification(input) {
  const raw = bytes(input).slice();
  if (raw.length < 4) return { kind: 'incomplete', raw };
  const opcode = (raw[2] << 8) | raw[3];
  const status = raw.length >= 5 ? raw[4] : null;
  if (raw[2] === 0x01 && raw[3] === 0x80) {
    if (raw.length >= 9) return {
      kind: 'deviceInfo', opcode, status, raw,
      mcuVersion: [raw[4], raw[5]], screenOn: raw[6] === 1,
      screenType: raw[7], passwordProtected: raw[8] === 1,
    };
    return { kind: raw.length >= 5 ? 'timeAck' : 'incomplete', opcode, status, raw };
  }
  if (raw.length < 5) return { kind: 'incomplete', opcode, status, raw };
  const typeByOpcode = { '2,0': 'image', '1,0': 'gif', '3,0': 'text', '0,0': 'diy' };
  const family = typeByOpcode[`${raw[2]},${raw[3]}`];
  if (family) {
    let outcome = 'unknown';
    if (family === 'diy') {
      if (status === 2) outcome = 'continue';
      else if (status === 0 || status === 1) outcome = 'terminal';
    } else {
      if (status === 1) outcome = 'continue';
      else if (status === 3) outcome = 'terminal';
      else if (status === 2 || (family === 'gif' && status === 0)) outcome = 'error';
    }
    return { kind: 'transferAck', family, opcode, status, outcome, raw };
  }
  if (raw[2] === 0x05 && raw[3] === 0x02) return { kind: 'passwordVerificationOrDrawing', opcode, status, raw };
  return { kind: 'response', opcode, status, raw };
}
