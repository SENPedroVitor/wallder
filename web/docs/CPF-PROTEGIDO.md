# CPF protegido

Perfil → Dados protegidos permite cadastrar, substituir e remover o CPF. O campo de cadastro usa entrada oculta. Depois de salvar, o navegador recebe somente `saved`, `masked`, `protection` e `available`; nenhum endpoint devolve o número, nem seus últimos dígitos. Fechar a janela ou salvar limpa o campo de entrada.

O serviço valida os dígitos verificadores e usa CryptProtectData/DPAPI no escopo do usuário Windows, sem proteção no escopo de toda a máquina. O arquivo `.wendler/protected-cpf.json` contém apenas a versão, o identificador da proteção e o ciphertext em base64. Não há chave ao lado desse arquivo. O valor não entra no Workspace, na memória dos agentes, nos prompts nem na exportação do perfil. Um backup integral do diretório pode conter o ciphertext, que depende da conta Windows para recuperação.

O backend acessa a API nativa em JavaScript por Koffi. Em outros sistemas, o cadastro fica indisponível: não existe fallback em texto puro. DPAPI não isola o segredo de código que já execute com os privilégios do mesmo usuário Windows.

O preenchimento da Pam na Steam está ligado ao cofre por wendler_steam, validando a página e o campo autorizados. Não há endpoint ou ferramenta para devolver o CPF ao modelo. O fluxo local omite capturas de páginas com CPF e mascara as observações antes de retorná-las ao agente.

Verificação: testes reais do Windows para criptografia/descriptografia e alteração do ciphertext; persistência protegida e resposta mascarada; rejeição de CPF inválido; formulário no navegador e limpeza ao fechar. Nenhum CPF real foi cadastrado por Codex.

Referência: https://learn.microsoft.com/en-us/windows/win32/api/dpapi/nf-dpapi-cryptprotectdata

Integração posterior: a Pam recebe wendler_steam no chat. A ferramenta permite selecionar Steam/APM Adapter, validar merchantId/siteId/origem da SafeCharge e orçamento, e preencher via leitura local do DPAPI. A máscara, não o CPF, retorna ao modelo. Capturas de páginas com campo CPF são suprimidas; navegação pelo teclado continua disponível. O usuário autoriza o uso do CPF e as ações do checkout pelo chat. O fluxo deve conferir pedidos pendentes antes de qualquer nova compra e parar no QR Code.
