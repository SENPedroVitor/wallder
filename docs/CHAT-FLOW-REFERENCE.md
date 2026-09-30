# Organização de conversas

Referência funcional: https://github.com/milind-soni/OpenMausBot

Consultados `src/components/Sidebar.tsx` (`BotListItem`, `BotThreadList`, `GroupListItem`), `src/lib/sidebar-layout.ts` e os tipos `Bot`/`Group` de `src/state/store.tsx`. No modelo da referência, o bot é um contato com conversas próprias, enquanto grupos têm participantes e histórico próprio. O visual, estilos e mascotes não foram importados.

Aplicação nesta prévia:

- O seletor abre o chat permanente de qualquer agente. A seção recolhível Individuais começa só com Ash; o primeiro envio individual fixa o outro agente na sidebar. Atalhos e históricos são dados separados.
- Cada agente tem exatamente um histórico individual. Não existem subconversas nem reinício de chat. Históricos antigos divididos são reunidos, preservando mensagens.
- Minha equipe contém apenas grupos de trabalho. Os participantes continuam sendo os mesmos agentes, e abrir um deles individualmente não transfere o histórico do grupo.
- Os grupos ilustrativos existentes foram identificados pelo envio de tarefas a vários agentes e preservados.
- Históricos são persistidos localmente; ainda não há motor de IA, seleção automática de participantes ou serviço de backup remoto.

Esta implementação adapta o fluxo básico à aplicação local. Não importa a infraestrutura, as integrações ou todas as funcionalidades da referência.
