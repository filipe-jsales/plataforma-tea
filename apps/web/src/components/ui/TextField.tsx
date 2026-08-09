import { forwardRef, type InputHTMLAttributes } from 'react';
import './TextField.css';

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  id: string;
  label: string;
  error?: string;
}

// 1.2/1.4 — primeiro campo de texto livre do design system (nome/e-mail):
// mesma base de Select.tsx (rótulo sempre visível, nunca só placeholder —
// rotulagem redundante) mas sobre um `<input>` nativo, que já tem o
// comportamento de teclado/foco correto por padrão (mesmo raciocínio de
// Button.tsx sobre não precisar de useTextField do React Aria aqui). Erro
// de validação em linguagem descritiva ao lado do campo, nunca só borda
// vermelha (regra não-negociável 4 aplicada a formulário).
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { id, label, error, ...rest },
  ref,
) {
  return (
    <div className="ui-text-field" data-invalid={error ? 'true' : undefined}>
      <label className="ui-text-field__label" htmlFor={id}>
        {label}
      </label>
      <input ref={ref} id={id} className="ui-text-field__input" {...rest} />
      {error && (
        <span className="ui-text-field__error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
});
