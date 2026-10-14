package com.waddle.app.activities;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.animation.AlphaAnimation;
import android.view.animation.Animation;
import android.view.animation.ScaleAnimation;
import android.view.animation.AnimationSet;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import com.waddle.app.R;

public class SplashActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_splash);

        TextView logoText = findViewById(R.id.text_logo);
        TextView taglineText = findViewById(R.id.text_tagline);
        TextView noteText = findViewById(R.id.text_note);

        // Fade in logo
        AlphaAnimation fadeIn = new AlphaAnimation(0f, 1f);
        fadeIn.setDuration(600);
        fadeIn.setFillAfter(true);
        logoText.startAnimation(fadeIn);

        // Tagline appears after logo
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            AlphaAnimation fadeInTagline = new AlphaAnimation(0f, 1f);
            fadeInTagline.setDuration(500);
            fadeInTagline.setFillAfter(true);
            taglineText.startAnimation(fadeInTagline);
            noteText.startAnimation(fadeInTagline);
        }, 400);

        // Navigate to MainActivity after 2 seconds
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            Intent intent = new Intent(SplashActivity.this, MainActivity.class);
            startActivity(intent);
            overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out);
            finish();
        }, 2200);
    }
}
