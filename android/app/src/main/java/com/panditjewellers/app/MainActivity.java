package com.panditjewellers.app;

import android.graphics.Color;
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
        container.setBackgroundColor(Color.parseColor("#6B21A8")); // header purple behind the bars

        ViewCompat.setOnApplyWindowInsetsListener(container, (v, windowInsets) -> {
            Insets insets = windowInsets.getInsets(
                WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
            );
            v.setPadding(insets.left, insets.top, insets.right, insets.bottom);
            return WindowInsetsCompat.CONSUMED;
        });

        // White status/nav bar icons on the purple background.
        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView())
            .setAppearanceLightStatusBars(false);
        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView())
            .setAppearanceLightNavigationBars(false);
    }
}
