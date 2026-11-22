import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export interface FoundDevice {
  id: string;
  name: string;
  bonded?: boolean;
}

interface PrinterPlugin {
  ensureReady(): Promise<{ value: boolean }>;
  getBondedDevices(): Promise<{ devices: FoundDevice[] }>;
  startDiscovery(): Promise<{ value: boolean }>;
  stopDiscovery(): Promise<void>;
  pair(o: { address: string }): Promise<{ value: boolean }>;
  openBluetoothSettings(): Promise<void>;
  write(o: { address: string; data: string }): Promise<void>;
  shareImage(o: { data: string; fileName: string; text?: string; target?: "whatsapp" | "" }): Promise<void>;
  saveImage(o: { data: string; fileName: string }): Promise<void>;
  addListener(event: "deviceFound", fn: (d: FoundDevice) => void): Promise<PluginListenerHandle>;
  addListener(event: "discoveryFinished", fn: () => void): Promise<PluginListenerHandle>;
}

/** Native on the Android app; absent in the browser (dev server), where callers fall back. */
export const Printer = registerPlugin<PrinterPlugin>("Printer");
export const isNative = () => Capacitor.isNativePlatform();

/** A readable message for a plugin rejection (its `code` is set on the Java side). */
export function printerError(e: unknown): string {
  const code = (e as { code?: string })?.code;
  switch (code) {
    case "permission":
      return "Allow Bluetooth permission for the app to use the printer.";
    case "bluetooth-off":
      return "Bluetooth is off. Turn it on and try again.";
    case "unreachable":
      return "Could not reach the printer. Make sure it is on and near the phone.";
    case "no-whatsapp":
      return "WhatsApp is not installed on this phone.";
    case "unsupported":
      return "This phone has no Bluetooth.";
    default:
      return (e as Error)?.message || "Something went wrong.";
  }
}
