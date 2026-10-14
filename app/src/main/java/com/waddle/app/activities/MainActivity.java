package com.waddle.app.activities;

import android.Manifest;
import android.animation.ObjectAnimator;
import android.animation.ValueAnimator;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.view.View;
import android.view.WindowManager;
import android.view.animation.AccelerateDecelerateInterpolator;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;
import com.waddle.app.R;
import java.util.ArrayList;

/** Native Android screen hosting the original Pencil vector assets. */
public class MainActivity extends AppCompatActivity {
    private static final int AUDIO_PERMISSION = 41;
    private final String[] names = {"West", "Pam", "Batman", "Indiana Jones", "Songbird", "Kyle Rayner", "Rorschach", "Homer", "Dumbledore", "C-3PO", "Sheldon Cooper", "Ted Mosby", "Reed Richards", "Ultron", "Capitão América", "Marília", "Hal Jordan", "Tony Stark"};
    private final int[] bodies = {R.drawable.mascot_west_body,R.drawable.mascot_pam_body,R.drawable.mascot_batman_body,R.drawable.mascot_indiana_body,R.drawable.mascot_songbird_body,R.drawable.mascot_kyle_body,R.drawable.mascot_rorschach_body,R.drawable.mascot_homer_body,R.drawable.mascot_dumbledore_body,R.drawable.mascot_c3po_body,R.drawable.mascot_sheldon_body,R.drawable.mascot_ted_body,R.drawable.mascot_reed_body,R.drawable.mascot_ultron_body,R.drawable.mascot_captain_body,R.drawable.mascot_marilia_body,R.drawable.mascot_hal_body,R.drawable.mascot_tony_body};
    private final int[] eyes = {R.drawable.mascot_west_eyes,R.drawable.mascot_pam_eyes,R.drawable.mascot_batman_eyes,R.drawable.mascot_indiana_eyes,R.drawable.mascot_songbird_eyes,R.drawable.mascot_kyle_eyes,R.drawable.mascot_rorschach_eyes,R.drawable.mascot_homer_eyes,R.drawable.mascot_dumbledore_eyes,R.drawable.mascot_c3po_eyes,R.drawable.mascot_sheldon_eyes,R.drawable.mascot_ted_eyes,R.drawable.mascot_reed_eyes,R.drawable.mascot_ultron_eyes,R.drawable.mascot_captain_eyes,R.drawable.mascot_marilia_eyes,R.drawable.mascot_hal_eyes,R.drawable.mascot_tony_eyes};
    private final Handler handler = new Handler(Looper.getMainLooper());
    private SharedPreferences preferences;
    private ImageView bodyView, eyesView;
    private ImageButton talkButton, muteButton;
    private TextView selector, status;
    private View stage, ring;
    private ObjectAnimator breathing;
    private SpeechRecognizer recognizer;
    private boolean muted, listening, active;
    private int selected;
    private final Runnable blink = new Runnable() {
        @Override public void run() {
            if (!active) return;
            eyesView.animate().scaleY(0.08f).setDuration(95).withEndAction(() -> eyesView.animate().scaleY(1f).setDuration(140).start()).start();
            handler.postDelayed(this, 3200 + (long)(Math.random() * 2300));
        }
    };

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        setContentView(R.layout.activity_main);
        preferences = getSharedPreferences("mascot", MODE_PRIVATE);
        selected = Math.max(0, Math.min(names.length - 1, preferences.getInt("selected", 0)));
        muted = preferences.getBoolean("muted", false);
        bodyView = findViewById(R.id.mascot_body);
        eyesView = findViewById(R.id.mascot_eyes);
        stage = findViewById(R.id.mascot_stage);
        ring = findViewById(R.id.mic_ring);
        selector = findViewById(R.id.choose_agent);
        status = findViewById(R.id.voice_status);
        talkButton = findViewById(R.id.talk_button);
        muteButton = findViewById(R.id.mute_button);
        selector.setOnClickListener(v -> new MaterialAlertDialogBuilder(this)
            .setTitle("Trocar mascote")
            .setSingleChoiceItems(names, selected, (dialog, which) -> {
                stopListening(); selected = which;
                preferences.edit().putInt("selected", selected).apply();
                updateMascot(); updateControls(); dialog.dismiss();
            }).setNegativeButton("Fechar", null).show());
        talkButton.setOnClickListener(v -> {
            if (muted) { muted = false; preferences.edit().putBoolean("muted", false).apply(); updateControls(); }
            if (listening) { stopListening(); updateControls(); } else requestListening();
        });
        muteButton.setOnClickListener(v -> {
            muted = !muted; preferences.edit().putBoolean("muted", muted).apply();
            if (muted) stopListening();
            updateControls();
        });
        updateMascot(); updateControls();
        breathing = ObjectAnimator.ofFloat(stage, View.TRANSLATION_Y, 0f, -6f * getResources().getDisplayMetrics().density, 0f);
        breathing.setDuration(4400); breathing.setInterpolator(new AccelerateDecelerateInterpolator()); breathing.setRepeatCount(ValueAnimator.INFINITE);
    }
    private void updateMascot() {
        bodyView.setImageResource(bodies[selected]); eyesView.setImageResource(eyes[selected]);
        selector.setText(names[selected]); selector.setContentDescription("Trocar mascote. Atual: " + names[selected]);
        stage.setContentDescription("Mascote " + names[selected]);
    }
    private void updateControls() {
        talkButton.setImageResource(muted ? R.drawable.ic_voice_muted : R.drawable.ic_voice_mic);
        muteButton.setImageResource(muted ? R.drawable.ic_voice_muted : R.drawable.ic_voice_mic);
        muteButton.setAlpha(muted ? 1f : 0.6f);
        muteButton.setContentDescription(muted ? "Ativar microfone" : "Silenciar microfone");
        talkButton.setContentDescription(listening ? "Parar de ouvir" : muted ? "Ativar microfone e falar" : "Toque para falar");
        status.setText(muted ? "Microfone silenciado" : listening ? "Ouvindo…" : "Toque para falar");
        ring.setAlpha(muted ? 0.35f : 1f);
        talkButton.setSelected(listening);
    }
    private void requestListening() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.RECORD_AUDIO}, AUDIO_PERMISSION); return;
        }
        if (!SpeechRecognizer.isRecognitionAvailable(this)) { status.setText("Reconhecimento de voz indisponível neste aparelho"); return; }
        if (recognizer == null) {
            recognizer = SpeechRecognizer.createSpeechRecognizer(this);
            recognizer.setRecognitionListener(new RecognitionListener() {
                public void onReadyForSpeech(Bundle params) { listening = true; updateControls(); }
                public void onBeginningOfSpeech() { }
                public void onRmsChanged(float rms) { if (listening) ring.setScaleX(1f + Math.max(0, Math.min(rms, 10)) * 0.008f); }
                public void onBufferReceived(byte[] buffer) { }
                public void onEndOfSpeech() { listening = false; ring.setScaleX(1f); status.setText("Reconhecendo…"); }
                public void onError(int error) {
                    listening = false; ring.setScaleX(1f); updateControls();
                    if (!active || muted || error == SpeechRecognizer.ERROR_CLIENT) return;
                    status.setText(error == SpeechRecognizer.ERROR_NO_MATCH || error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT ? "Não ouvi. Toque para tentar novamente" : error == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS ? "Permita o microfone nas configurações do aplicativo" : "Não foi possível ouvir. Tente novamente");
                }
                public void onResults(Bundle results) {
                    listening = false; ring.setScaleX(1f); updateControls();
                    if (!active || muted) return;
                    ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                    if (matches != null && !matches.isEmpty()) status.setText("Voz reconhecida. A conexão com o agente ainda será configurada.");
                }
                public void onPartialResults(Bundle partialResults) { }
                public void onEvent(int eventType, Bundle params) { }
            });
        }
        listening = true; updateControls();
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "pt-BR");
        try { recognizer.startListening(intent); }
        catch (RuntimeException error) { listening = false; updateControls(); status.setText("Não foi possível iniciar o microfone"); }
    }
    private void stopListening() {
        listening = false;
        if (recognizer != null) recognizer.cancel();
        if (ring != null) ring.setScaleX(1f);
    }
    @Override public void onRequestPermissionsResult(int code, String[] permissions, int[] grants) {
        super.onRequestPermissionsResult(code, permissions, grants);
        if (code == AUDIO_PERMISSION && active && !muted) {
            if (grants.length > 0 && grants[0] == PackageManager.PERMISSION_GRANTED) requestListening();
            else status.setText("Permita o microfone para falar");
        }
    }
    @Override protected void onResume() { super.onResume(); active = true; if (breathing != null) breathing.start(); handler.postDelayed(blink, 2600); }
    @Override protected void onPause() {
        active = false; handler.removeCallbacks(blink); stopListening();
        eyesView.animate().cancel(); eyesView.setScaleY(1f);
        if (breathing != null) breathing.cancel();
        super.onPause();
    }
    @Override protected void onDestroy() { handler.removeCallbacksAndMessages(null); if (recognizer != null) recognizer.destroy(); super.onDestroy(); }
}
