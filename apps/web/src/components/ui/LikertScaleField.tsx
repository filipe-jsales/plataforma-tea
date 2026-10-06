import { SegmentedControl } from './SegmentedControl';
import './LikertScaleField.css';

// Escala de concordância de 5 pontos - mesma âncora textual nos dois
// extremos e no meio, nunca só "1"/"5" nus (rotulagem redundante, regra
// não-negociável 9): quem responde não precisa lembrar "o que era o 4
// mesmo?" nem decorar uma legenda separada. Ordem sempre discordo→concordo,
// nunca invertida item a item (inverter geraria erro de leitura, não
// controle de viés de verdade).
export const LIKERT_SCALE_OPTIONS = [
  { value: '1', label: 'Discordo totalmente' },
  { value: '2', label: 'Discordo' },
  { value: '3', label: 'Neutro' },
  { value: '4', label: 'Concordo' },
  { value: '5', label: 'Concordo totalmente' },
];

export interface LikertScaleFieldProps {
  id: string;
  statement: string;
  // '' = ainda sem resposta - nunca um valor default 1–5 forçado (resposta
  // parcial é válida em survey research; um item pré-marcado seria uma
  // resposta que a pessoa nunca deu de verdade).
  value: string;
  onChange: (value: string) => void;
}

// Um item de escala Likert - reutilizável por qualquer survey (não só o de
// criação de desafio). Reaproveita `SegmentedControl` (Radix
// `role="radiogroup"`/`role="radio"`, teclado de graça) em vez de um radio
// group HTML cru.
export function LikertScaleField({ id, statement, value, onChange }: LikertScaleFieldProps) {
  return (
    <fieldset id={id} className="ui-likert-field">
      <legend className="ui-likert-field__statement">{statement}</legend>
      <SegmentedControl ariaLabel={statement} options={LIKERT_SCALE_OPTIONS} value={value} onValueChange={onChange} />
    </fieldset>
  );
}
