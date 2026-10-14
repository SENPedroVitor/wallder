package com.waddle.app;

import android.app.Application;
import com.waddle.app.models.AgentRepository;

public class WaddleApplication extends Application {

    private static WaddleApplication instance;
    private AgentRepository agentRepository;

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        agentRepository = new AgentRepository();
    }

    public static WaddleApplication getInstance() {
        return instance;
    }

    public AgentRepository getAgentRepository() {
        return agentRepository;
    }
}
