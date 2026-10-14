// Links dos formulários do estudo (docs/research/google-forms/create-forms.gs),
// já pré-preenchidos com a versão "Plugada". Se os formulários forem recriados,
// atualize aqui. A ordem importa: perguntas abertas antes das escalas, para as
// respostas abertas não serem induzidas pelos itens fechados.
export type RiverSurveyForm = 'qual' | 'quant';

export const RIVER_SURVEY_LINKS: Record<RiverSurveyForm, { title: string; href: string }> = {
  qual: {
    title: '1. Perguntas abertas',
    href: 'https://docs.google.com/forms/d/e/1FAIpQLSez4cTuenG5KzIH-lTxARiJhgiAAgWcb-g3sgW_i4sD6mpmvQ/viewform?usp=pp_url&entry.1626300273=Plugada+(jogo+no+computador)',
  },
  quant: {
    title: '2. Escalas e perguntas de conhecimento',
    href: 'https://docs.google.com/forms/d/e/1FAIpQLSfC56jOaKzVijkBVqLroeK5LsRYz18SHPo0YHjNqVqEf3cJBg/viewform?usp=pp_url&entry.1305475271=Plugada+(jogo+no+computador)',
  },
};

export const RIVER_SURVEY_ORDER: RiverSurveyForm[] = ['qual', 'quant'];
