# Wendler

Wendler é um assistente pessoal formado por uma equipe de agentes com mascotes e especialidades próprias. A proposta é conversar com eles para pesquisar, organizar projetos, trabalhar com arquivos e executar tarefas nos serviços e computadores conectados.

O projeto reúne a interface web, o backend e um aplicativo nativo exclusivo para Android. O backend e os executores podem rodar em um servidor Linux, permitindo acessar o sistema sem manter o computador pessoal ligado. O acesso remoto depende da rede privada e das integrações configuradas nesse servidor.

## Aplicativo Android

O Android será também o corpo físico do mascote: um celular dedicado, com fundo preto, o personagem na tela e interação por voz. As tarefas serão executadas pelo backend no servidor.

Essa experiência ainda está em desenvolvimento. O código Android atual contém telas de entrada, lista de agentes, conversa e rotinas. Suas respostas são simuladas localmente; a conexão das conversas com o backend e o modo de mascote dedicado ainda precisam ser implementados. A presença de uma tela ou biblioteca de rede não significa que a integração esteja funcionando.

## Telas reais

As imagens de referência de outro produto foram retiradas desta apresentação. Novas capturas serão adicionadas após a revisão dos desenhos e a conferência das telas em execução. Os desenhos do Pencil são referências de design, não capturas do aplicativo.

## Organização

| Caminho | Conteúdo |
| --- | --- |
| `app/` | Aplicativo nativo Android existente, em Java e XML. |
| `src/` | Interface web em React, TypeScript e CSS. |
| `server/` | Backend, ferramentas e integrações dos agentes em JavaScript. |
| `deploy/` | Configuração dos serviços no servidor. |
| `docs/` | Planos, instruções de configuração e verificações. |

Cada plataforma tem seu próprio processo de compilação. O Android não inclui o backend dentro do APK.

## Executar o Android

Abra a raiz deste repositório no Android Studio. Instale os componentes solicitados pelo SDK Manager, aguarde a sincronização e selecione um celular conectado ou um dispositivo no Device Manager. Execute a configuração `app` para abrir o aplicativo real.

Para gerar o APK no Windows, com o SDK configurado e um JDK compatível:

```powershell
.\gradlew.bat assembleDebug
```

O APK fica em `app/build/outputs/apk/debug/app-debug.apk`. A configuração atual requer Android 8.0/API 26 ou superior. O caminho do SDK é uma configuração local e não deve ser publicado.

## Executar a interface web e o backend

Na raiz do repositório, instale as dependências com pnpm e execute:

```sh
pnpm install
pnpm start
```

Consulte [`docs/RUNTIME-LOCAL.md`](docs/RUNTIME-LOCAL.md) para configurar o runtime e [`deploy/runtime/README.md`](deploy/runtime/README.md) para executar no servidor.

Credenciais, dados pessoais, sessões de navegador e chaves de criptografia pertencem à configuração privada do ambiente e não devem ser incluídos no repositório.

