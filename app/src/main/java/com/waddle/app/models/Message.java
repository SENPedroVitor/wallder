package com.waddle.app.models;

public class Message {
    public enum Type {
        USER, AGENT, SYSTEM, ROUTINE_CREATED
    }

    private String id;
    private String content;
    private Type type;
    private String timestamp;
    private String agentName;
    private boolean isWidget;
    private String widgetType;

    public Message(String id, String content, Type type, String timestamp) {
        this.id = id;
        this.content = content;
        this.type = type;
        this.timestamp = timestamp;
        this.isWidget = false;
    }

    public Message(String id, String content, Type type, String timestamp, String widgetType) {
        this(id, content, type, timestamp);
        this.isWidget = true;
        this.widgetType = widgetType;
    }

    // Getters
    public String getId() { return id; }
    public String getContent() { return content; }
    public Type getType() { return type; }
    public String getTimestamp() { return timestamp; }
    public String getAgentName() { return agentName; }
    public boolean isWidget() { return isWidget; }
    public String getWidgetType() { return widgetType; }

    // Setters
    public void setAgentName(String agentName) { this.agentName = agentName; }
}
