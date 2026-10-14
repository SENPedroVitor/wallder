package com.waddle.app.activities;

import android.animation.ObjectAnimator;
import android.animation.ValueAnimator;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.WindowManager;
import android.view.animation.AccelerateDecelerateInterpolator;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;
import com.waddle.app.R;
import com.waddle.app.RuntimeConnection;
import org.json.JSONArray;
import org.json.JSONObject;
import android.graphics.Color;
import android.text.InputType;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import androidx.appcompat.app.AlertDialog;
import java.util.UUID;

/** Native Android screen hosting the original Pencil vector assets. */
public class MainActivity extends AppCompatActivity {
    private final RuntimeConnection connection = new RuntimeConnection();
    private final String[] agentIds = {"west","pam","batman","indy","songbird","kyle","rorschach","homer","dumbledore","c3po","sheldon","ted","reed","ultron","captain","marilia","hal","tony"};
    private String conversationId;
    private boolean sending;
    private AlertDialog conversationDialog;
    private TextView transcript;
    private EditText draft;
    private Button sendButton;
    private String approvalShown;
    private boolean loadingHistory;
    private final Runnable pollHistory = new Runnable() {
        @Override public void run() {
            if (active && conversationDialog != null && conversationDialog.isShowing() && !sending) loadConversation();
            if (active) handler.postDelayed(this, 5000);
        }
    };
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

    private boolean active;
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
                selected = which; conversationId = null;
                preferences.edit().putInt("selected", selected).apply();
                updateMascot(); updateControls(); refreshConnection(); dialog.dismiss();
            }).setNegativeButton("Fechar", null).show());
        talkButton.setOnClickListener(v -> openConversation());
        muteButton.setOnClickListener(v -> status.setText("Voz fica para uma próxima etapa"));
        muteButton.setAlpha(0.3f);
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
        talkButton.setImageResource(R.drawable.ic_agent_keyboard);
        talkButton.setContentDescription("Conversar por texto com " + names[selected]);
        muteButton.setImageResource(R.drawable.ic_voice_muted);
        muteButton.setContentDescription("Voz ainda não disponível");
        status.setText("Toque para conversar por texto");
    }
    private interface UiEvent { void accept(JSONObject event); }
    private RuntimeConnection.Listener listener(UiEvent event, java.util.function.Consumer<String> failure) {
        return new RuntimeConnection.Listener() {
            public void event(JSONObject value) { runOnUiThread(() -> { if (!isDestroyed()) event.accept(value); }); }
            public void failed(String message) { runOnUiThread(() -> { if (!isDestroyed()) failure.accept(message); }); }
        };
    }
    private void refreshConnection() {
        final String agentId = agentIds[selected];
        connection.request("/api/status", null, false, listener(result -> {
            if (!agentId.equals(agentIds[selected]) || sending) return;
            status.setText(result.optBoolean("ready") ? "Conectado · " + names[selected] : "Agente indisponível no servidor");
        }, message -> { if (agentId.equals(agentIds[selected])) status.setText(message); }));
    }
    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
    private void openConversation() {
        if (conversationDialog != null && conversationDialog.isShowing()) return;
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL); panel.setPadding(dp(20), dp(12), dp(20), dp(8));
        ScrollView scroll = new ScrollView(this);
        transcript = new TextView(this); transcript.setTextColor(Color.WHITE); transcript.setTextSize(15); transcript.setTextIsSelectable(true); transcript.setText("Carregando conversa…");
        scroll.addView(transcript);
        int available = Math.round(getResources().getDisplayMetrics().heightPixels * 0.36f);
        panel.addView(scroll, new LinearLayout.LayoutParams(-1, available));
        draft = new EditText(this); draft.setTextColor(Color.WHITE); draft.setHintTextColor(Color.GRAY); draft.setHint("Mensagem para " + names[selected]);
        draft.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_MULTI_LINE | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES); draft.setMaxLines(4);
        draft.setFilters(new android.text.InputFilter[]{new android.text.InputFilter.LengthFilter(20000)});
        panel.addView(draft, new LinearLayout.LayoutParams(-1, -2));
        sendButton = new Button(this); sendButton.setText(sending ? "Agente trabalhando…" : "Carregando…"); sendButton.setEnabled(false); sendButton.setOnClickListener(v -> sendMessage());
        panel.addView(sendButton, new LinearLayout.LayoutParams(-1, dp(48)));
        conversationDialog = new MaterialAlertDialogBuilder(this).setTitle(names[selected]).setView(panel)
            .setNegativeButton("Fechar", null).setNeutralButton("Abrir no painel", (dialog, which) -> startActivity(new Intent(Intent.ACTION_VIEW, android.net.Uri.parse(RuntimeConnection.SERVER))))
            .create();
        conversationDialog.setOnDismissListener(dialog -> { /* Server work continues and is saved even when this panel closes. */ });
        conversationDialog.show();
        loadConversation();
    }
    private void loadConversation() {
        if (loadingHistory) return;
        loadingHistory = true;
        final String agentId = agentIds[selected];
        connection.request("/api/mobile/conversation?agent=" + agentId, null, false, listener(result -> {
            loadingHistory = false;
            if (!agentId.equals(agentIds[selected]) || conversationDialog == null || !conversationDialog.isShowing() || sending) return;
            conversationId = result.isNull("id") ? null : result.optString("id", null);
            JSONObject agent = result.optJSONObject("agent");
            String name = agent != null ? agent.optString("name", names[selected]) : names[selected];
            conversationDialog.setTitle(name);
            JSONArray messages = result.optJSONArray("messages");
            StringBuilder text = new StringBuilder();
            if (messages != null) for (int i = 0; i < messages.length(); i++) {
                JSONObject message = messages.optJSONObject(i); if (message == null) continue;
                String content = message.optString("text", "");
                if (message.optBoolean("hasWidget")) content = "Conteúdo visual disponível no painel web.";
                if (!content.isEmpty()) text.append(message.optString("sender").equals("you") ? "Você" : name).append("\n").append(content).append("\n\n");
            }
            if (text.length() == 0) text.append("Sua conversa com ").append(name).append(" começa aqui.");
            transcript.setText(text.toString());
            boolean busy = result.optBoolean("busy");
            sendButton.setEnabled(!busy); sendButton.setText(busy ? "Agente trabalhando…" : "Enviar");
            status.setText(busy ? name + " está trabalhando…" : "Conectado · " + name);
            if (result.optJSONObject("approval") != null) showApproval(result.optJSONObject("approval"));
        }, message -> {
            loadingHistory = false;
            if (agentId.equals(agentIds[selected]) && transcript != null) transcript.setText(message);
        }));
    }
    private void sendMessage() {
        if (sending || draft == null || draft.getText().toString().trim().isEmpty()) return;
        final String agentId = agentIds[selected], name = names[selected], message = draft.getText().toString().trim();
        JSONObject payload = new JSONObject();
        try {
            payload.put("requestId", UUID.randomUUID().toString()); payload.put("agentId", agentId); payload.put("message", message);
            if (conversationId != null) payload.put("conversationId", conversationId);
        } catch (Exception cause) { status.setText("Não foi possível preparar a mensagem"); return; }
        sending = true; selector.setEnabled(false); sendButton.setEnabled(false); sendButton.setText("Enviando…"); draft.setEnabled(false);
        final String previous = transcript.getText().toString(); final StringBuilder response = new StringBuilder();
        transcript.setText(previous + "\nVocê\n" + message + "\n\n" + name + "\n");
        connection.request("/api/mobile/chat", payload, true, listener(event -> {
            if (!agentId.equals(agentIds[selected])) return;
            switch (event.optString("type")) {
                case "conversation": conversationId = event.optString("conversationId", conversationId); draft.setText(""); break;
                case "activity": status.setText(event.optString("text", "Trabalhando…")); break;
                case "delta": response.append(event.optString("text")); transcript.setText(previous + "\nVocê\n" + message + "\n\n" + name + "\n" + response); break;
                case "widget": status.setText("Conteúdo visual disponível no painel web"); break;
                case "approval": showApproval(event); break;
                case "error": status.setText(event.optString("message", "Não foi possível concluir")); break;
                case "done":
                    sending = false; selector.setEnabled(true); sendButton.setEnabled(true); sendButton.setText("Enviar"); draft.setEnabled(true);
                    if (event.optString("status").equals("completed")) {
                        draft.setText(""); status.setText("Conectado · " + name); loadConversation();
                    } else transcript.append("\n\nA resposta não foi concluída. Confira o histórico antes de repetir.");
                    break;
            }
        }, problem -> {
            sending = false; selector.setEnabled(true); if (sendButton != null) { sendButton.setEnabled(true); sendButton.setText("Enviar"); }
            if (draft != null) draft.setEnabled(true);
            status.setText(problem); if (transcript != null) transcript.append("\n\n" + problem);
        }));
    }
    private void showApproval(JSONObject event) {
        String id = event.optString("id");
        if (!active || id.isEmpty() || id.equals(approvalShown)) return;
        approvalShown = id;
        String details = event.opt("details") == null ? "" : event.opt("details").toString();
        new MaterialAlertDialogBuilder(this).setTitle(event.optString("title", "Autorizar ação"))
            .setMessage(details).setPositiveButton("Autorizar", (dialog, which) -> decideApproval(id, "accept"))
            .setNegativeButton("Recusar", (dialog, which) -> decideApproval(id, "decline"))
            .setOnCancelListener(dialog -> { approvalShown = null; }).show();
    }
    private void decideApproval(String id, String decision) {
        JSONObject payload = new JSONObject();
        try { payload.put("id", id); payload.put("decision", decision); } catch (Exception ignored) { return; }
        connection.request("/api/approvals", payload, false, listener(result -> status.setText(decision.equals("accept") ? "Ação autorizada" : "Ação recusada"), message -> { approvalShown = null; status.setText(message); }));
    }
    @Override protected void onResume() { super.onResume(); active = true; if (breathing != null) breathing.start(); handler.postDelayed(blink, 2600); refreshConnection(); handler.post(pollHistory); }
    @Override protected void onPause() {
        active = false; handler.removeCallbacks(blink); handler.removeCallbacks(pollHistory);
        eyesView.animate().cancel(); eyesView.setScaleY(1f);
        if (breathing != null) breathing.cancel();
        super.onPause();
    }
    @Override protected void onDestroy() { handler.removeCallbacksAndMessages(null); connection.close(); if (conversationDialog != null) conversationDialog.dismiss(); super.onDestroy(); }
}

