package com.waddle.app.activities;

import android.content.Intent;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;
import android.widget.EditText;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.waddle.app.R;
import com.waddle.app.WaddleApplication;
import com.waddle.app.adapters.AgentListAdapter;
import com.waddle.app.models.Agent;
import com.waddle.app.models.AgentRepository;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends AppCompatActivity {

    private RecyclerView recyclerAgents;
    private AgentListAdapter adapter;
    private EditText editSearch;
    private List<Agent> allAgents;
    private AgentRepository repo;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        repo = WaddleApplication.getInstance().getAgentRepository();
        allAgents = repo.getAgents();

        recyclerAgents = findViewById(R.id.recycler_agents);
        editSearch = findViewById(R.id.edit_search);

        // Setup RecyclerView
        adapter = new AgentListAdapter(new ArrayList<>(allAgents), agent -> {
            Intent intent = new Intent(MainActivity.this, ChatActivity.class);
            intent.putExtra("agent_id", agent.getId());
            startActivity(intent);
            overridePendingTransition(android.R.anim.slide_in_left, android.R.anim.fade_out);
        });
        recyclerAgents.setLayoutManager(new LinearLayoutManager(this));
        recyclerAgents.setAdapter(adapter);

        // Search filter
        editSearch.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                filterAgents(s.toString());
            }
            @Override public void afterTextChanged(Editable s) {}
        });

        // Bottom navigation
        BottomNavigationView bottomNav = findViewById(R.id.bottom_navigation);
        bottomNav.setSelectedItemId(R.id.nav_agents);
        bottomNav.setOnItemSelectedListener(item -> {
            int id = item.getItemId();
            if (id == R.id.nav_agents) return true;
            // Other tabs — placeholder
            return false;
        });
    }

    private void filterAgents(String query) {
        List<Agent> filtered = new ArrayList<>();
        for (Agent a : allAgents) {
            if (a.getName().toLowerCase().contains(query.toLowerCase()) ||
                a.getSpecialty().toLowerCase().contains(query.toLowerCase())) {
                filtered.add(a);
            }
        }
        adapter.updateList(filtered);
    }
}
