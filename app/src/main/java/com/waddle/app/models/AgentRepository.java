package com.waddle.app.models;

import java.util.ArrayList;
import java.util.List;

public class AgentRepository {

    private List<Agent> agents;

    public AgentRepository() {
        agents = new ArrayList<>();
        loadDefaultAgents();
    }

    private void loadDefaultAgents() {
        agents.add(new Agent("west", "West",
                "Coordenação geral da equipe",
                "Sua equipe está pronta.",
                "Agora", "#E8D92F", "🐦"));

        agents.add(new Agent("batman", "Batman",
                "Planejamento e estratégia",
                "Próximos passos organizados",
                "09:32", "#2B2B3E", "🦇"));

        agents.add(new Agent("kyle", "Kyle Rayner",
                "Direção visual e design",
                "Ajustei a direção visual",
                "09:20", "#4CAF50", "💚"));

        agents.add(new Agent("songbird", "Songbird",
                "Desenvolvimento de código",
                "Implementação em andamento",
                "09:14", "#9C27B0", "🎵"));

        agents.add(new Agent("sheldon", "Sheldon Cooper",
                "Revisão e qualidade",
                "Revisei os pontos de atenção",
                "08:50", "#2196F3", "🔬"));

        agents.add(new Agent("hal", "Hal Jordan",
                "Pesquisa e referências criativas",
                "Trouxe novas ideias para explorar",
                "08:42", "#FF9800", "💡"));

        agents.add(new Agent("indiana", "Indiana Jones",
                "Pesquisa e fontes",
                "Separei as fontes da pesquisa",
                "08:30", "#795548", "🗺️"));

        agents.add(new Agent("c3po", "C-3PO",
                "Análise de dados e comparações",
                "Preparei a análise dos dados",
                "Ontem", "#FFC107", "🤖"));

        agents.add(new Agent("dumbledore", "Dumbledore",
                "Memória e contexto do projeto",
                "Recuperei o contexto do projeto",
                "Ontem", "#673AB7", "🧙"));

        agents.add(new Agent("rorschach", "Rorschach",
                "Revisão de texto e conteúdo",
                "O texto está pronto para revisão",
                "Ontem", "#607D8B", "📝"));

        agents.add(new Agent("pam", "Pam",
                "Organização financeira",
                "Agenda da próxima semana alinhada",
                "Ontem", "#E91E63", "💰"));
    }

    public List<Agent> getAgents() {
        return agents;
    }

    public Agent getAgentById(String id) {
        for (Agent a : agents) {
            if (a.getId().equals(id)) return a;
        }
        return null;
    }

    public Agent getWest() {
        return getAgentById("west");
    }
}
