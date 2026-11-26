<!-- Copyright (c) 2026 p-darksy-r. BrandGame. -->
# Jogar BrandGame 3.6.0

## Windows

Extrai `BrandGame-3.6.0-win-x64.zip` e abre `app/BrandGame.exe`. Mantém `app/web` junto do executável. O runtime .NET está incluído; é necessário o Microsoft Edge WebView2 Runtime. O jogo inclui interface, fontes e logótipos locais e funciona sem Internet depois de instalado o WebView2. Podes redimensionar ou maximizar a janela.

Os executáveis usam uma assinatura de desenvolvimento autoassinada. A assinatura identifica esta build, mas não garante aceitação pelo Windows noutros computadores. Se SmartScreen, Smart App Control ou uma política empresarial bloquearem a execução, mantém a proteção e usa o pacote web. Não é pedido aos jogadores que instalem certificados.

Se apenas o `update.exe` estiver bloqueado, fecha o jogo e extrai o ZIP Windows oficial da nova versão **numa pasta nova**. Abre o `app/BrandGame.exe` dessa pasta. A gravação nativa pertence ao teu perfil Windows, por isso podes manter a pasta da versão anterior até confirmares o progresso na nova. Se o jogo também for bloqueado, usa o pacote web.

## Navegador

Extrai `BrandGame-3.6.0-web.zip` e abre `web/index.html` no navegador. Não é necessário executar um EXE, instalar certificados ou ter o SDK .NET. Este modo usa o armazenamento local do navegador e tem progresso separado da aplicação Windows. Os recursos estão incluídos; podes jogar sem Internet. Mantém a pasta no mesmo local para continuar a usar o mesmo armazenamento do navegador.

## Atualizador

Se vens da versão 3.3.0, fecha o lançador antigo e substitui-o pelo `update.exe` desta versão uma vez. O lançador 3.3.0 só reconhece o endereço anterior dos downloads.

O pacote Windows inclui `update.exe` junto de `app`. Fecha o jogo e abre o atualizador para procurar e instalar a última release autenticada. Não exige SDK, Node ou SignTool. O canal predefinido inclui versões de desenvolvimento; para aceitar apenas estáveis, usa `update.exe --channel stable`. `--check` apenas consulta; `--launch` abre o jogo após a verificação/atualização.

As releases anteriores à 3.3.0 não têm manifesto de atualização e são ignoradas. A assinatura do pacote confirma a origem e integridade; não muda a confiança do Windows na assinatura de desenvolvimento. O próprio lançador deve ser substituído manualmente, com ele fechado, quando uma release pedir uma versão nova. Os modos `--local`/`--watch` destinam-se ao desenvolvimento.

## Partidas e catálogo

O cronómetro começa quando o logótipo termina de carregar. Usa o botão de pausa ou **Esc** para pausar e o botão de continuar para retomar. **Enter** submete a resposta. Ao mudar de separador, a partida pausa automaticamente. Se faltar uma imagem, não perdes tempo nem vidas: podes tentar novamente ou sair do nível. A ajuda do menu reúne regras, custos das pistas e atalhos.

Em **Definições**, escolhe português de Portugal, inglês ou espanhol e um dos quatro temas: Meia-noite, Claro, Floresta ou Ametista. As escolhas são guardadas no perfil e recuperadas ao reabrir o jogo. A língua altera os menus e as pistas do catálogo. Os nomes das marcas e o texto que escreveste nas salas permanecem iguais.

A opção de movimento reduzido desativa animações e tremores. A preferência de movimento reduzido do sistema também é respeitada. Usa **Tab** e **Shift+Tab** para percorrer os controlos com foco visível. As antigas opções de FPS e VSync foram removidas porque não controlavam a apresentação do WebView2.

São 528 entradas em cinco categorias, com 100 níveis por categoria. Em moda e alimentação, podes jogar dois níveis consecutivos sem encontrar a mesma marca. Salas antigas com identificadores indisponíveis mantêm os dados e mostram um aviso antes de começar. O criador de salas apresenta os identificadores locais disponíveis.

## Mudar de PC ou de navegador

Nas definições do jogo de origem, exporta uma cópia do progresso. Transfere o ficheiro JSON para o outro dispositivo. Abre as definições do jogo de destino, escolhe a importação e compara os pontos, estrelas e salas apresentados com o progresso esperado. Confirma para o usar. Se te enganares, recupera a gravação anterior nas definições.

**Se vens do Windows 3.5.0**, também podes importar diretamente o ficheiro `%APPDATA%/BrandGame/save.json` no navegador. Basta selecioná-lo nas definições. Não é preciso abrir o executável anterior, e o ficheiro original permanece no disco.

## Estrelas e recordes

Cada nível guarda estrelas, melhor pontuação e menor tempo de jogo por dificuldade. O total usa as melhores estrelas de cada nível/sala, sem duplicar por repetição. Criar uma sala não atribui estrelas. Os pontos acumulados anteriores mantêm-se.

Uma conclusão com pelo menos 75% de acertos dá uma estrela; 90% dá duas e 100% dá três. Os recordes de tempo só contam conclusões aprovadas e excluem carregamento, pausa e espera no painel de resposta. Saves antigos mantêm os níveis concluídos, mas os resultados por nível eram desconhecidos: volta a jogá-los para registar estrelas e recordes.
