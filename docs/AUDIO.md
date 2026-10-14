# Áudio para texto no chat

O botão de microfone junto à mensagem permite gravar ou importar um áudio. Ao terminar, a transcrição entra no campo de mensagem e pode ser corrigida antes de enviar. Ela não envia a mensagem automaticamente.

- Até 2 minutos e 8 MB por áudio.
- WebM, Ogg, MP4/M4A, MP3, WAV e FLAC.
- A primeira gravação depende da autorização do microfone no navegador. Use o endereço HTTPS do servidor ou localhost.
- Processamento local no servidor com whisper.cpp e modelo multilingual small quantizado; não precisa de chave de API de áudio.
- O reconhecimento pode errar nomes e palavras. Revise antes de enviar.
- Apenas uma transcrição simultânea; um segundo pedido recebe aviso de serviço ocupado.
- Arquivos temporários são apagados após o processamento ou cancelamento. O serviço não registra áudio nem transcrição nos logs.
- Voz de resposta e gravação no aplicativo Android ficam para outra etapa.

## Operação

No servidor, mantenha `compose.audio.yaml` junto ao Compose principal, usando o conteúdo de `deploy/runtime/audio.override.yaml`. A pasta `app` precisa conter este projeto. Execute:

```sh
docker compose -f compose.yaml -f compose.audio.yaml up -d --build transcription runtime
```

O serviço `wendler-audio` escuta somente em `127.0.0.1:5275`. O backend encaminha `/api/audio/transcribe` para ele, com os controles de origem já existentes. `/api/audio/status` indica disponibilidade. Os contêineres usam reinício automático; não precisam de terminal aberto. Para hospedar o serviço em outra máquina, configure `WENDLER_AUDIO_ENDPOINT` apenas no backend e proteja o transporte.

## Validação

Testes de serviço cobrem formatos, silêncio, limites, concorrência e limpeza dos temporários. O teste de navegador usa microfone simulado para verificar gravação, cancelamento, troca de conversa e preservação do rascunho. A avaliação de reconhecimento usa uma amostra pública de fala humana em português do conjunto [PolyAI/minds14](https://huggingface.co/datasets/PolyAI/minds14), licença CC BY 4.0. Essa amostra não é incluída no repositório.

Na validação neste servidor, uma amostra de aproximadamente 9 segundos levou 28 segundos para transcrever. A precisão da amostra foi parcial, com palavras incorretas; não é uma garantia de transcrição fiel. O tempo varia com duração, ruído e carga do servidor.
