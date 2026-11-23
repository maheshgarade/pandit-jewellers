package com.panditjewellers.app;

import android.Manifest;
import android.content.Context;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;

import androidx.core.location.LocationManagerCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * Where the phone is, for the shop lock: the connected Wi-Fi's BSSID (router MAC) and a GPS fix.
 * Both need fine location permission and location turned on (Android hides the BSSID otherwise).
 */
@CapacitorPlugin(
    name = "ShopLock",
    permissions = {
        @Permission(alias = "location", strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION })
    }
)
public class ShopLockPlugin extends Plugin {
    private static final long FIX_TIMEOUT_MS = 15_000L;
    private static final long LAST_KNOWN_MAX_AGE_MS = 5 * 60_000L;
    private final Handler main = new Handler(Looper.getMainLooper());

    /** Ask for location permission if needed, then run `next`. */
    private boolean needPermission(PluginCall call, String callback) {
        if (getPermissionState("location") != PermissionState.GRANTED) {
            requestPermissionForAlias("location", call, callback);
            return true;
        }
        return false;
    }

    private boolean locationOn(PluginCall call) {
        LocationManager lm = (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
        if (lm == null || !LocationManagerCompat.isLocationEnabled(lm)) {
            call.reject("Location is off", "location-off");
            return false;
        }
        return true;
    }

    @PluginMethod
    public void getWifi(PluginCall call) {
        if (needPermission(call, "wifiPerm")) return;
        readWifi(call);
    }

    @PermissionCallback
    private void wifiPerm(PluginCall call) {
        if (getPermissionState("location") != PermissionState.GRANTED) {
            call.reject("Location permission denied", "permission");
            return;
        }
        readWifi(call);
    }

    @SuppressWarnings("deprecation")
    private void readWifi(PluginCall call) {
        if (!locationOn(call)) return;
        WifiManager wm = (WifiManager) getContext().getApplicationContext().getSystemService(Context.WIFI_SERVICE);
        JSObject r = new JSObject();
        if (wm == null || !wm.isWifiEnabled()) {
            call.reject("Wi-Fi is off", "wifi-off");
            return;
        }
        WifiInfo info = wm.getConnectionInfo();
        String bssid = info == null ? null : info.getBSSID();
        if (bssid == null || bssid.equals("02:00:00:00:00:00") || info.getNetworkId() == -1) {
            r.put("connected", false);
            call.resolve(r);
            return;
        }
        String ssid = info.getSSID();
        if (ssid != null && ssid.startsWith("\"") && ssid.endsWith("\"")) ssid = ssid.substring(1, ssid.length() - 1);
        r.put("connected", true);
        r.put("bssid", bssid.toLowerCase());
        r.put("ssid", ssid == null || ssid.equals("<unknown ssid>") ? "" : ssid);
        call.resolve(r);
    }

    @PluginMethod
    public void getLocation(PluginCall call) {
        if (needPermission(call, "locationPerm")) return;
        readLocation(call);
    }

    @PermissionCallback
    private void locationPerm(PluginCall call) {
        if (getPermissionState("location") != PermissionState.GRANTED) {
            call.reject("Location permission denied", "permission");
            return;
        }
        readLocation(call);
    }

    @SuppressWarnings({ "MissingPermission", "deprecation" })
    private void readLocation(PluginCall call) {
        if (!locationOn(call)) return;
        LocationManager lm = (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);

        // A recent fix is good enough and avoids waiting for GPS indoors.
        Location best = null;
        for (String p : new String[] { LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER }) {
            try {
                Location l = lm.getLastKnownLocation(p);
                if (l != null && ageMs(l) < LAST_KNOWN_MAX_AGE_MS && (best == null || l.getAccuracy() < best.getAccuracy())) best = l;
            } catch (Exception ignored) {}
        }
        if (best != null && best.getAccuracy() <= 50) {
            call.resolve(toJs(best));
            return;
        }

        final Location fallback = best;
        final boolean[] done = { false };
        final String provider = lm.isProviderEnabled(LocationManager.GPS_PROVIDER) ? LocationManager.GPS_PROVIDER : LocationManager.NETWORK_PROVIDER;
        final CancellationSignal cancel = new CancellationSignal();
        final LocationListener[] listener = { null };

        Runnable timeout = () -> {
            if (done[0]) return;
            done[0] = true;
            cancel.cancel();
            if (listener[0] != null) lm.removeUpdates(listener[0]);
            if (fallback != null) call.resolve(toJs(fallback));
            else call.reject("No location fix", "no-fix");
        };
        main.postDelayed(timeout, FIX_TIMEOUT_MS);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            lm.getCurrentLocation(provider, cancel, getContext().getMainExecutor(), (Location l) -> {
                if (done[0]) return;
                if (l == null) {
                    timeout.run();
                    return;
                }
                done[0] = true;
                main.removeCallbacks(timeout);
                call.resolve(toJs(l));
            });
        } else {
            listener[0] = new LocationListener() {
                @Override
                public void onLocationChanged(Location l) {
                    if (done[0]) return;
                    done[0] = true;
                    main.removeCallbacks(timeout);
                    lm.removeUpdates(this);
                    call.resolve(toJs(l));
                }
                @Override public void onStatusChanged(String p, int s, Bundle b) {}
                @Override public void onProviderEnabled(String p) {}
                @Override public void onProviderDisabled(String p) {}
            };
            lm.requestSingleUpdate(provider, listener[0], Looper.getMainLooper());
        }
    }

    private static long ageMs(Location l) {
        return (SystemClock.elapsedRealtimeNanos() - l.getElapsedRealtimeNanos()) / 1_000_000L;
    }

    @SuppressWarnings("deprecation")
    private static JSObject toJs(Location l) {
        JSObject r = new JSObject();
        r.put("lat", l.getLatitude());
        r.put("lng", l.getLongitude());
        r.put("accuracy", l.getAccuracy());
        boolean mock = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ? l.isMock() : l.isFromMockProvider();
        r.put("mock", mock);
        return r;
    }
}
