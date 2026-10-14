package com.waddle.app.adapters;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.waddle.app.R;
import com.waddle.app.models.Agent;
import com.waddle.app.models.Message;

import java.util.List;

public class MessageAdapter extends RecyclerView.Adapter<RecyclerView.ViewHolder> {

    private static final int VIEW_TYPE_USER = 0;
    private static final int VIEW_TYPE_AGENT = 1;
    private static final int VIEW_TYPE_SYSTEM = 2;

    private List<Message> messages;
    private Agent agent;

    public MessageAdapter(List<Message> messages, Agent agent) {
        this.messages = messages;
        this.agent = agent;
    }

    @Override
    public int getItemViewType(int position) {
        Message msg = messages.get(position);
        switch (msg.getType()) {
            case USER: return VIEW_TYPE_USER;
            case SYSTEM:
            case ROUTINE_CREATED: return VIEW_TYPE_SYSTEM;
            default: return VIEW_TYPE_AGENT;
        }
    }

    @NonNull
    @Override
    public RecyclerView.ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        LayoutInflater inflater = LayoutInflater.from(parent.getContext());
        if (viewType == VIEW_TYPE_USER) {
            return new UserMessageViewHolder(
                inflater.inflate(R.layout.item_message_user, parent, false));
        } else if (viewType == VIEW_TYPE_SYSTEM) {
            return new SystemMessageViewHolder(
                inflater.inflate(R.layout.item_message_system, parent, false));
        } else {
            return new AgentMessageViewHolder(
                inflater.inflate(R.layout.item_message_agent, parent, false));
        }
    }

    @Override
    public void onBindViewHolder(@NonNull RecyclerView.ViewHolder holder, int position) {
        Message msg = messages.get(position);
        if (holder instanceof UserMessageViewHolder) {
            ((UserMessageViewHolder) holder).bind(msg);
        } else if (holder instanceof AgentMessageViewHolder) {
            ((AgentMessageViewHolder) holder).bind(msg, agent);
        } else if (holder instanceof SystemMessageViewHolder) {
            ((SystemMessageViewHolder) holder).bind(msg);
        }
    }

    @Override
    public int getItemCount() { return messages.size(); }

    // User message ViewHolder
    static class UserMessageViewHolder extends RecyclerView.ViewHolder {
        TextView tvContent, tvTime;
        public UserMessageViewHolder(@NonNull View itemView) {
            super(itemView);
            tvContent = itemView.findViewById(R.id.tv_content);
            tvTime = itemView.findViewById(R.id.tv_time);
        }
        public void bind(Message msg) {
            tvContent.setText(msg.getContent());
            if (tvTime != null) tvTime.setText(msg.getTimestamp());
        }
    }

    // Agent message ViewHolder
    static class AgentMessageViewHolder extends RecyclerView.ViewHolder {
        TextView tvContent, tvTime, tvInitial;
        View viewAvatar;
        public AgentMessageViewHolder(@NonNull View itemView) {
            super(itemView);
            tvContent = itemView.findViewById(R.id.tv_content);
            tvTime = itemView.findViewById(R.id.tv_time);
            tvInitial = itemView.findViewById(R.id.tv_initial);
            viewAvatar = itemView.findViewById(R.id.view_avatar);
        }
        public void bind(Message msg, Agent agent) {
            tvContent.setText(msg.getContent());
            if (tvTime != null) tvTime.setText(msg.getTimestamp());
            if (tvInitial != null) tvInitial.setText(agent.getInitial());
            if (viewAvatar != null) {
                try {
                    int color = android.graphics.Color.parseColor(agent.getAccentColor());
                    viewAvatar.setBackgroundTintList(
                        android.content.res.ColorStateList.valueOf(color));
                } catch (Exception e) { /* ignore */ }
            }
        }
    }

    // System message ViewHolder (routine created, etc.)
    static class SystemMessageViewHolder extends RecyclerView.ViewHolder {
        TextView tvContent;
        public SystemMessageViewHolder(@NonNull View itemView) {
            super(itemView);
            tvContent = itemView.findViewById(R.id.tv_content);
        }
        public void bind(Message msg) {
            tvContent.setText(msg.getContent());
        }
    }
}
