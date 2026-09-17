import type { GuidedTourStep } from '../components/ui';

// Chave de persistência (useGuidedTourStore) — nunca reaproveitar pra outro
// tutorial; cada tour tem a própria chave.
export const CHALLENGE_FORM_TOUR_KEY = 'teacher-challenge-form';

// Passos do tutorial guiado do formulário de criar/editar desafio (Modo
// Template). Aponta pra LANDMARKS estruturais do formulário
// (`template-challenge-form-*`, ver TemplateChallengeForm.tsx), nunca pro
// id de um parâmetro específico (`sides`/`turnAngleDeg`...) — o schema de
// parâmetros muda por template (RegularPolygon hoje, outro template
// amanhã), então o tour precisa continuar fazendo sentido pra QUALQUER
// template sem precisar de um roteiro de passos por template. Se um dia o
// formulário ganhar uma seção estrutural nova, adicionar um passo aqui +
// um id novo no elemento correspondente é o suficiente — nunca precisa
// tocar em GuidedTour.tsx (ele só sabe seguir uma lista de passos).
export const CHALLENGE_FORM_TOUR_STEPS: GuidedTourStep[] = [
  {
    targetId: 'template-challenge-form-title',
    title: '1. Dê um nome pro desafio',
    description: 'Escolha algo que ajude você a reconhecer este desafio depois, na lista "Meus desafios".',
  },
  {
    targetId: 'template-challenge-form-params',
    title: '2. Ajuste os parâmetros',
    description:
      'Cada campo tem uma prévia ao lado — você não precisa adivinhar o efeito, é só olhar a miniatura mudar.',
  },
  {
    targetId: 'template-challenge-form-primm',
    title: '3. Perguntas de reflexão',
    description:
      'Escreva o que perguntar ao aluno antes de executar (Predição) e depois (Investigação). Já vêm com uma sugestão pronta — edite se quiser, mas não podem ficar em branco.',
  },
  {
    targetId: 'template-challenge-form-feedback',
    title: '4. Mensagens de feedback (opcional)',
    description:
      'Personalize o que o aluno vê ao tentar de novo ou ao concluir, ou deixe em branco pra usar as mensagens padrão da plataforma.',
  },
  {
    targetId: 'template-challenge-form-visualize',
    title: '5. Veja como fica pro aluno',
    description: 'Antes de salvar, clique aqui pra conferir a mesma animação que o aluno vai ver no desafio.',
  },
  {
    targetId: 'template-challenge-form-submit',
    title: '6. Salvar',
    description: 'Quando estiver tudo certo, é só salvar — o desafio já aparece na lista "Meus desafios".',
  },
];
