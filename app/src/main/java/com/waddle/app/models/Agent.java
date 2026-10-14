package com.waddle.app.models;

public class Agent {
    public enum State {
        IDLE, LISTENING, RESPONDING, NEEDS_PERMISSION, WORKING
    }

    private String id;
    private String name;
    private String specialty;
    private String lastMessage;
    private String lastMessageTime;
    private String accentColor;
    private String emoji;
    private State currentState;
    private boolean hasUnread;

    public Agent(String id, String name, String specialty, String lastMessage,
                 String lastMessageTime, String accentColor, String emoji) {
        this.id = id;
        this.name = name;
        this.specialty = specialty;
        this.lastMessage = lastMessage;
        this.lastMessageTime = lastMessageTime;
        this.accentColor = accentColor;
        this.emoji = emoji;
        this.currentState = State.IDLE;
        this.hasUnread = false;
    }

    // Getters
    public String getId() { return id; }
    public String getName() { return name; }
    public String getSpecialty() { return specialty; }
    public String getLastMessage() { return lastMessage; }
    public String getLastMessageTime() { return lastMessageTime; }
    public String getAccentColor() { return accentColor; }
    public String getEmoji() { return emoji; }
    public State getCurrentState() { return currentState; }
    public boolean hasUnread() { return hasUnread; }

    // Setters
    public void setLastMessage(String lastMessage) { this.lastMessage = lastMessage; }
    public void setLastMessageTime(String lastMessageTime) { this.lastMessageTime = lastMessageTime; }
    public void setCurrentState(State currentState) { this.currentState = currentState; }
    public void setHasUnread(boolean hasUnread) { this.hasUnread = hasUnread; }

    public String getInitial() {
        return name.length() > 0 ? String.valueOf(name.charAt(0)) : "?";
    }
}
