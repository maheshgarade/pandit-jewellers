package com.panditjewellers.app;

import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.view.View;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PrinterPlugin.class);
        registerPlugin(ShopLockPlugin.class);
        super.onCreate(savedInstanceState);

        // Android 15+ forces edge-to-edge, so the WebView draws under the status bar,
        // camera cutout and navigation bar. Pad its container by those insets.
        View container = (View) getBridge().getWebView().getParent();
        // Same left-to-right gradient as the web header (Tailwind v4 purple-800 -> purple-900),
        // so the status bar area and the header read as one band.
        container.setBackground(new GradientDrawable(
            GradientDrawable.Orientation.LEFT_RIGHT,
            new int[] { Color.parseColor("#6E11B0"), Color.parseColor("#59168B") }
        ));
        // Android 10+ lays a translucent scrim over the bars for contrast; it made the status bar look lighter.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            getWindow().setStatusBarContrastEnforced(false);
            getWindow().setNavigationBarContrastEnforced(false);
        }

        ViewCompat.setOnApplyWindowInsetsListener(container, (v, windowInsets) -> {
            Insets insets = windowInsets.getInsets(
                WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
            );
            // When the keyboard is open, pad by its height instead so the WebView shrinks above it
            // and the page can scroll the focused field into view.
            Insets ime = windowInsets.getInsets(WindowInsetsCompat.Type.ime());
            v.setPadding(insets.left, insets.top, insets.right, Math.max(insets.bottom, ime.bottom));
            return WindowInsetsCompat.CONSUMED;
        });

        // White status/nav bar icons on the purple background.
        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView())
            .setAppearanceLightStatusBars(false);
        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView())
            .setAppearanceLightNavigationBars(false);
    }
}
