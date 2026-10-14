package com.waddle.app.activities;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.KeyEvent;
import android.view.View;
import android.view.inputmethod.EditorInfo;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.waddle.app.R;
import com.waddle.app.WaddleApplication;
import com.waddle.app.adapters.MessageAdapter;
import com.waddle.app.models.Agent;
import com.waddle.app.models.Message;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

public class ChatActivity extends AppCompatActivity {

    private static final int PERMISSION_RECORD_AUDIO = 101;

    private Agent agent;
    private List<Message> messages;
    private MessageAdapter adapter;
    private RecyclerView recyclerMessages;
    private EditText editMessage;
    private ImageButton btnSend;
    private ImageButton btnMic;
    private ImageButton btnBack;
    private TextView tvAgentName;
    private TextView tvAgentState;
    private View viewAgentAvatar;

    // First-conversation suggestions
    private static final String[][] SUGGESTIONS = {
        {"Projeto Acervo", "Pergunte ao Ted quais foram as músicas mais escutadas na semana"},
        {"Caixa de entrada", "Resume mensagens e ajuda a priorizar o seu dia."}
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_chat);

        String agentId = getIntent().getStringExtra("agent_id");
        agent = WaddleApplication.getInstance().getAgentRepository().getAgentById(agentId);

        if (agent == null) {
            finish();
            return;
        }

        initViews();
        setupAgentHeader();
        setupMessageList();
        setupInput();
        setupFirstConversation();
    }

    private void initViews() {
        recyclerMessages = findViewById(R.id.recycler_messages);
        editMessage = findViewById(R.id.edit_message);
        btnSend = findViewById(R.id.btn_send);
        btnMic = findViewById(R.id.btn_mic);
        btnBack = findViewById(R.id.btn_back);
        tvAgentName = findViewById(R.id.tv_agent_name);
        tvAgentState = findViewById(R.id.tv_agent_state);
        viewAgentAvatar = findViewById(R.id.view_agent_avatar);
    }

    private void setupAgentHeader() {
        tvAgentName.setText(agent.getName());
        tvAgentState.setText("Disponível");

        // Set agent accent color
        try {
            int color = Color.parseColor(agent.getAccentColor());
            viewAgentAvatar.setBackgroundTintList(
                android.content.res.ColorStateList.valueOf(color));
        } catch (Exception e) {
            // fallback color
        }

        TextView tvAvatarInitial = findViewById(R.id.tv_avatar_initial);
        tvAvatarInitial.setText(agent.getInitial());

        btnBack.setOnClickListener(v -> {
            finish();
            overridePendingTransition(android.R.anim.fade_in, android.R.anim.slide_out_right);
        });
    }

    private void setupMessageList() {
        messages = new ArrayList<>();
        adapter = new MessageAdapter(messages, agent);
        recyclerMessages.setLayoutManager(new LinearLayoutManager(this));
        recyclerMessages.setAdapter(adapter);
    }

    private void setupFirstConversation() {
        // Show suggestion cards if no history (West only)
        View suggestionContainer = findViewById(R.id.suggestion_container);
        View emptyState = findViewById(R.id.empty_state);

        if (agent.getId().equals("west") && messages.isEmpty()) {
            if (emptyState != null) emptyState.setVisibility(View.VISIBLE);
            if (suggestionContainer != null) suggestionContainer.setVisibility(View.VISIBLE);

            // Setup suggestion click listeners
            View card1 = findViewById(R.id.suggestion_card_1);
            View card2 = findViewById(R.id.suggestion_card_2);
            if (card1 != null) card1.setOnClickListener(v -> sendMessage(SUGGESTIONS[0][1]));
            if (card2 != null) card2.setOnClickListener(v -> sendMessage(SUGGESTIONS[1][1]));
        }
    }

    private void setupInput() {
        // Send button visibility based on text
        editMessage.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int i, int i1, int i2) {}
            @Override public void onTextChanged(CharSequence s, int i, int i1, int i2) {
                boolean hasText = s.toString().trim().length() > 0;
                btnSend.setVisibility(hasText ? View.VISIBLE : View.GONE);
                btnMic.setVisibility(hasText ? View.GONE : View.VISIBLE);
            }
            @Override public void afterTextChanged(Editable s) {}
        });

        // Send on button press
        btnSend.setOnClickListener(v -> {
            String text = editMessage.getText().toString().trim();
            if (!text.isEmpty()) sendMessage(text);
        });

        // Mic button
        btnMic.setOnClickListener(v -> handleMicButton());

        // Send on keyboard action
        editMessage.setOnEditorActionListener((v, actionId, event) -> {
            if (actionId == EditorInfo.IME_ACTION_SEND ||
                (event != null && event.getKeyCode() == KeyEvent.KEYCODE_ENTER)) {
                String text = editMessage.getText().toString().trim();
                if (!text.isEmpty()) sendMessage(text);
                return true;
            }
            return false;
        });
    }

    private void sendMessage(String text) {
        // Hide empty state
        View emptyState = findViewById(R.id.empty_state);
        View suggestionContainer = findViewById(R.id.suggestion_container);
        if (emptyState != null) emptyState.setVisibility(View.GONE);
        if (suggestionContainer != null) suggestionContainer.setVisibility(View.GONE);

        editMessage.setText("");

        // Add user message
        Message userMsg = new Message(
            UUID.randomUUID().toString(),
            text,
            Message.Type.USER,
            getCurrentTime()
        );
        messages.add(userMsg);
        adapter.notifyItemInserted(messages.size() - 1);
        scrollToBottom();

        // Simulate agent typing
        simulateAgentResponse(text);
    }

    private void simulateAgentResponse(String userInput) {
        tvAgentState.setText("Digitando...");
        agent.setCurrentState(Agent.State.RESPONDING);

        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            String response = generateResponse(userInput);
            Message agentMsg = new Message(
                UUID.randomUUID().toString(),
                response,
                Message.Type.AGENT,
                getCurrentTime()
            );
            agentMsg.setAgentName(agent.getName());
            messages.add(agentMsg);
            adapter.notifyItemInserted(messages.size() - 1);
            scrollToBottom();

            tvAgentState.setText("Disponível");
            agent.setCurrentState(Agent.State.IDLE);

            // Check if routine should be created
            if (userInput.toLowerCase().contains("toda manhã") ||
                userInput.toLowerCase().contains("todo dia") ||
                userInput.toLowerCase().contains("todos os dias")) {
                addRoutineCreatedMessage();
            }
        }, 1200 + (long)(Math.random() * 800));
    }

    private String generateResponse(String input) {
        String lower = input.toLowerCase();
        if (lower.contains("clima") || lower.contains("tempo")) {
            return "Aqui está a previsão para São Paulo.";
        } else if (lower.contains("equipe") || lower.contains("como está")) {
            return "Tudo em dia: Songbird concluiu a tela inicial, Ted organizou o acervo e Pam alinhou a agenda da próxima semana.";
        } else if (lower.contains("toda manhã") || lower.contains("todo dia")) {
            return "Pronto! Seu resumo da equipe chega aqui todos os dias às 09:00.";
        } else if (lower.contains("rotina") || lower.contains("resumo")) {
            return "Vou preparar seu resumo todos os dias às 09:00, com os principais atualizações da equipe.";
        } else if (lower.contains("projeto")) {
            return "Claro! Posso ajudar a organizar o projeto. Qual é o objetivo principal?";
        } else if (lower.contains("bom dia") || lower.contains("olá") || lower.contains("oi")) {
            return "Bom dia! Como posso ajudar você hoje? Sua equipe está pronta.";
        } else {
            return "Entendido! Vou trabalhar nisso agora. Assim que tiver novidades, te aviso.";
        }
    }

    private void addRoutineCreatedMessage() {
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            Message routineMsg = new Message(
                UUID.randomUUID().toString(),
                "Rotina criada · Resumo da manhã",
                Message.Type.ROUTINE_CREATED,
                getCurrentTime()
            );
            messages.add(routineMsg);
            adapter.notifyItemInserted(messages.size() - 1);
            scrollToBottom();
        }, 500);
    }

    private void handleMicButton() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this,
                new String[]{Manifest.permission.RECORD_AUDIO},
                PERMISSION_RECORD_AUDIO);
        } else {
            Toast.makeText(this, "Ouvindo...", Toast.LENGTH_SHORT).show();
            tvAgentState.setText("Ouvindo...");
            new Handler(Looper.getMainLooper()).postDelayed(() ->
                tvAgentState.setText("Disponível"), 2000);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSION_RECORD_AUDIO) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                handleMicButton();
            } else {
                Toast.makeText(this, "Permita o microfone para conversar", Toast.LENGTH_LONG).show();
            }
        }
    }

    private void scrollToBottom() {
        if (messages.size() > 0) {
            recyclerMessages.smoothScrollToPosition(messages.size() - 1);
        }
    }

    private String getCurrentTime() {
        return new SimpleDateFormat("HH:mm", Locale.getDefault()).format(new Date());
    }

    @Override
    public void onBackPressed() {
        super.onBackPressed();
        overridePendingTransition(android.R.anim.fade_in, android.R.anim.slide_out_right);
    }
}
