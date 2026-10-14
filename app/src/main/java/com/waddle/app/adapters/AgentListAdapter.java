package com.waddle.app.adapters;

import android.graphics.Color;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.waddle.app.R;
import com.waddle.app.models.Agent;

import java.util.List;

public class AgentListAdapter extends RecyclerView.Adapter<AgentListAdapter.AgentViewHolder> {

    public interface OnAgentClickListener {
        void onAgentClick(Agent agent);
    }

    private List<Agent> agents;
    private OnAgentClickListener listener;

    public AgentListAdapter(List<Agent> agents, OnAgentClickListener listener) {
        this.agents = agents;
        this.listener = listener;
    }

    public void updateList(List<Agent> newList) {
        agents = newList;
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public AgentViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
            .inflate(R.layout.item_agent, parent, false);
        return new AgentViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull AgentViewHolder holder, int position) {
        Agent agent = agents.get(position);
        holder.bind(agent, listener);
    }

    @Override
    public int getItemCount() { return agents.size(); }

    static class AgentViewHolder extends RecyclerView.ViewHolder {
        private TextView tvInitial;
        private TextView tvName;
        private TextView tvLastMessage;
        private TextView tvTime;
        private View viewAvatar;

        public AgentViewHolder(@NonNull View itemView) {
            super(itemView);
            tvInitial = itemView.findViewById(R.id.tv_initial);
            tvName = itemView.findViewById(R.id.tv_agent_name);
            tvLastMessage = itemView.findViewById(R.id.tv_last_message);
            tvTime = itemView.findViewById(R.id.tv_time);
            viewAvatar = itemView.findViewById(R.id.view_avatar);
        }

        public void bind(Agent agent, OnAgentClickListener listener) {
            tvInitial.setText(agent.getInitial());
            tvName.setText(agent.getName());
            tvLastMessage.setText(agent.getLastMessage());
            tvTime.setText(agent.getLastMessageTime());

            // Set accent color for avatar
            try {
                int color = Color.parseColor(agent.getAccentColor());
                viewAvatar.setBackgroundTintList(
                    android.content.res.ColorStateList.valueOf(color));
            } catch (Exception e) {
                viewAvatar.setBackgroundTintList(
                    android.content.res.ColorStateList.valueOf(Color.parseColor("#E8D92F")));
            }

            itemView.setOnClickListener(v -> listener.onAgentClick(agent));
        }
    }
}
