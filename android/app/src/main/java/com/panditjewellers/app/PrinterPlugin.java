package com.panditjewellers.app;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothSocket;
import android.content.BroadcastReceiver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.provider.Settings;
import android.util.Base64;

import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

/**
 * Bluetooth Classic (SPP) thermal printing plus image share/save for the bill.
 *
 * Ported from RestoBill's ClassicBluetoothModule. The printer socket is kept for IDLE_CLOSE_MS after a
 * print so a run of bills pays the 1-3 s RFCOMM setup once, then closed: a held socket blocks every other
 * app and phone from using the same printer.
 */
@CapacitorPlugin(
    name = "Printer",
    permissions = {
        @Permission(alias = "bluetooth", strings = { Manifest.permission.BLUETOOTH_CONNECT, Manifest.permission.BLUETOOTH_SCAN }),
        @Permission(alias = "location", strings = { Manifest.permission.ACCESS_FINE_LOCATION })
    }
)
public class PrinterPlugin extends Plugin {
    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");
    private static final int CHUNK_SIZE = 512;
    private static final long CHUNK_PAUSE_MS = 5L;
    private static final long IDLE_CLOSE_MS = 20_000L;
    private static final long PAIR_TIMEOUT_MS = 120_000L;

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final ScheduledExecutorService idleCloser = Executors.newSingleThreadScheduledExecutor();
    private ScheduledFuture<?> idleClose;
    private BluetoothSocket cachedSocket;
    private String cachedAddress;

    private BroadcastReceiver discoveryReceiver;
    private BroadcastReceiver pairReceiver;
    private PluginCall pairCall;
    private String pairAddress;
    private final Handler main = new Handler(Looper.getMainLooper());
    private final Runnable pairTimeout = () -> finishPair(false);

    // ---------- permissions / adapter ----------

    private String permAlias() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ? "bluetooth" : "location";
    }

    private boolean hasPerms() {
        return getPermissionState(permAlias()) == PermissionState.GRANTED;
    }

    private BluetoothAdapter adapter() {
        BluetoothManager m = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
        return m == null ? null : m.getAdapter();
    }

    @PluginMethod
    public void ensureReady(PluginCall call) {
        if (!hasPerms()) {
            requestPermissionForAlias(permAlias(), call, "permsCallback");
            return;
        }
        afterPerms(call);
    }

    @PermissionCallback
    private void permsCallback(PluginCall call) {
        if (!hasPerms()) {
            call.reject("Bluetooth permission not granted", "permission");
            return;
        }
        afterPerms(call);
    }

    @SuppressWarnings("MissingPermission")
    private void afterPerms(PluginCall call) {
        BluetoothAdapter a = adapter();
        if (a == null) { call.reject("This phone has no Bluetooth", "unsupported"); return; }
        if (a.isEnabled()) { call.resolve(ok(true)); return; }
        startActivityForResult(call, new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE), "enableResult");
    }

    @ActivityCallback
    private void enableResult(PluginCall call, ActivityResult result) {
        BluetoothAdapter a = adapter();
        call.resolve(ok(a != null && a.isEnabled()));
    }

    private JSObject ok(boolean v) {
        JSObject o = new JSObject();
        o.put("value", v);
        return o;
    }

    // ---------- devices ----------

    @SuppressWarnings("MissingPermission")
    @PluginMethod
    public void getBondedDevices(PluginCall call) {
        BluetoothAdapter a = adapter();
        if (!hasPerms()) { call.reject("Bluetooth permission not granted", "permission"); return; }
        if (a == null || !a.isEnabled()) { call.reject("Bluetooth is off", "bluetooth-off"); return; }
        try {
            JSArray list = new JSArray();
            for (BluetoothDevice d : a.getBondedDevices()) {
                JSObject o = new JSObject();
                o.put("id", d.getAddress());
                o.put("name", d.getName() != null ? d.getName() : d.getAddress());
                list.put(o);
            }
            JSObject res = new JSObject();
            res.put("devices", list);
            call.resolve(res);
        } catch (SecurityException e) {
            call.reject("Bluetooth permission not granted", "permission");
        }
    }

    private void register(BroadcastReceiver r, IntentFilter f) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getContext().registerReceiver(r, f, Context.RECEIVER_EXPORTED);
        } else {
            getContext().registerReceiver(r, f);
        }
    }

    private void unregister(BroadcastReceiver r) {
        if (r == null) return;
        try { getContext().unregisterReceiver(r); } catch (Exception ignored) { }
    }

    @SuppressWarnings({ "deprecation", "MissingPermission" })
    private static BluetoothDevice deviceOf(Intent intent) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE, BluetoothDevice.class);
        }
        return intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
    }

    @SuppressWarnings("MissingPermission")
    private void stopDiscoveryInternal() {
        unregister(discoveryReceiver);
        discoveryReceiver = null;
        try { BluetoothAdapter a = adapter(); if (a != null) a.cancelDiscovery(); } catch (SecurityException ignored) { }
    }

    /** About 12 s of searching; each device arrives as a "deviceFound" event, then "discoveryFinished". */
    @SuppressWarnings("MissingPermission")
    @PluginMethod
    public void startDiscovery(PluginCall call) {
        BluetoothAdapter a = adapter();
        if (!hasPerms()) { call.reject("Bluetooth permission not granted", "permission"); return; }
        if (a == null || !a.isEnabled()) { call.reject("Bluetooth is off", "bluetooth-off"); return; }
        try {
            stopDiscoveryInternal();
            discoveryReceiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context c, Intent intent) {
                    if (BluetoothDevice.ACTION_FOUND.equals(intent.getAction())) {
                        BluetoothDevice d = deviceOf(intent);
                        if (d == null) return;
                        String name;
                        boolean bonded;
                        try {
                            name = d.getName();
                            bonded = d.getBondState() == BluetoothDevice.BOND_BONDED;
                        } catch (SecurityException e) { return; }
                        if (name == null || name.trim().isEmpty()) return;
                        JSObject o = new JSObject();
                        o.put("id", d.getAddress());
                        o.put("name", name);
                        o.put("bonded", bonded);
                        notifyListeners("deviceFound", o);
                    } else if (BluetoothAdapter.ACTION_DISCOVERY_FINISHED.equals(intent.getAction())) {
                        stopDiscoveryInternal();
                        notifyListeners("discoveryFinished", new JSObject());
                    }
                }
            };
            IntentFilter f = new IntentFilter();
            f.addAction(BluetoothDevice.ACTION_FOUND);
            f.addAction(BluetoothAdapter.ACTION_DISCOVERY_FINISHED);
            register(discoveryReceiver, f);
            call.resolve(ok(a.startDiscovery()));
        } catch (SecurityException e) {
            stopDiscoveryInternal();
            call.reject("Bluetooth permission not granted", "permission");
        }
    }

    @PluginMethod
    public void stopDiscovery(PluginCall call) {
        stopDiscoveryInternal();
        call.resolve();
    }

    private void finishPair(boolean paired) {
        main.removeCallbacks(pairTimeout);
        unregister(pairReceiver);
        pairReceiver = null;
        pairAddress = null;
        PluginCall c = pairCall;
        pairCall = null;
        if (c != null) c.resolve(ok(paired));
    }

    /** Android shows its own PIN box; the person types the PIN printed on the printer (often 0000 or 1234). */
    @SuppressWarnings("MissingPermission")
    @PluginMethod
    public void pair(PluginCall call) {
        String address = call.getString("address");
        BluetoothAdapter a = adapter();
        if (address == null) { call.reject("No address", "unreachable"); return; }
        if (!hasPerms()) { call.reject("Bluetooth permission not granted", "permission"); return; }
        if (a == null || !a.isEnabled()) { call.reject("Bluetooth is off", "bluetooth-off"); return; }
        try {
            BluetoothDevice device = a.getRemoteDevice(address);
            if (device.getBondState() == BluetoothDevice.BOND_BONDED) { call.resolve(ok(true)); return; }
            finishPair(false);
            stopDiscoveryInternal();
            call.setKeepAlive(true);
            pairCall = call;
            pairAddress = address;
            pairReceiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context c, Intent intent) {
                    BluetoothDevice d = deviceOf(intent);
                    if (d == null || !d.getAddress().equalsIgnoreCase(pairAddress)) return;
                    int st = intent.getIntExtra(BluetoothDevice.EXTRA_BOND_STATE, BluetoothDevice.ERROR);
                    if (st == BluetoothDevice.BOND_BONDED) finishPair(true);
                    else if (st == BluetoothDevice.BOND_NONE) finishPair(false);
                }
            };
            register(pairReceiver, new IntentFilter(BluetoothDevice.ACTION_BOND_STATE_CHANGED));
            main.postDelayed(pairTimeout, PAIR_TIMEOUT_MS);
            if (!device.createBond()) finishPair(device.getBondState() == BluetoothDevice.BOND_BONDED);
        } catch (SecurityException e) {
            finishPair(false);
            call.reject("Bluetooth permission not granted", "permission");
        } catch (IllegalArgumentException e) {
            call.reject("Not a Bluetooth address", "unreachable");
        }
    }

    @PluginMethod
    public void openBluetoothSettings(PluginCall call) {
        Intent i = new Intent(Settings.ACTION_BLUETOOTH_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(i);
        call.resolve();
    }

    // ---------- printing ----------

    /** Writes base64 ESC/POS bytes to the printer, reusing a recent connection when there is one. */
    @SuppressWarnings("MissingPermission")
    @PluginMethod
    public void write(PluginCall call) {
        String address = call.getString("address");
        String data = call.getString("data");
        BluetoothAdapter a = adapter();
        if (address == null || data == null) { call.reject("Missing address or data", "unknown"); return; }
        if (!hasPerms()) { call.reject("Bluetooth permission not granted", "permission"); return; }
        if (a == null || !a.isEnabled()) { call.reject("Bluetooth is off", "bluetooth-off"); return; }
        executor.execute(() -> {
            try {
                byte[] bytes = Base64.decode(data, Base64.DEFAULT);
                cancelIdleClose();
                boolean reused = cachedSocket != null && cachedSocket.isConnected() && address.equals(cachedAddress);
                BluetoothSocket socket = reused ? cachedSocket : openSocket(a, address);
                try {
                    sendBytes(socket, bytes);
                } catch (IOException e) {
                    // A cached socket can claim to be connected after the printer went away. Retry once, fresh.
                    if (!reused) throw e;
                    socket = openSocket(a, address);
                    sendBytes(socket, bytes);
                }
                cachedSocket = socket;
                cachedAddress = address;
                scheduleIdleClose();
                call.resolve();
            } catch (SecurityException e) {
                closeCached();
                call.reject("Bluetooth permission not granted", "permission");
            } catch (IOException e) {
                closeCached();
                call.reject("Could not reach the printer. Is it on and nearby?", "unreachable");
            } catch (Exception e) {
                closeCached();
                call.reject(e.getMessage() != null ? e.getMessage() : "Print failed", "unknown");
            }
        });
    }

    @SuppressWarnings("MissingPermission")
    private BluetoothSocket openSocket(BluetoothAdapter a, String address) throws IOException {
        closeCached();
        try { a.cancelDiscovery(); } catch (SecurityException ignored) { }
        BluetoothSocket s = a.getRemoteDevice(address).createRfcommSocketToServiceRecord(SPP_UUID);
        s.connect();
        return s;
    }

    private void sendBytes(BluetoothSocket socket, byte[] bytes) throws IOException {
        OutputStream out = socket.getOutputStream();
        int offset = 0;
        while (offset < bytes.length) {
            int end = Math.min(offset + CHUNK_SIZE, bytes.length);
            out.write(bytes, offset, end - offset);
            out.flush();
            offset = end;
            if (offset < bytes.length) sleep(CHUNK_PAUSE_MS);
        }
        sleep(150); // let the printer drain its buffer, or the tail of the receipt can be lost
    }

    private static void sleep(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException ignored) { Thread.currentThread().interrupt(); }
    }

    private void closeCached() {
        try { if (cachedSocket != null) cachedSocket.close(); } catch (IOException ignored) { }
        cachedSocket = null;
        cachedAddress = null;
    }

    private void cancelIdleClose() {
        if (idleClose != null) idleClose.cancel(false);
        idleClose = null;
    }

    private void scheduleIdleClose() {
        cancelIdleClose();
        idleClose = idleCloser.schedule(() -> executor.execute(this::closeCached), IDLE_CLOSE_MS, TimeUnit.MILLISECONDS);
    }

    // ---------- share / save the bill image ----------

    private File writeCacheImage(String base64, String fileName) throws IOException {
        File dir = new File(getContext().getCacheDir(), "bills");
        if (!dir.exists() && !dir.mkdirs()) throw new IOException("Cannot create cache folder");
        File f = new File(dir, fileName);
        try (FileOutputStream fos = new FileOutputStream(f)) {
            fos.write(Base64.decode(base64, Base64.DEFAULT));
        }
        return f;
    }

    /** Shares a PNG through the phone's share sheet, or straight to WhatsApp when target is "whatsapp". */
    @PluginMethod
    public void shareImage(PluginCall call) {
        String data = call.getString("data");
        String fileName = call.getString("fileName", "bill.png");
        String text = call.getString("text", "");
        String target = call.getString("target", "");
        if (data == null) { call.reject("No image", "unknown"); return; }
        try {
            File f = writeCacheImage(data, fileName);
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", f);
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType("image/png");
            send.putExtra(Intent.EXTRA_STREAM, uri);
            if (text != null && !text.isEmpty()) send.putExtra(Intent.EXTRA_TEXT, text);
            send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            if ("whatsapp".equals(target)) {
                String pkg = installed("com.whatsapp") ? "com.whatsapp" : installed("com.whatsapp.w4b") ? "com.whatsapp.w4b" : null;
                if (pkg == null) { call.reject("WhatsApp is not installed", "no-whatsapp"); return; }
                send.setPackage(pkg);
                getActivity().startActivity(send);
            } else {
                getActivity().startActivity(Intent.createChooser(send, "Share bill"));
            }
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage() != null ? e.getMessage() : "Share failed", "unknown");
        }
    }

    private boolean installed(String pkg) {
        try {
            getContext().getPackageManager().getPackageInfo(pkg, 0);
            return true;
        } catch (PackageManager.NameNotFoundException e) {
            return false;
        }
    }

    /** Saves a PNG to Pictures/Pandit Jewellers (gallery). Android 10+ needs no storage permission. */
    @PluginMethod
    public void saveImage(PluginCall call) {
        String data = call.getString("data");
        String fileName = call.getString("fileName", "bill.png");
        if (data == null) { call.reject("No image", "unknown"); return; }
        try {
            byte[] bytes = Base64.decode(data, Base64.DEFAULT);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues v = new ContentValues();
                v.put(MediaStore.Images.Media.DISPLAY_NAME, fileName);
                v.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
                v.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/Pandit Jewellers");
                Uri uri = getContext().getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, v);
                if (uri == null) throw new IOException("Cannot create image");
                try (OutputStream os = getContext().getContentResolver().openOutputStream(uri)) {
                    if (os == null) throw new IOException("Cannot write image");
                    os.write(bytes);
                }
            } else {
                File dir = new File(getContext().getExternalFilesDir(Environment.DIRECTORY_PICTURES), "Pandit Jewellers");
                if (!dir.exists() && !dir.mkdirs()) throw new IOException("Cannot create folder");
                try (FileOutputStream fos = new FileOutputStream(new File(dir, fileName))) { fos.write(bytes); }
            }
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage() != null ? e.getMessage() : "Save failed", "unknown");
        }
    }

    @Override
    protected void handleOnDestroy() {
        stopDiscoveryInternal();
        finishPair(false);
        executor.execute(this::closeCached);
        executor.shutdown();
        idleCloser.shutdownNow();
    }
}
