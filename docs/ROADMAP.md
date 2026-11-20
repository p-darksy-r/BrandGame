<!-- Copyright (c) 2026 p-darksy-r. BrandGame. -->
# Melhorias prioritárias

## Implementadas na versão 3.1.0

- Distribuição Windows em `app`, recursos em `app/web` e atualizador na raiz.
- Publicação temporária, bloqueio contra atualizações concorrentes, backups e recuperação de interrupções.
- Separação de interface, regras, dados, persistência e integração Windows.
- Um único catálogo e um único gerador de níveis; remoção da sobreposição que escondia a base de marcas maior.
- Proteções contra submissões repetidas e conteúdo HTML em nomes de salas.
- Gravações mais robustas e regras coerentes entre plataformas.
- Documentação de desenvolvimento e testes automatizados.

## Implementadas na versão 3.2.0

- CSS, fontes e logótipos locais; partida completa em `file://` com a rede desligada.
- Catálogo auditado: 496 entradas ativas, identificadores corrigidos e 1438 entradas preservadas fora das rondas para revisão.
- Remoção dos controlos de FPS/VSync sem efeito; movimento reduzido com preferência do sistema.
- Carregamento de logótipos antes do cronómetro, erros recuperáveis, pausa e tempo monotónico.
- Testes de partida completa, derrota, persistência, cancelamento e falhas de imagem.

## Implementadas na versão 3.3.0

- Atualizador online com verificação de manifesto assinado, canais, reparação e recuperação; sem SDK no PC do jogador.
- Estrelas realmente conquistadas e recordes de pontuação/tempo por nível e dificuldade, com migração dos saves antigos.

## Implementadas na versão 3.4.0

- Menu com progresso por categoria, quatro temas, ajuda integrada e navegação por teclado.
- Interface e pistas em três línguas. As salas conservam os nomes e as pistas escolhidos pelo jogador.
- Ícones próprios do jogo e do atualizador e migração do progresso após a mudança de nome para BrandGame.

## Próximas prioridades

1. **Facilitar a instalação Windows.** Distribuir com um certificado publicamente reconhecido ou pela Microsoft Store e testar a instalação num PC sem o certificado de desenvolvimento.
2. **Afinar a dificuldade.** Com a rotação entre níveis implementada para moda e alimentação, recolher feedback sobre a dificuldade de reconhecer as novas marcas.
3. **Levar o progresso para outro dispositivo.** Permitir exportar e importar pontos, estrelas, preferências e salas. Antes de substituir uma gravação, mostrar o que será importado e manter uma cópia recuperável.
4. **Tornar as atualizações mais claras.** Mostrar a versão instalada, a versão disponível e o progresso do download numa janela. Preparar a substituição do próprio lançador quando a versão seguinte a exigir.
5. **Melhorar a leitura durante as partidas.** Testar as pistas mais compridas com um leitor de ecrã e a escalas de 125% e 150% no Windows. Rever o tamanho do texto, a ordem do foco e o anúncio do resultado da ronda a partir desses testes.
