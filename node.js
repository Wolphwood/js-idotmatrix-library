/** Node.js entrypoint: connects the Node BLE and Canvas adapters to the same SDK. */
import { iDotMatrix } from './iDotMatrix.js';
import { NodeWebBluetoothAdapter } from './bluetooth/NodeWebBluetoothAdapter.js';
import { NodeCanvasAdapter } from './canvas/NodeCanvasAdapter.js';

export { iDotMatrix, NodeWebBluetoothAdapter, NodeCanvasAdapter };

export function createNodeMatrix({ bluetoothadapter, canvasadapter, bluetoothOptions = {}, canvasOptions = {}, ...options } = {}) {
  const ble = bluetoothadapter ?? new NodeWebBluetoothAdapter(bluetoothOptions);
  const canvas = canvasadapter ?? new NodeCanvasAdapter({
    width: options.width ?? 16, height: options.height ?? 16, ...canvasOptions,
  });
  return new iDotMatrix({ ...options, bluetoothadapter: ble, canvasadapter: canvas });
}
