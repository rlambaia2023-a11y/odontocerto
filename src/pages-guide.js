/* ===== Guia de dietas, receitas, exercícios e hábitos (equipe e portal do paciente) ===== */
const GDIETS = [
  {
    id: 'prato', nome: 'Prato equilibrado', sub: 'Guia Alimentar para a População Brasileira', tag: 'Para começar',
    resumo: 'Comida de verdade, sem cortar grupos: metade do prato com vegetais, um quarto com proteína e um quarto com carboidrato. É o ponto de partida mais fácil de manter.',
    beneficios: ['Fácil de seguir em família', 'Sem alimentos proibidos', 'Boa saciedade', 'Segura na amamentação'],
    comer: ['Arroz e feijão (de preferência integral)', 'Legumes e verduras variados', 'Frutas inteiras', 'Ovos, frango, peixe, carne magra', 'Leite e iogurte natural', 'Água como bebida principal'],
    evitar: ['Ultraprocessados (salgadinhos, biscoitos recheados, embutidos)', 'Refrigerantes e sucos de caixinha', 'Frituras frequentes', 'Comer em frente à tela'],
    dia: { 'Café da manhã': 'Pão integral com ovo mexido e 1 fruta', 'Almoço': 'Salada verde, arroz, feijão, frango grelhado e legumes refogados', 'Lanche': 'Iogurte natural com aveia', 'Jantar': 'Omelete de legumes com salada' },
    cuidado: 'Serve para quase todo mundo. Ajuste as porções de carboidrato conforme a meta de peso.',
  },
  {
    id: 'mediterranea', nome: 'Dieta Mediterrânea', sub: 'Coração, colesterol e longevidade', tag: 'Mais estudada',
    resumo: 'Inspirada no sul da Europa: azeite como gordura principal, peixes, leguminosas, vegetais, grãos integrais e oleaginosas. Tem forte evidência de proteção cardiovascular.',
    beneficios: ['Protege o coração', 'Melhora o colesterol', 'Anti-inflamatória', 'Segura na amamentação'],
    comer: ['Azeite extra virgem', 'Peixes 2 a 3 vezes por semana', 'Grão-de-bico, lentilha, feijão', 'Verduras, legumes e frutas', 'Castanhas e nozes (1 punhado/dia)', 'Iogurte natural e queijos brancos'],
    evitar: ['Carne vermelha em excesso', 'Embutidos', 'Açúcar e doces industrializados', 'Margarina e gordura hidrogenada'],
    dia: { 'Café da manhã': 'Iogurte natural com frutas vermelhas e nozes', 'Almoço': 'Peixe grelhado, grão-de-bico, salada com tomate, pepino e azeite', 'Lanche': 'Homus com palitos de cenoura', 'Jantar': 'Frango ao limão com legumes assados' },
    cuidado: 'O azeite é saudável, mas é calórico: use com medida (1 a 2 colheres de sopa por refeição).',
  },
  {
    id: 'mind', nome: 'Dieta MIND', sub: 'Mediterrânea + DASH para o cérebro', tag: 'Memória',
    resumo: 'Une a mediterrânea e a DASH, com foco em alimentos ligados à saúde do cérebro: folhas verdes, frutas vermelhas, oleaginosas, peixes e grãos integrais.',
    beneficios: ['Saúde cognitiva', 'Menos inflamação', 'Protege o coração', 'Segura na amamentação'],
    comer: ['Folhas verdes quase todo dia (couve, espinafre, rúcula)', 'Frutas vermelhas 2x por semana ou mais', 'Oleaginosas 5x por semana', 'Feijões dia sim, dia não', 'Peixe 1x por semana ou mais', 'Aves 2x por semana', 'Azeite como gordura principal'],
    evitar: ['Frituras e fast food', 'Manteiga e margarina em excesso', 'Queijos amarelos em excesso', 'Doces e confeitaria', 'Carne vermelha frequente'],
    dia: { 'Café da manhã': 'Aveia com morangos e castanhas', 'Almoço': 'Salada de folhas, arroz integral, feijão e frango', 'Lanche': '1 fruta e um punhado de nozes', 'Jantar': 'Salmão ou sardinha com brócolis e quinoa' },
    cuidado: 'Não é uma dieta para perder peso rápido; combine com controle de porções.',
  },
  {
    id: 'dash', nome: 'Dieta DASH', sub: 'Para pressão alta', tag: 'Hipertensão',
    resumo: 'Criada para baixar a pressão: muito vegetal e fruta, laticínios magros, pouco sal e pouca gordura saturada. Ajuda também no peso e na glicemia.',
    beneficios: ['Reduz a pressão arterial', 'Rica em potássio e fibras', 'Ajuda no colesterol', 'Segura na amamentação'],
    comer: ['4 a 5 porções de vegetais por dia', '4 a 5 porções de frutas por dia', 'Leite e iogurte desnatados', 'Grãos integrais', 'Feijões, castanhas e sementes', 'Temperos naturais (alho, cebola, ervas)'],
    evitar: ['Sal em excesso (meta: até 5 g/dia, 1 colher de chá)', 'Embutidos e enlatados', 'Temperos prontos em cubo ou sachê', 'Salgadinhos', 'Bebidas açucaradas'],
    dia: { 'Café da manhã': 'Mamão com iogurte desnatado e aveia', 'Almoço': 'Salada colorida, arroz integral, lentilha e peixe assado', 'Lanche': 'Banana com pasta de amendoim sem sal', 'Jantar': 'Sopa de legumes com frango desfiado' },
    cuidado: 'Quem usa remédio para pressão deve medir a pressão com frequência: ela pode cair e a dose precisar de ajuste.',
  },
  {
    id: 'lowcarb', nome: 'Low carb moderada', sub: 'Menos carboidrato, sem radicalismo', tag: 'Glicemia',
    resumo: 'Reduz pães, massas, arroz e açúcar (cerca de 100 a 130 g de carboidrato por dia) e aumenta proteínas, vegetais e gorduras boas. Ajuda no apetite e na glicemia.',
    beneficios: ['Menos fome entre as refeições', 'Melhora a glicemia', 'Boa para resistência à insulina', 'Flexível'],
    comer: ['Ovos, peixes, frango e carnes magras', 'Verduras e legumes à vontade', 'Abacate, azeite, castanhas', 'Queijos e iogurte natural', 'Frutas com moderação (1 a 2 por dia)', 'Feijão em pequena porção'],
    evitar: ['Açúcar, doces e refrigerantes', 'Pão branco, massas e farinhas refinadas', 'Sucos de fruta', 'Biscoitos e bolos'],
    dia: { 'Café da manhã': 'Ovos mexidos com tomate e queijo branco', 'Almoço': 'Salada grande, carne magra, legumes e 2 colheres de feijão', 'Lanche': 'Iogurte natural com chia', 'Jantar': 'Peixe com purê de couve-flor e brócolis' },
    cuidado: 'Quem usa insulina ou remédios para diabetes pode ter hipoglicemia: ajuste com a equipe antes de começar.',
  },
  {
    id: 'keto', nome: 'Cetogênica', sub: 'Carboidrato muito baixo (até 50 g/dia)', tag: 'Com supervisão',
    resumo: 'Corta quase todo carboidrato para o corpo usar gordura como combustível (cetose). Pode acelerar a perda de peso no início, mas é restritiva e difícil de manter.',
    beneficios: ['Perda de peso inicial rápida', 'Redução do apetite', 'Controle da glicemia', 'Menos picos de fome'],
    comer: ['Ovos, carnes, aves e peixes', 'Abacate, azeite, óleo de coco com moderação', 'Verduras de baixo amido (folhas, brócolis, abobrinha)', 'Queijos', 'Castanhas'],
    evitar: ['Pães, massas, arroz e farinhas', 'Açúcar e doces', 'Batata, mandioca, milho', 'Frutas (exceto frutas vermelhas em pouca quantidade)', 'Feijões e grãos'],
    dia: { 'Café da manhã': 'Omelete com queijo e espinafre', 'Almoço': 'Frango com creme de queijo e brócolis', 'Lanche': 'Queijo e castanhas', 'Jantar': 'Salmão com salada de folhas e abacate' },
    cuidado: 'Não é indicada na gestação ou amamentação, nem para quem usa insulina ou inibidores de SGLT2 (dapagliflozina, empagliflozina) sem supervisão médica. Faça exames de colesterol e função renal.',
  },
  {
    id: 'ketomed', nome: 'Cetogênica mediterrânea', sub: 'Low carb com gorduras do Mediterrâneo', tag: 'Com supervisão',
    resumo: 'Versão cetogênica que prioriza azeite, peixes gordurosos, nozes e vegetais, no lugar de bacon, manteiga e carnes processadas. Junta o efeito no peso com a proteção do coração.',
    beneficios: ['Perda de peso', 'Perfil de gordura mais saudável', 'Saciedade', 'Controle da glicemia'],
    comer: ['Azeite extra virgem', 'Salmão, sardinha e atum', 'Abacate e azeitonas', 'Nozes, amêndoas e castanhas', 'Folhas, brócolis, abobrinha, berinjela', 'Ovos'],
    evitar: ['Pães, massas, arroz', 'Açúcares', 'Batatas', 'Carnes processadas', 'Frutas (exceto frutas vermelhas)'],
    dia: { 'Café da manhã': 'Ovos com abacate e azeite', 'Almoço': 'Sardinha assada com salada de rúcula, azeitonas e nozes', 'Lanche': 'Um punhado de amêndoas', 'Jantar': 'Berinjela recheada com carne moída magra e queijo' },
    cuidado: 'Mesmos cuidados da cetogênica: não usar na gestação e amamentação e fazer com acompanhamento.',
  },
  {
    id: 'jejum', nome: 'Jejum intermitente', sub: 'Janela de alimentação (ex.: 12/12 ou 14/10)', tag: 'Com cautela',
    resumo: 'Concentra as refeições numa janela do dia. Funciona para quem tem facilidade em ficar sem comer; o resultado vem da redução total de calorias, não de mágica.',
    beneficios: ['Simplifica a rotina', 'Ajuda a reduzir lanches', 'Pode melhorar a glicemia'],
    comer: ['Refeições completas dentro da janela', 'Proteína em todas as refeições', 'Água, café e chá sem açúcar durante o jejum', 'Vegetais e fibras'],
    evitar: ['Compensar com exagero ao abrir a janela', 'Jejum longo usando tirzepatida com pouca ingestão de proteína', 'Ficar sem água'],
    dia: { 'Abre a janela (12h)': 'Almoço completo com salada, proteína e feijão', 'Lanche (16h)': 'Iogurte com fruta', 'Fecha a janela (20h)': 'Jantar com peixe e legumes' },
    cuidado: 'Não indicado na gestação, amamentação, para quem tem histórico de transtorno alimentar ou usa insulina ou sulfonilureia. Com tirzepatida o apetite já cai muito: o risco é não comer proteína suficiente.',
  },
];

const GRECIPES = [
  { nome: 'Omelete de forno com legumes', tempo: '25 min', porcoes: '2', kcal: '~280 kcal/porção · 22 g proteína', ing: ['4 ovos', '1/2 abobrinha ralada', '1 tomate picado', '1/2 cebola', 'Espinafre a gosto', '2 colheres de queijo cottage', 'Sal, pimenta e orégano'], modo: ['Bata os ovos com o cottage e os temperos.', 'Misture os legumes.', 'Coloque em forma untada com azeite.', 'Asse a 200 °C por cerca de 20 minutos.'] },
  { nome: 'Salada de grão-de-bico com atum', tempo: '10 min', porcoes: '2', kcal: '~350 kcal/porção · 28 g proteína', ing: ['1 lata de atum em água', '1 xícara de grão-de-bico cozido', '1 tomate', '1/2 pepino', 'Cebola roxa', 'Salsinha', '1 colher de azeite e suco de limão'], modo: ['Escorra o atum e o grão-de-bico.', 'Pique os vegetais.', 'Misture tudo e tempere com azeite, limão e sal.'] },
  { nome: 'Frango com legumes na assadeira', tempo: '40 min', porcoes: '3', kcal: '~320 kcal/porção · 35 g proteína', ing: ['500 g de peito de frango em cubos', '1 brócolis', '2 cenouras', '1 abobrinha', '1 cebola', '2 dentes de alho', 'Azeite, páprica e ervas'], modo: ['Tempere o frango com alho, páprica, sal e limão.', 'Corte os legumes em pedaços parecidos.', 'Espalhe tudo na assadeira com um fio de azeite.', 'Asse a 200 °C por 30 a 35 minutos, mexendo na metade.'] },
  { nome: 'Crepioca de frango', tempo: '15 min', porcoes: '1', kcal: '~300 kcal · 30 g proteína', ing: ['1 ovo', '2 colheres de goma de tapioca', '1 colher de requeijão light', '3 colheres de frango desfiado', 'Tomate e orégano'], modo: ['Bata o ovo com a tapioca e uma pitada de sal.', 'Despeje em frigideira antiaderente quente.', 'Vire, recheie com frango, requeijão e tomate e dobre.'] },
  { nome: 'Iogurte proteico com frutas vermelhas', tempo: '5 min', porcoes: '1', kcal: '~250 kcal · 20 g proteína', ing: ['1 pote de iogurte natural ou grego sem açúcar', '1/2 xícara de frutas vermelhas', '1 colher de chia', '1 colher de aveia', 'Canela'], modo: ['Monte em camadas no pote.', 'Deixe 5 minutos para a chia hidratar.'] },
  { nome: 'Sopa de legumes com carne moída', tempo: '35 min', porcoes: '4', kcal: '~260 kcal/porção · 24 g proteína', ing: ['400 g de patinho moído', '1 chuchu', '1 cenoura', '1 abobrinha', 'Couve picada', 'Cebola, alho e cheiro-verde'], modo: ['Refogue cebola, alho e carne até dourar.', 'Junte os legumes picados e cubra com água.', 'Cozinhe por 20 minutos.', 'Acrescente a couve no final e finalize com cheiro-verde.'] },
  { nome: 'Peixe ao forno com crosta de ervas', tempo: '25 min', porcoes: '2', kcal: '~280 kcal/porção · 32 g proteína', ing: ['2 filés de tilápia ou pescada', 'Suco de 1 limão', '2 colheres de farinha de linhaça ou aveia', 'Salsinha e cebolinha', 'Alho e azeite'], modo: ['Tempere o peixe com limão, alho e sal.', 'Misture a farinha com as ervas e um fio de azeite.', 'Cubra os filés com a mistura.', 'Asse a 200 °C por 15 a 18 minutos.'] },
  { nome: 'Lanche rápido: ovos cozidos e castanhas', tempo: '12 min', porcoes: '1', kcal: '~230 kcal · 14 g proteína', ing: ['2 ovos', '1 punhado pequeno de castanhas (10 g)', '1 fruta pequena'], modo: ['Cozinhe os ovos por 10 minutos e deixe na geladeira para a semana.', 'Leve na bolsa com as castanhas e a fruta.'] },
];

const GWEEK = {
  iniciante: { nome: 'Iniciante', para: 'Sedentário ou voltando agora', dias: [['Seg', 'Caminhada leve 20 a 30 min'], ['Ter', 'Força · treino A (corpo todo)'], ['Qua', 'Alongamento ou descanso'], ['Qui', 'Caminhada 20 a 30 min'], ['Sex', 'Força · treino B (corpo todo)'], ['Sáb', 'Atividade livre: dança, bicicleta, passeio'], ['Dom', 'Descanso']] },
  intermediario: { nome: 'Intermediário', para: 'Já se exercita 2 a 3 vezes por semana', dias: [['Seg', 'Força · pernas e glúteos'], ['Ter', 'Caminhada rápida ou bicicleta 40 min'], ['Qua', 'Força · costas, peito e braços'], ['Qui', 'Aeróbico 30 min + abdominais'], ['Sex', 'Força · corpo todo'], ['Sáb', 'Caminhada longa ou esporte'], ['Dom', 'Descanso']] },
  avancado: { nome: 'Avançado', para: 'Treina com regularidade há meses', dias: [['Seg', 'Força · inferiores'], ['Ter', 'Força · superiores'], ['Qua', 'Intervalado (HIIT) 20 min + mobilidade'], ['Qui', 'Força · inferiores'], ['Sex', 'Força · superiores'], ['Sáb', 'Aeróbico longo 45 a 60 min'], ['Dom', 'Descanso ativo']] },
};
const GMOVES = [
  ['Agachamento na cadeira', '3 × 10 a 15', 'Sente e levante sem usar as mãos; joelhos alinhados com os pés.'],
  ['Flexão na parede ou no sofá', '3 × 8 a 12', 'Quanto mais inclinado, mais fácil. Corpo reto do ombro ao pé.'],
  ['Ponte de glúteo', '3 × 12 a 15', 'Deitado, pés no chão, suba o quadril e aperte o glúteo por 2 segundos.'],
  ['Remada com mochila ou garrafas', '3 × 12', 'Tronco inclinado, puxe o peso até a cintura, sem curvar a coluna.'],
  ['Afundo com apoio', '3 × 8 por perna', 'Segure numa parede ou cadeira. Desça até o joelho de trás quase tocar o chão.'],
  ['Elevação de panturrilha', '3 × 15 a 20', 'Na ponta dos pés, devagar, segurando num apoio.'],
  ['Prancha', '3 × 20 a 40 s', 'Antebraços no chão, abdômen firme. Comece com os joelhos apoiados.'],
  ['Perdigueiro (bird-dog)', '3 × 10 por lado', 'De quatro, estique braço e perna opostos, sem girar o quadril.'],
];

const GTIRZ = [
  ['Coma devagar e pare ao primeiro sinal de saciedade', 'O remédio deixa o estômago mais lento. Comer rápido ou até "estufar" é a principal causa de náusea e refluxo.'],
  ['Proteína primeiro', 'Comece a refeição pela proteína (ovo, frango, peixe, carne, iogurte, queijo). Com pouco apetite, garante que a parte mais importante entre. Meta comum: 1,2 a 1,6 g por kg de peso por dia.'],
  ['Refeições menores, mais vezes', 'Prefira 4 a 5 refeições pequenas a 2 grandes.'],
  ['Água o dia todo', 'Pelo menos 2 litros, em goles ao longo do dia. Desidratação piora náusea, tontura, prisão de ventre e pode afetar os rins.'],
  ['Evite frituras, gordura e álcool', 'Comidas gordurosas e bebida alcoólica são as que mais provocam enjoo, arrotos com cheiro de ovo e diarreia.'],
  ['Prisão de ventre', 'Aumente fibras aos poucos (verduras, frutas com casca, aveia, chia, psyllium), beba mais água e caminhe todo dia.'],
  ['Náusea', 'Alimentos secos e frios (bolacha de água e sal, frutas geladas), chá de gengibre, não deitar logo após comer.'],
  ['Musculação é obrigatória', 'Parte do peso perdido pode ser músculo. Treino de força 2 a 3 vezes por semana e proteína suficiente preservam a massa magra e o metabolismo.'],
  ['Mesmo dia da semana, rodízio do local', 'Aplique sempre no mesmo dia da semana e alterne abdômen, coxa e braço para evitar irritação da pele.'],
  ['Esqueceu a dose?', 'Aplique assim que lembrar, se ainda estiver dentro de 4 dias (96 horas). Passou disso: pule e aplique no dia de costume. Nunca aplique duas doses juntas. Na dúvida, fale com a clínica.'],
  ['Anticoncepcional em comprimido', 'A tirzepatida pode reduzir o efeito da pílula. Use também camisinha por 4 semanas após começar e após cada aumento de dose. Planeja engravidar? Avise a equipe: o remédio deve ser suspenso antes.'],
];
const GALERTA = ['Dor forte e contínua na barriga, que pode ir para as costas, com ou sem vômito', 'Vômitos ou diarreia que não param, boca seca, urina muito escura ou pouca urina', 'Dor do lado direito, abaixo das costelas, pele ou olhos amarelados, febre', 'Inchaço no rosto, falta de ar ou manchas pelo corpo depois da aplicação', 'Tremor, suor frio e confusão (mais comum em quem também usa insulina ou outros remédios para diabetes)'];

const GSUPL = [
  ['Proteína em pó (whey ou vegetal)', 'Quando não se consegue atingir a meta de proteína só com comida. Útil com tirzepatida, que reduz muito o apetite.', 'Dose comum: 20 a 30 g, 1 a 2 vezes por dia. Quem tem doença renal precisa de avaliação.'],
  ['Creatina', 'A mais estudada para força e manutenção de massa muscular, inclusive em quem está emagrecendo.', '3 a 5 g por dia, todos os dias, em qualquer horário. Avaliar função renal antes.'],
  ['Vitamina D', 'Deficiência é comum, principalmente com obesidade. Só deve ser reposta conforme exame.', 'A dose depende do nível no sangue: evite tomar por conta própria.'],
  ['Vitamina B12', 'Quem usa metformina, é vegetariano ou fez cirurgia bariátrica tende a ter falta.', 'Repor conforme exame.'],
  ['Fibra (psyllium)', 'Ajuda na prisão de ventre e na saciedade.', '5 g (1 colher de chá cheia) em um copo grande de água; comece com metade.'],
  ['Ômega-3', 'Para quem quase não come peixe; pode ajudar nos triglicerídeos.', 'Prefira comer peixe 2 vezes por semana. Use cápsula com orientação.'],
  ['Multivitamínico', 'Útil em dietas muito restritivas ou com ingestão muito baixa de comida.', 'Não substitui comida variada.'],
  ['Ferro', 'Comum faltar no pós-parto e em quem menstrua muito.', 'Só com exame: ferro em excesso faz mal.'],
];

const GTIPS = [
  ['alimentação', 'Monte o prato com metade de vegetais antes de servir o resto.'],
  ['tirzepatida', 'Comece a refeição pela proteína: com pouco apetite, ela é a parte mais importante.'],
  ['hidratação', 'Deixe uma garrafa de água à vista. Quem vê, bebe mais.'],
  ['treino', 'Dois treinos de força por semana já ajudam a preservar a massa muscular.'],
  ['alimentação', 'Troque o suco pela fruta inteira: mais fibra, mais saciedade e menos açúcar.'],
  ['sono', 'Durma 7 a 8 horas. Pouco sono aumenta a fome no dia seguinte.'],
  ['tirzepatida', 'Sentiu o primeiro sinal de saciedade? Pare. O estômago está mais lento.'],
  ['treino', 'Não tem tempo? 10 minutos de caminhada depois das refeições ajudam a glicemia.'],
  ['alimentação', 'Tenha ovos cozidos na geladeira: proteína pronta para a semana.'],
  ['hábito', 'Coma sentado, sem celular. Atenção na comida reduz o exagero.'],
  ['tirzepatida', 'Frituras e álcool são os maiores vilões do enjoo. Evite nos dias perto da aplicação.'],
  ['alimentação', 'Leia o rótulo: se o primeiro ingrediente é açúcar ou farinha, deixe na prateleira.'],
  ['treino', 'Suba escadas sempre que puder. Pequenos movimentos somam no fim do dia.'],
  ['hidratação', 'Urina clara é sinal de boa hidratação. Escura? Beba mais água.'],
  ['hábito', 'Pese-se sempre no mesmo horário, de manhã e em jejum.'],
  ['alimentação', 'Feijão é proteína e fibra baratas. Não corte do prato.'],
  ['treino', 'Aumente a carga ou as repetições aos poucos: o músculo precisa de desafio.'],
  ['tirzepatida', 'Prisão de ventre? Água, fibra e caminhada, nessa ordem.'],
  ['alimentação', 'Planeje as marmitas no domingo: menos chance de pedir delivery na semana.'],
  ['sono', 'Jante pelo menos 2 horas antes de deitar para evitar refluxo.'],
  ['hábito', 'Tire fotos e meça a cintura todo mês. A balança não conta toda a história.'],
  ['alimentação', 'Castanhas são ótimas, mas um punhado (10 a 15 g) basta.'],
  ['treino', 'Alongue-se por 5 minutos ao acordar: menos dor e mais disposição.'],
  ['hidratação', 'Café e chá sem açúcar contam como líquido. Refrigerante não.'],
  ['tirzepatida', 'Aplique sempre no mesmo dia da semana e alterne o local da injeção.'],
  ['alimentação', 'Use temperos naturais (alho, limão, ervas) e reduza o sal.'],
  ['hábito', 'Um dia fora do plano não estraga nada. Volte na próxima refeição.'],
  ['treino', 'Faça o que você gosta: a melhor atividade física é a que você mantém.'],
  ['alimentação', 'Iogurte natural com fruta é um lanche completo e rápido.'],
  ['hábito', 'Comemore cada quilo e cada centímetro. Constância vale mais que pressa.'],
];
const GTIPCOL = { 'alimentação': 'ok', tirzepatida: 'accent', 'hidratação': '', treino: 'warn', sono: 'gray', 'hábito': 'gray' };
const tipOfDay = (d = new Date()) => { const n = Math.floor((startOfDay(d) - new Date(d.getFullYear(), 0, 0)) / 864e5); return GTIPS[n % GTIPS.length]; };
const tipCard = () => { const [c, t] = tipOfDay(); return html`<div class="card gtip"><div class="row between" style="gap:8px"><span class="pill ${GTIPCOL[c] || ''}">${icon('sparkle')} Dica do dia · ${c}</span><a class="small" href="#/guia">Ver o guia</a></div><p style="margin:10px 0 0;font-size:1.02rem;font-weight:600">${t}</p></div>`; };

/* ---------- textos para compartilhar ---------- */
const GNOTE = 'Orientações gerais: não substituem a consulta. Ajustes individuais devem ser feitos com a equipe.';
function guideText(k) {
  const clin = S.clinic?.name ? `\n\n${S.clinic.name}` : '';
  if (k.startsWith('diet:')) {
    const d = GDIETS.find(x => x.id === k.slice(5)); if (!d) return '';
    return `*${d.nome}*\n${d.resumo}\n\n*Pode comer:*\n${d.comer.map(x => '• ' + x).join('\n')}\n\n*Evite:*\n${d.evitar.map(x => '• ' + x).join('\n')}\n\n*Exemplo de um dia:*\n${Object.entries(d.dia).map(([a, b]) => `• ${a}: ${b}`).join('\n')}\n\n⚠️ ${d.cuidado}\n\n_${GNOTE}_${clin}`;
  }
  if (k.startsWith('rec:')) {
    const r = GRECIPES[+k.slice(4)]; if (!r) return '';
    return `*${r.nome}*\n${r.tempo} · rende ${r.porcoes} · ${r.kcal}\n\n*Ingredientes:*\n${r.ing.map(x => '• ' + x).join('\n')}\n\n*Modo de preparo:*\n${r.modo.map((x, i) => `${i + 1}. ${x}`).join('\n')}${clin}`;
  }
  if (k.startsWith('week:')) {
    const w = GWEEK[k.slice(5)]; if (!w) return '';
    return `*Plano semanal de exercícios · ${w.nome}*\n${w.dias.map(([a, b]) => `• ${a}: ${b}`).join('\n')}\n\n*Treino de força em casa (A e B):*\n${GMOVES.map(m => `• ${m[0]}: ${m[1]}`).join('\n')}\n\nAqueça 5 minutos antes e pare se sentir dor no peito, falta de ar forte ou tontura.\n\n_${GNOTE}_${clin}`;
  }
  if (k === 'tirz') return `*Cuidados durante o tratamento com tirzepatida*\n\n${GTIRZ.map(([a, b]) => `*${a}*\n${b}`).join('\n\n')}\n\n🚨 *Procure atendimento ou fale com a clínica se tiver:*\n${GALERTA.map(x => '• ' + x).join('\n')}${clin}`;
  return '';
}
act('gShare', el => {
  const txt = guideText(el.dataset.k);
  modal('Enviar ao paciente', html`<p class="small muted" style="margin-top:0">Confira o texto. O WhatsApp abre com a mensagem pronta para você escolher o contato.</p>
    <textarea class="in" id="gsharetxt" rows="12" style="width:100%;font-size:.86rem">${txt}</textarea>`, { footer: html`<button class="btn" data-act="gCopy">Copiar</button><a class="btn primary" target="_blank" rel="noopener" data-act="gWa" href="#">${icon('wa')} Abrir WhatsApp</a>` });
});
act('gCopy', async () => { const t = document.getElementById('gsharetxt')?.value || ''; try { await navigator.clipboard.writeText(t); toast('Texto copiado.', 'ok'); } catch { toast('Não foi possível copiar. Selecione o texto e copie.', 'bad'); } });
act('gWa', () => { const t = document.getElementById('gsharetxt')?.value || ''; window.open(waLink('', t), '_blank', 'noopener'); });

const shareBtn = k => S.mode === 'patient' ? '' : html`<button class="btn sm" data-act="gShare" data-k="${k}">${icon('wa')} Enviar</button>`;
const ulist = (arr, cls = '') => html`<ul class="glist ${cls}">${arr.map(x => html`<li>${x}</li>`)}</ul>`;

act('gDiet', el => {
  const d = GDIETS.find(x => x.id === el.dataset.id); if (!d) return;
  modal(d.nome, html`<p class="muted small" style="margin-top:0">${d.sub}</p><p style="margin-top:0">${d.resumo}</p>
    <div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:12px">${d.beneficios.map(b => html`<span class="pill ok">${b}</span>`)}</div>
    <div class="grid g2 collapse"><div><h3>Pode comer</h3>${ulist(d.comer, 'yes')}</div><div><h3>Evite</h3>${ulist(d.evitar, 'no')}</div></div>
    <h3 style="margin-top:14px">Exemplo de um dia</h3><div class="list">${Object.entries(d.dia).map(([a, b]) => html`<div class="li small"><b style="min-width:120px">${a}</b><span class="grow">${b}</span></div>`)}</div>
    <div class="gwarn" style="margin-top:14px">${d.cuidado}</div>`, { wide: true, footer: S.mode === 'patient' ? '' : html`<button class="btn primary" data-act="gShare" data-k="diet:${d.id}">${icon('wa')} Enviar ao paciente</button>` });
});
act('gRecipe', el => {
  const i = +el.dataset.i, r = GRECIPES[i]; if (!r) return;
  modal(r.nome, html`<div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:10px"><span class="pill gray">${r.tempo}</span><span class="pill gray">rende ${r.porcoes}</span><span class="pill ok">${r.kcal}</span></div>
    <div class="grid g2 collapse"><div><h3>Ingredientes</h3>${ulist(r.ing)}</div><div><h3>Modo de preparo</h3><ol class="glist">${r.modo.map(x => html`<li>${x}</li>`)}</ol></div></div>`, { wide: true, footer: S.mode === 'patient' ? '' : html`<button class="btn primary" data-act="gShare" data-k="rec:${i}">${icon('wa')} Enviar ao paciente</button>` });
});

/* ---------- calculadoras ---------- */
const ACTF = { 1.2: 'Sedentário (pouco ou nenhum exercício)', 1.375: 'Leve (1 a 3 dias por semana)', 1.55: 'Moderado (3 a 5 dias por semana)', 1.725: 'Intenso (6 a 7 dias por semana)' };
function calcOut(d) {
  const peso = parseFloat(String(d.peso || '').replace(',', '.')), alt = parseFloat(String(d.altura || '').replace(',', '.')), idade = parseInt(d.idade, 10);
  if (!(peso >= 30 && peso <= 350) || !(alt >= 120 && alt <= 230)) return html`<div class="empty small muted">Preencha peso (kg) e altura (cm) para ver os resultados.</div>`;
  const h = alt / 100, imc = peso / (h * h);
  const ideal = 25 * h * h, pAj = imc > 30 ? ideal + 0.25 * (peso - ideal) : peso;
  const okAge = idade >= 15 && idade <= 100;
  const tmb = okAge ? 10 * peso + 6.25 * alt - 5 * idade + (d.sexo === 'M' ? 5 : -161) : null;
  const get = tmb ? tmb * (+d.fator || 1.2) : null;
  const meta = get ? Math.max(d.sexo === 'M' ? 1500 : 1200, get - 500) : null;
  const agua = Math.min(4, Math.max(2, peso * 0.035));
  const r0 = n => Math.round(n).toLocaleString('pt-BR');
  const tile = (l, v, s) => html`<div class="card kpi"><div class="l">${l}</div><div class="v" style="font-size:1.25rem">${v}</div><div class="tiny muted">${s}</div></div>`;
  return html`<div class="grid g3 collapse">
    ${tile('IMC', num1(imc), imcLabel(imc))}
    ${tile('Peso saudável (IMC 18,5 a 24,9)', `${num1(18.5 * h * h)} a ${num1(24.9 * h * h)} kg`, 'faixa de referência para adultos')}
    ${tile('Água por dia', `${agua.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L`, '35 ml por kg, entre 2 e 4 litros')}
    ${tile('Proteína por dia', `${r0(pAj * 1.2)} a ${r0(pAj * 1.6)} g`, imc > 30 ? `1,2 a 1,6 g/kg sobre o peso ajustado (${num1(pAj)} kg)` : '1,2 a 1,6 g por kg')}
    ${tile('Gasto do dia', get ? r0(get) + ' kcal' : '—', tmb ? `metabolismo basal ${r0(tmb)} kcal (Mifflin-St Jeor)` : 'informe a idade')}
    ${tile('Meta para emagrecer', meta ? '~' + r0(meta) + ' kcal' : '—', meta ? 'déficit de cerca de 500 kcal/dia ≈ 0,5 kg por semana' : 'informe a idade')}
  </div><p class="tiny muted" style="margin:10px 0 0">Estimativas para adultos. Gestantes, lactantes, atletas e pessoas com doença renal ou hepática precisam de cálculo individual.</p>`;
}
onInput('gCalc', el => { const f = el.closest('form'); const box = document.getElementById('gcalcout'); if (f && box) box.innerHTML = fv(calcOut(formData(f))); });

/* ---------- página ---------- */
const GTABS = [['dietas', 'Dietas', 'leaf'], ['receitas', 'Receitas', 'clip'], ['exercicios', 'Exercícios', 'dumb'], ['tirzepatida', 'Cuidados com tirzepatida', 'pill'], ['suplementos', 'Suplementos', 'box'], ['calculadoras', 'Calculadoras', 'calc']];
async function guidePage(q) {
  const t = GTABS.some(x => x[0] === q.get('t')) ? q.get('t') : 'dietas'; const lvl = GWEEK[q.get('n')] ? q.get('n') : 'iniciante';
  const patient = S.mode === 'patient';
  let body;
  if (t === 'dietas') body = html`<p class="muted small" style="margin-top:0">Não existe dieta perfeita: a melhor é a que a pessoa consegue manter. Toque numa opção para ver o que comer, o que evitar e um exemplo de dia.</p>
    <div class="grid g2 collapse">${GDIETS.map(d => html`<div class="card gcard"><div class="row between" style="gap:8px"><h3 style="margin:0">${d.nome}</h3><span class="pill ${/supervis|cautela/i.test(d.tag) ? 'warn' : 'ok'}">${d.tag}</span></div>
      <div class="tiny muted" style="margin-top:2px">${d.sub}</div><p class="small" style="margin:8px 0 10px">${d.resumo}</p>
      <div class="row" style="gap:8px"><button class="btn sm primary" data-act="gDiet" data-id="${d.id}">Ver detalhes</button>${shareBtn('diet:' + d.id)}</div></div>`)}</div>`;
  else if (t === 'receitas') body = html`<p class="muted small" style="margin-top:0">Receitas simples, com bastante proteína e poucos ingredientes. Servem para quem usa tirzepatida e come pouco por refeição.</p>
    <div class="grid g2 collapse">${GRECIPES.map((r, i) => html`<div class="card gcard"><h3 style="margin:0">${r.nome}</h3><div class="row" style="gap:6px;margin:8px 0;flex-wrap:wrap"><span class="pill gray">${r.tempo}</span><span class="pill ok">${r.kcal}</span></div>
      <div class="row" style="gap:8px"><button class="btn sm primary" data-act="gRecipe" data-i="${i}">Ver receita</button>${shareBtn('rec:' + i)}</div></div>`)}</div>`;
  else if (t === 'exercicios') { const w = GWEEK[lvl]; body = html`<div class="card gwarn" style="margin-bottom:14px"><b>Recomendação da OMS:</b> 150 a 300 minutos de atividade moderada por semana (ex.: 30 min, 5 dias) e treino de força pelo menos 2 vezes por semana. Quem está emagrecendo, principalmente com tirzepatida, precisa do treino de força para não perder músculo.</div>
    <div class="row between" style="gap:10px;margin-bottom:10px"><div class="seg">${Object.entries(GWEEK).map(([k, v]) => html`<a class="${lvl === k ? 'on' : ''}" href="#/guia?t=exercicios&n=${k}">${v.nome}</a>`)}</div>${shareBtn('week:' + lvl)}</div>
    <div class="grid g2 collapse"><div class="card"><h3 style="margin-top:0">Semana · ${w.nome}</h3><div class="tiny muted" style="margin-bottom:8px">${w.para}</div><div class="list">${w.dias.map(([a, b]) => html`<div class="li small"><b style="min-width:44px">${a}</b><span class="grow">${b}</span></div>`)}</div></div>
      <div class="card"><h3 style="margin-top:0">Treino de força em casa</h3><div class="tiny muted" style="margin-bottom:8px">Treino A: os 4 primeiros · Treino B: os 4 últimos. Descanse 60 a 90 s entre as séries.</div><div class="list">${GMOVES.map(m => html`<div class="li small" style="align-items:flex-start"><span class="grow"><b>${m[0]}</b><br><span class="tiny muted">${m[2]}</span></span><span class="pill gray">${m[1]}</span></div>`)}</div></div></div>
    <div class="grid g3 collapse" style="margin-top:14px">
      <div class="card"><h3 style="margin-top:0">Como progredir</h3>${ulist(['Semanas 1 e 2: aprenda os movimentos, sem pressa', 'Semanas 3 e 4: aumente as repetições', 'A partir do mês 2: acrescente peso (garrafas, mochila, halteres, academia)', 'Caminhada: some 5 minutos por semana até 45 minutos'])}</div>
      <div class="card"><h3 style="margin-top:0">Pós-parto</h3>${ulist(['Espere a liberação médica (em geral 6 semanas; cesárea pode precisar de mais tempo)', 'Comece pelo assoalho pélvico e pela respiração', 'Evite abdominais tradicionais se houver diástase', 'Amamentando: beba mais água e não corte calorias demais'])}</div>
      <div class="card"><h3 style="margin-top:0">Pare e procure ajuda se</h3>${ulist(['Dor ou aperto no peito', 'Falta de ar muito forte ou fora do normal', 'Tontura, desmaio ou palpitação', 'Dor articular que não passa'], 'no')}</div></div>`; }
  else if (t === 'tirzepatida') body = html`<div class="row between" style="gap:10px;margin-bottom:10px"><p class="muted small" style="margin:0">Orientações práticas para reduzir efeitos colaterais e preservar a massa muscular durante o tratamento.</p>${shareBtn('tirz')}</div>
    <div class="grid g2 collapse">${GTIRZ.map(([a, b]) => html`<div class="card"><h3 style="margin:0 0 6px">${a}</h3><p class="small" style="margin:0">${b}</p></div>`)}</div>
    <div class="card" style="margin-top:14px;border-color:var(--bad)"><h3 style="margin-top:0;color:var(--bad)">Sinais de alerta: procure atendimento</h3>${ulist(GALERTA, 'no')}
      ${patient && S.clinic.phone ? html`<a class="btn sm" target="_blank" rel="noopener" href="${waLink(S.clinic.phone, 'Olá! Estou no tratamento com tirzepatida e gostaria de falar sobre um sintoma.')}">${icon('wa')} Falar com a clínica</a>` : ''}</div>`;
  else if (t === 'suplementos') body = html`<div class="card gwarn" style="margin-bottom:14px">Suplemento não substitui comida nem é obrigatório. Use só com indicação da equipe, de preferência com exames recentes.</div>
    <div class="grid g2 collapse">${GSUPL.map(([a, b, c]) => html`<div class="card"><h3 style="margin:0 0 6px">${a}</h3><p class="small" style="margin:0 0 6px">${b}</p><div class="tiny muted">${c}</div></div>`)}</div>`;
  else {
    let pre = { peso: '', altura: '', idade: '', sexo: 'F' };
    if (patient) {
      const p = S.patient || {}; const [[tr], logs] = await Promise.all([db.list('weight_treatments', { eq: { patient_id: p.id }, limit: 1 }).catch(() => []), db.list('weight_logs', { eq: { patient_id: p.id }, order: 'data.desc,created_at.desc', limit: 1 }).catch(() => [])]);
      pre = { peso: logs[0]?.peso ?? tr?.peso_inicial ?? '', altura: tr?.altura ? Math.round(tr.altura * 100) : '', idade: age(p.birth_date) ?? '', sexo: p.sex === 'M' ? 'M' : 'F' };
    }
    const d = { ...pre, fator: '1.2' };
    body = html`<div class="card"><form data-form="gCalcNo" data-input="gCalc" data-change="gCalc" class="grid g3 collapse">
      <label class="f"><span>Peso (kg)</span><input class="in" name="peso" inputmode="decimal" value="${pre.peso}" placeholder="85"></label>
      <label class="f"><span>Altura (cm)</span><input class="in" name="altura" inputmode="numeric" value="${pre.altura}" placeholder="165"></label>
      <label class="f"><span>Idade</span><input class="in" name="idade" inputmode="numeric" value="${pre.idade}" placeholder="40"></label>
      <label class="f"><span>Sexo biológico</span><select class="in" name="sexo"><option value="F" ${pre.sexo === 'F' ? 'selected' : ''}>Feminino</option><option value="M" ${pre.sexo === 'M' ? 'selected' : ''}>Masculino</option></select></label>
      <label class="f" style="grid-column:span 2"><span>Nível de atividade</span><select class="in" name="fator">${Object.entries(ACTF).map(([k, v]) => html`<option value="${k}">${v}</option>`)}</select></label>
    </form></div><div id="gcalcout" style="margin-top:14px">${calcOut(d)}</div>`;
  }
  return html`<div class="pagehead"><div><h1>Dietas e exercícios</h1><div class="muted small">${patient ? 'Dicas para o seu dia a dia. Dúvidas? Fale com a equipe.' : 'Material de orientação para enviar aos pacientes.'}</div></div></div>
  ${tipCard()}
  <div class="tabs">${GTABS.map(([k, l, ic]) => html`<a class="${t === k ? 'on' : ''}" href="#/guia?t=${k}">${l}</a>`)}</div>
  ${body}
  <p class="tiny muted" style="margin-top:18px">${GNOTE}</p>`;
}
route('/guia', (_, q) => guidePage(q), 'guia');
proute('/guia', (_, q) => guidePage(q), 'guia');
