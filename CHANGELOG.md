# Changelog

Todas as mudanças relevantes do Relaunch ficam registradas aqui.
O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto usa [versionamento semântico](https://semver.org/lang/pt-BR/).

O conteúdo de cada versão é usado como nota do release no GitHub (`npm run release-notes`) e aparece no popup "Novidades" do app. Use as seções **Novidades**, **Melhorias** e **Correções**.

## [Não lançado]

## [0.1.5] - 2026-10-26

### Novidades

- Catálogo com **205 projetos**: 86 novos, vindos da lista pública do Quiver Launcher e conferidos um a um pelas regras do Relaunch (código aberto, download só do release oficial do projeto e nada do jogo original no pacote além de capas e imagens). Todos usam a sua própria cópia do jogo.
  - Nintendo (51): Super Mario 64 (Ghostship), Mario Kart 64, Star Fox 64, Banjo-Kazooie (Lighthouse), Diddy Kong Racing (Golden Balloon), Super Smash Bros., F-Zero X, Harvest Moon 64, Goemon, Snowboard Kids 2, Road Rash 64, Super Mario World, Super Metroid, Donkey Kong Country 2 e 3, The Minish Cap, Metroid Prime Hunters, Mega Man 64, X2 e Zero, os Pokémon de Game Boy, Game Boy Color e Game Boy Advance, os jogos de luta livre da AKI (como WWF No Mercy) e outros.
  - PlayStation (9): Street Fighter III: 3rd Strike (dois projetos), Tomba! 1 e 2, Mega Man X5, Bloody Roar II, Jackie Chan Stuntmaster, Crash Twinsanity e Killzone.
  - Xbox (15): Dead Rising 2: Case Zero e Case West, Forza Horizon, Forza Motorsport 3 e 4, Need for Speed: Most Wanted, Skate 2, Kameo, Mortal Kombat: Shaolin Monks, Tony Hawk's Project 8, WWE 2K14, Dragon Ball Z: Budokai e Burst Limit, Destroy All Humans! Path of the Furon e Sega Superstars Tennis.
  - PC e outros (11): Carmageddon, Cave Story, Chris Sawyer's Locomotion, Heroes of Might and Magic III (VCMI), Civilization III (OpenCiv3), Oddworld, Jazz Jackrabbit, Taisei, Doom II RPG, Wolfenstein RPG e OutRun.
- Quando um jogo tem mais de um projeto, o selo **Mais completo** mostra o mais completo e estável hoje (por exemplo, o SpaghettiKart em Mario Kart 64). Todos mostram também o selo **Jogável**, **Roda com falhas** ou **Experimental**.
- Downloads também pelo **GitLab**, com a mesma proteção do GitHub: só do projeto declarado na ficha, por HTTPS. Mario Kart 64: Recompiled, Starfox 64: Recompiled e Extreme-G vêm de lá.

### Melhorias

- Os textos do app que diziam que tudo vem só do GitHub agora citam também o GitLab.

## [0.1.4] - 2026-10-26

### Melhorias

- A barra de download da atualização do Relaunch agora vai se enchendo de azul forte, fácil de acompanhar, e vira o botão **Atualizar** quando termina.
- Antes de atualizar, o Relaunch pergunta se pode fechar e reiniciar. Com um jogo aberto, ele pede para fechar o jogo antes, para não perder o tempo jogado.

### Correções

- Com o controle, a borda azul aparecia cortada em alguns lugares: na lista de jogos da barra lateral, nas **Dúvidas frequentes** e nos grupos do catálogo em **Adicionar jogo**. Agora ela aparece inteira.

## [0.1.3] - 2026-10-26

### Novidades

- Use o app com controle: o direcional ou o analógico esquerdo movem a seleção, mostrada com uma borda azul, o **A** confirma e o **B** fecha a janela ou o menu aberto ou volta para a página anterior. Mexer no mouse esconde a borda. O controle de Xbox é o mais garantido.
- Ao abrir um jogo, o Relaunch se minimiza e volta para a frente quando o último jogo fecha. Para desligar, vá em **Configurações** > **Ao jogar**.
- Nova pergunta nas **Dúvidas frequentes**: "Posso usar um controle?".

### Melhorias

- Os menus da página do jogo e do perfil agora fecham com o Esc.

### Correções

- Nos ports que abrem primeiro um launcher próprio, que fecha e deixa o jogo rodando, o Relaunch achava que o jogo já tinha fechado, e o tempo jogado ficava errado. Agora o jogo conta como aberto enquanto algum programa da pasta dele está rodando.

## [0.1.2] - 2026-10-25

### Melhorias

- A atualização do Relaunch só é instalada quando você pede. A versão nova continua sendo baixada em segundo plano, e uma barra azul acima do seu perfil mostra o download. Quando termina, clique em **Atualizar para a vX.Y.Z**. Fechar o app não instala nada.
- Nova pergunta nas **Dúvidas frequentes**: "Como o Relaunch se atualiza?".

### Correções

- A atualização do Relaunch não abre mais as telas do instalador ("Para quem esta aplicação deve ser instalada?"). Ao clicar em **Atualizar**, o app fecha, atualiza na mesma pasta e abre de novo sozinho. Já vale para quem atualizar da 0.1.1 para esta versão.

## [0.1.1] - 2026-10-25

### Novidades

- Catálogo com **119 projetos**: 53 ports e recompilações novos. Cada um foi conferido no repositório oficial: código-fonte publicado, download só pelos GitHub Releases e nenhum arquivo do jogo no pacote. Todos usam a sua própria cópia (ROM, ISO ou dump do seu console).
  - PlayStation: SpartanPort (God of War III Remastered), Uncharted: The Nathan Drake Collection, Shadow of the Colossus, Gravity Rush 2, The Last Guardian, The Order: 1886, Unicorn Overlord, Crash Team Racing Nitro-Fueled, MediEvil (PS4), Dragon's Crown Pro e UFC 3, de PS4; Drakengard 3 e Monster Hunter Portable 3rd HD (Yakumo), de PS3; Jak II e Jak 3 (OpenGOAL), ICO, Ridge Racer V (Fukami), Budokai Tenkaichi 3 e Def Jam Vendetta, de PS2; Crash Bandicoot, Crash Team Racing (CTR Native), Castlevania: Symphony of the Night, Ape Escape, MediEvil e Mega Man X4, de PS1.
  - Xbox: Fable II, Lost Odyssey, Blue Dragon (re:Blue), Ace Combat 6, Call of Duty 3, The Darkness (Estacado), The Simpsons Game e Banjo-Kazooie: Nuts & Bolts (reNut), de Xbox 360; BLACK, Ninja Gaiden Black, Jet Set Radio Future e SSX Tricky, de Xbox.
  - Nintendo: Paper Mario (PaperBoat), GoldenEye 007, Diddy Kong Racing e Pokémon Snap, de N64; The Wind Waker (BlueWake), Metroid Prime, Luigi's Mansion, Super Mario Strikers, Super Smash Bros. Melee e Animal Crossing, de GameCube; The Wind Waker HD, de Wii U; e Link's Awakening, de Switch.
  - Só para Linux, por enquanto: bbport (Bloodborne), OpenRAC (Ratchet & Clank), Severed Chains (The Legend of Dragoon) e Takedawn (Burnout 3). No Windows eles aparecem no catálogo, mas sem o botão de baixar.

## [0.1.0] - 2026-10-23

### Novidades

- Tela **Quem está jogando?** com perfis locais: nome, cor do avatar, PIN opcional de 4 dígitos e exportar/importar o perfil (arquivo `.relaunch`). Nada vai para a internet.
- Biblioteca em grade com status de cada jogo: **Pronto**, **Falta configurar** ou **Pasta não encontrada**.
- Botão **Baixar** nos projetos suportados: instala a versão mais recente, direto do repositório oficial, numa pasta que você escolhe.
- Adição de jogos já instalados com detecção automática do projeto pela pasta (ou escolha manual).
- Catálogo com 66 projetos, todos conferidos nos repositórios oficiais. Um jogo novo é só um arquivo `manifests/<id>.json`.
  - Ports e recompilações: Ship of Harkinian, 2 Ship 2 Harkinian, Zelda 64: Recompiled, Starship, SpaghettiKart, Super Mario 64 PC Port, Perfect Dark, Banjo e Donkey Kong 64: Recompiled, Dusklight (Twilight Princess), Zelda3, Unleashed Recompiled (Sonic Unleashed), OpenGOAL (Jak and Daxter), REDRIVER2, Sonic 3 A.I.R., Sonic CD.
  - Clássicos de PC (com os arquivos do seu jogo): DevilutionX (Diablo), Fallout 1 e 2 CE, OpenRCT2, fheroes2, Julius e Augustus (Caesar III), CorsixTH, OpenMW, Daggerfall Unity, Arx Libertatis, vkQuake, UZDoom, dhewm3 e FreeSpace 2 Open.
  - Emuladores: shadPS4, RPCS3, PCSX2, Xenia Canary, Cemu, DuckStation e PPSSPP.
  - Jogos via emulador, com o nível de compatibilidade de cada um: God of War (PS2, PSP, PS3 e o III Remastered de PS4), Bloodborne, Demon's Souls, Dark Souls, Final Fantasy VII, VIII Remastered e X, Metal Gear Solid, MGS3 e Metal Gear Rising, Resident Evil 2, Shadow of the Colossus, Yakuza 0, Need for Speed: Hot Pursuit Remastered, Halo 3, Gears of War 2 e 3, Red Dead Redemption, Zelda: Breath of the Wild, Mario Kart 8, Super Mario 3D World e Xenoblade Chronicles X.
- Catálogo de projetos em listas por plataforma (**Nintendo**, **PlayStation**, **Xbox**, **Sega**, **PC**, **Emuladores**), que abrem ao clicar, com barra de busca e o nível de compatibilidade de cada jogo.
- Jogos grandes de console via emulador (ex.: **God of War III Remastered** no shadPS4): o app instala o emulador do repositório oficial e você escolhe o seu próprio jogo (dump do seu disco ou da sua compra). O app nunca baixa jogos.
- **Instalar pelo link de um repositório**: cole o endereço de um projeto do GitHub e o app instala a última versão publicada, escolhe o arquivo certo para o seu sistema e detecta o executável (ou você escolhe).
- Checklist de configuração com ações: selecionar a sua ROM (com validação por SHA-1), abrir a pasta e abrir o jogo pela primeira vez.
- Dicas nos termos técnicos (**ROM**, **assets**, **port**, **SHA-1**, **.o2r**, **release**, **manifesto**…): passe o mouse ou use o Tab para ver o que cada um significa. A da ROM também explica como usá-la no jogo.
- Capa e banner de cada jogo editáveis: lápis no canto do banner e na capa (ao passar o mouse). Para voltar ao padrão, use o menu ⚙ do jogo.
- Página **Dúvidas frequentes** na barra lateral: o que é uma ROM e como usá-la, SHA-1 não reconhecido, jogos via emulador, instalar pelo link de um repositório, saves nas atualizações, avisos do Windows, dados e PIN.
- Editor dos arquivos de configuração (JSON/INI/texto) em formulário ou texto, com backup automático antes de salvar.
- Botão **Jogar** com registro do último acesso e do tempo jogado.
- Busca rápida de jogos com `Ctrl+K` e página **Downloads** com o progresso das atualizações.
- Atualização dos jogos pelos GitHub Releases. O app:
  - verifica ao abrir e a cada 3 horas (usando ETag);
  - avisa com badge e notificação;
  - faz backup dos arquivos que a atualização vai substituir e preserva saves, configs e arquivos gerados da ROM;
  - restaura a versão anterior automaticamente se algo falhar.
- Botão **Voltar para versão anterior** usando o último backup: desfaz só o que a atualização trocou.
- Atualização do próprio launcher em segundo plano, com o botão azul na barra lateral, e este popup de novidades.
- Tema claro e escuro, interface em português (Brasil) e inglês.

### Melhorias

- Token pessoal do GitHub (opcional), cifrado com o cofre do sistema quando disponível, para aumentar o limite de consultas.
- Atualizações protegidas: só baixam do repositório declarado no manifesto, via HTTPS, conferem o tamanho e, quando o release publica, o SHA-256, e limitam o tamanho e a quantidade de arquivos extraídos (`.zip`, `.tar`, `.tar.xz` e `.7z`).
- Abertura rápida: a validação das ROMs fica guardada entre uma abertura e outra e a busca por atualizações começa depois que a biblioteca aparece.
- Ao remover um jogo da biblioteca, os backups que o app fez dele também são apagados (os arquivos do jogo continuam onde estão).
- Fechar o app no meio de uma atualização cancela e desfaz o que já tinha sido trocado antes de sair.
