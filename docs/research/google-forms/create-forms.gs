/**
 * Cria os dois formulários do estudo "Travessia do Rio: plugada x desplugada".
 *
 *   F-QUANT: escala Likert (C1 carga cognitiva, C3 aprendizagem percebida)
 *            + teste de conhecimento de 5 questões.
 *   F-QUAL : 7 perguntas abertas sobre os mesmos dois construtos.
 *
 * Como usar:
 *   1. Abra https://script.google.com e crie um projeto novo.
 *   2. Cole este arquivo, preencha as constantes de TCLE logo abaixo.
 *   3. Execute `createStudyForms` e autorize o acesso ao Google Forms.
 *   4. Veja em Execuções > Registro: links de edição, de resposta e os links
 *      pré-preenchidos por versão (plugada / desplugada). Distribua esses
 *      últimos, para o participante não escolher a versão sozinho.
 *
 * Limites do Google Forms que afetam o desenho:
 *   - Itens de grade não são embaralhados por respondente. Por isso as linhas
 *     já estão intercaladas entre as subescalas (ordem fixa e misturada).
 *   - O Forms não impede resposta duplicada sem login. O código anônimo
 *     permite achar duplicatas na análise.
 *   - No quiz, a visibilidade da nota é configurada na interface (aba
 *     Configurações > Apresentação). Deixe "Liberar nota" desativado.
 */

// ---- Preencher antes de rodar -------------------------------------------
var PESQUISADOR = '[Nome do(a) pesquisador(a) responsável]';
var CONTATO = '[e-mail de contato]';
var INSTITUICAO = '[Instituição / programa]';
var CEP_PROTOCOLO = '[Número do parecer do CEP]';
// ---------------------------------------------------------------------------

var VERSOES = ['Plugada (jogo no computador)', 'Desplugada (material impresso)'];

var LIKERT_7 = [
  '1 - Discordo totalmente',
  '2 - Discordo',
  '3 - Discordo parcialmente',
  '4 - Nem concordo nem discordo',
  '5 - Concordo parcialmente',
  '6 - Concordo',
  '7 - Concordo totalmente',
];

function createStudyForms() {
  var quant = buildQuantForm_();
  var qual = buildQualForm_();
  Logger.log('F-QUANT edição: ' + quant.form.getEditUrl());
  Logger.log('F-QUANT resposta: ' + quant.form.getPublishedUrl());
  Logger.log('F-QUANT pré-preenchido (plugada): ' + prefilled_(quant, VERSOES[0]));
  Logger.log('F-QUANT pré-preenchido (desplugada): ' + prefilled_(quant, VERSOES[1]));
  Logger.log('F-QUAL edição: ' + qual.form.getEditUrl());
  Logger.log('F-QUAL resposta: ' + qual.form.getPublishedUrl());
  Logger.log('F-QUAL pré-preenchido (plugada): ' + prefilled_(qual, VERSOES[0]));
  Logger.log('F-QUAL pré-preenchido (desplugada): ' + prefilled_(qual, VERSOES[1]));
}

// Atalho para recriar só o F-QUAL (por exemplo, se a primeira execução parou
// no meio). Evita duplicar o F-QUANT.
function createQualFormOnly() {
  var qual = buildQualForm_();
  Logger.log('F-QUAL edição: ' + qual.form.getEditUrl());
  Logger.log('F-QUAL resposta: ' + qual.form.getPublishedUrl());
  Logger.log('F-QUAL pré-preenchido (plugada): ' + prefilled_(qual, VERSOES[0]));
  Logger.log('F-QUAL pré-preenchido (desplugada): ' + prefilled_(qual, VERSOES[1]));
}

function prefilled_(built, version) {
  return built.form
    .createResponse()
    .withItemResponse(built.versionItem.createResponse(version))
    .toPrefilledUrl();
}

// ---- Blocos comuns --------------------------------------------------------

function tcle_(form) {
  var consent = form
    .addMultipleChoiceItem()
    .setTitle('Termo de Consentimento Livre e Esclarecido')
    .setHelpText(
      'Convidamos você a participar de uma pesquisa de ' + INSTITUICAO + ' sobre uma atividade de ' +
        'introdução à ideia de algoritmo. Responsável: ' + PESQUISADOR + ' (' + CONTATO + '). ' +
        'A participação é voluntária e você pode desistir a qualquer momento, sem prejuízo. ' +
        'As respostas são anônimas, usadas só para fins acadêmicos e tratadas conforme a LGPD. ' +
        'Não há resposta certa ou errada nas perguntas de opinião. Protocolo do CEP: ' + CEP_PROTOCOLO + '. ' +
        'Duração estimada: 8 a 12 minutos.'
    )
    .setRequired(true);
  consent.setChoices([
    consent.createChoice('Li e concordo em participar', FormApp.PageNavigationType.CONTINUE),
    consent.createChoice('Não concordo em participar', FormApp.PageNavigationType.SUBMIT),
  ]);
}

function identification_(form) {
  form.addPageBreakItem().setTitle('Identificação');
  var code = form
    .addTextItem()
    .setTitle('Código anônimo')
    .setHelpText(
      'Use o mesmo código nos dois formulários. Monte assim: as 2 primeiras letras do nome da sua mãe ' +
        '+ o dia do seu nascimento com 2 dígitos + os 2 últimos dígitos do seu telefone. Exemplo: MA1547.'
    )
    .setRequired(true);
  code.setValidation(
    FormApp.createTextValidation()
      .setHelpText('Use 2 letras seguidas de 4 números, sem espaços. Exemplo: MA1547.')
      .requireTextMatchesPattern('^[A-Za-z]{2}[0-9]{4}$')
      .build()
  );
  var version = form
    .addMultipleChoiceItem()
    .setTitle('Versão da atividade que você realizou')
    .setChoiceValues(VERSOES)
    .setRequired(true);
  return version;
}

function likertGrid_(form, title, help, rows) {
  return form
    .addGridItem()
    .setTitle(title)
    .setHelpText(help)
    .setRows(rows)
    .setColumns(LIKERT_7)
    .setRequired(true);
}

// ---- F-QUANT --------------------------------------------------------------

function buildQuantForm_() {
  var form = FormApp.create('Travessia do Rio - Questionário quantitativo (F-QUANT)');
  form.setIsQuiz(true);
  form.setCollectEmail(false);
  form.setShowLinkToRespondAgain(false);
  form.setProgressBar(true);
  form.setDescription(
    'Questionário sobre a atividade que você acabou de realizar. Responda pensando na atividade como ' +
      'um todo. Não há resposta certa ou errada nas perguntas de opinião.'
  );
  form.setConfirmationMessage('Obrigado! Se ainda não respondeu o formulário de perguntas abertas, responda-o também.');

  tcle_(form);
  var versionItem = identification_(form);

  form.addPageBreakItem().setTitle('Bloco 1 - Esforço e dificuldade').setHelpText(
    'Indique o quanto você concorda com cada afirmação sobre a atividade que realizou.'
  );
  // Linhas intercaladas: intrínseca (1,2,3), extrínseca (4,5,6).
  likertGrid_(form, 'Esforço e dificuldade na atividade', 'Marque uma opção por linha.', [
    'C1.1 O conteúdo da atividade foi complexo para mim.',
    'C1.4 As instruções da atividade foram difíceis de entender.',
    'C1.2 Precisei considerar muitas regras ao mesmo tempo.',
    'C1.5 Tive dificuldade para saber o que fazer em cada etapa.',
    'C1.3 Foi difícil acompanhar quais personagens estavam em cada margem.',
    'C1.6 A forma como o material foi apresentado atrapalhou minha concentração.',
  ]);
  form
    .addScaleItem()
    .setTitle('C1.7 Quanto esforço mental você dedicou à atividade?')
    .setBounds(1, 9)
    .setLabels('Muito baixo', 'Muito alto')
    .setRequired(true);

  form.addPageBreakItem().setTitle('Bloco 2 - O que você aprendeu').setHelpText(
    'Indique o quanto você concorda com cada afirmação sobre o que você consegue fazer agora.'
  );
  likertGrid_(form, 'Aprendizagem sobre algoritmos', 'Marque uma opção por linha.', [
    'C3.1 Consigo descrever em linguagem simples um passo a passo para resolver um problema com regras.',
    'C3.6 Depois da atividade, continuo sem saber explicar o que é um algoritmo.',
    'C3.2 Consigo identificar, em um passo a passo, o que se repete.',
    'C3.3 Consigo identificar onde há uma decisão do tipo "se... então".',
    'C3.4 Sei corrigir o rumo quando uma ação quebra uma regra.',
    'C3.5 A atividade me ajudou a entender o que é um algoritmo.',
  ]);
  // Item de atenção: sem pontos (itens sem resposta correta não pontuam no quiz).
  form
    .addMultipleChoiceItem()
    .setTitle('Para esta pergunta, marque "5 - Concordo parcialmente".')
    .setChoiceValues(LIKERT_7)
    .setRequired(true);

  form.addPageBreakItem().setTitle('Bloco 3 - Perguntas de conhecimento').setHelpText(
    'Responda sem consultar nenhum material. Se não souber, marque "Não sei": isso é melhor do que chutar.'
  );
  knowledgeItems_(form);

  form.addPageBreakItem().setTitle('Bloco 4 - Perfil');
  form
    .addMultipleChoiceItem()
    .setTitle('Qual sua experiência prévia com programação?')
    .setChoiceValues(['Nenhuma', 'Básica', 'Intermediária', 'Avançada'])
    .setRequired(true);
  form
    .addMultipleChoiceItem()
    .setTitle('Você já conhecia o enigma da travessia do rio (lobo, ovelha e alface) antes da atividade?')
    .setChoiceValues(['Sim', 'Não'])
    .setRequired(true);

  return { form: form, versionItem: versionItem };
}

function knowledgeItems_(form) {
  var NAO_SABE = 'Não sei';
  function add(title, help, choices) {
    var item = form.addMultipleChoiceItem().setTitle(title).setRequired(true);
    if (help) item.setHelpText(help);
    var built = choices.map(function (c) {
      return item.createChoice(c.text, !!c.correct);
    });
    built.push(item.createChoice(NAO_SABE, false));
    item.setChoices(built);
    // Pontos só depois de existir uma alternativa correta.
    item.setPoints(1);
  }

  add(
    '1. Perguntar "alguma regra se aplica à margem sem o barco?" e agir conforme a resposta (sim ou não) é um exemplo de:',
    null,
    [
      { text: 'Repetição' },
      { text: 'Condição (se... então)', correct: true },
      { text: 'Variável' },
      { text: 'Ordenação' },
    ]
  );
  add(
    '2. "Escolher a carga, atravessar e conferir, até todos chegarem à outra margem" é um exemplo de:',
    null,
    [
      { text: 'Repetição', correct: true },
      { text: 'Condição (se... então)' },
      { text: 'Variável' },
      { text: 'Ordenação' },
    ]
  );
  add(
    '3. Desfazer uma travessia inválida e tentar outra carga corresponde a:',
    null,
    [
      { text: 'Compilação' },
      { text: 'Repetição' },
      { text: 'Depuração (achar e corrigir um erro)', correct: true },
      { text: 'Ordenação' },
    ]
  );
  add(
    '4. Um algoritmo bem descrito é aquele que:',
    null,
    [
      { text: 'Só quem conhece o problema consegue seguir' },
      { text: 'Outra pessoa consegue executar sem precisar adivinhar passos', correct: true },
      { text: 'Tem sempre o menor número de passos possível' },
      { text: 'Não pode conter decisões' },
    ]
  );
  add(
    '5. Na margem esquerda estão o Lobo, a Ovelha e a Alface, e o barco está na margem direita. Quais regras se aplicam à margem esquerda?',
    'Regras: R1 O Lobo devora a Ovelha, exceto se o Cachorro estiver na margem. R2 A Ovelha devora a Alface. ' +
      'R3 A Galinha bica a Alface. R4 O Cachorro ataca a Galinha.',
    [
      { text: 'Nenhuma' },
      { text: 'Só R1' },
      { text: 'R1 e R2', correct: true },
      { text: 'R2 e R3' },
    ]
  );
}

// ---- F-QUAL ---------------------------------------------------------------

function buildQualForm_() {
  var form = FormApp.create('Travessia do Rio - Questionário qualitativo (F-QUAL)');
  form.setCollectEmail(false);
  form.setShowLinkToRespondAgain(false);
  form.setProgressBar(true);
  form.setDescription(
    'Perguntas abertas sobre a atividade que você acabou de realizar. Responda com suas palavras, ' +
      'com o detalhe que achar útil. Responda este formulário ANTES do formulário de escalas.'
  );
  form.setConfirmationMessage('Obrigado! Agora responda também o formulário de escalas (F-QUANT).');

  tcle_(form);
  var versionItem = identification_(form);

  var minLength = FormApp.createParagraphTextValidation()
    .setHelpText('Escreva pelo menos uma frase (10 caracteres).')
    .requireTextLengthGreaterThanOrEqualTo(10)
    .build();

  function open(title, help) {
    var item = form.addParagraphTextItem().setTitle(title).setRequired(true);
    if (help) item.setHelpText(help);
    item.setValidation(minLength);
  }

  form.addPageBreakItem().setTitle('Parte 1 - Esforço e dificuldade');
  open(
    'Q1. Descreva os momentos em que a atividade pareceu mais difícil ou confusa. O que tornou esses momentos assim?',
    'Se não houve nenhum, explique o que facilitou.'
  );
  open('Q2. O que, na atividade ou nas instruções, ajudou você a saber o que fazer em cada etapa?');
  open('Q3. Que partes da atividade exigiram mais esforço para você acompanhar as regras ao mesmo tempo?');

  form.addPageBreakItem().setTitle('Parte 2 - O que você aprendeu');
  open('Q4. Explique, com suas palavras, como você resolveria o problema da travessia para alguém que nunca o viu.');
  open(
    'Q5. O que você entendeu sobre repetição e sobre decisão ("se... então") com essa atividade? Dê um exemplo vivido nela.'
  );
  open(
    'Q6. Conte uma situação em que você percebeu um erro no seu passo a passo. Como identificou e corrigiu?',
    'Se não houve erro, descreva como você verificou que estava certo.'
  );

  form.addPageBreakItem().setTitle('Parte 3 - O formato');
  open(
    'Q7. Pensando no formato em que você realizou a atividade (material impresso ou computador), que aspectos dele ajudaram ou atrapalharam seu esforço e seu aprendizado?'
  );

  return { form: form, versionItem: versionItem };
}
