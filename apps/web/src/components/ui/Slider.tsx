import * as SliderPrimitive from '@radix-ui/react-slider';
import './Slider.css';

export interface SliderProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  onValueChange: (value: number) => void;
  // Dispara só quando o aluno TERMINA de mexer no slider (solta o mouse/
  // tecla), nunca a cada pixel do arrasto - quem loga evento de mudança
  // (ex.: RD-I temperature_slider_changed) usa isso, não `onValueChange`.
  onValueCommit?: (value: number) => void;
  ariaLabel: string;
  // Unidade exibida junto ao valor (ex.: "°C") - decorativo, o valor por si
  // já é a informação redundante com a posição do thumb (nunca só a
  // posição, ver .ui-slider__value abaixo).
  unit?: string;
}

// Wrapper de @radix-ui/react-slider - mesmo padrão de SegmentedControl.tsx/
// ToggleSwitch.tsx (primitivo headless da Radix, estilo próprio em
// Slider.css). O valor atual é sempre um texto visível ao lado do trilho
// (`.ui-slider__value`), nunca só a posição do thumb - mesma regra de
// redundância que já vale pro resto de components/ui/.
export function Slider({ min, max, step = 1, value, onValueChange, onValueCommit, ariaLabel, unit }: SliderProps) {
  return (
    <div className="ui-slider">
      <SliderPrimitive.Root
        className="ui-slider__root"
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([next]: number[]) => onValueChange(next)}
        onValueCommit={onValueCommit ? ([next]: number[]) => onValueCommit(next) : undefined}
      >
        <SliderPrimitive.Track className="ui-slider__track">
          <SliderPrimitive.Range className="ui-slider__range" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="ui-slider__thumb" aria-label={ariaLabel} />
      </SliderPrimitive.Root>
      <span className="ui-slider__value">
        {value}
        {unit ?? ''}
      </span>
    </div>
  );
}
