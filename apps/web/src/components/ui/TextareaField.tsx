import { forwardRef, type TextareaHTMLAttributes } from 'react';
import './TextareaField.css';

export interface TextareaFieldProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
  id: string;
  label: string;
  error?: string;
}

// 7.5 - mesma base de TextField.tsx (rótulo sempre visível, erro em
// linguagem descritiva ao lado do campo, nunca só borda vermelha), mas
// sobre um `<textarea>` - pra texto que "deve acomodar linguagem
// acessível/mais longa" (ex.: perguntas PRIMM de predição/investigação),
// onde um `<input>` de uma linha só espremeria a pergunta. `rows` tem
// default aqui (nunca 1, que voltaria a parecer um `<input>`), mas
// continua sobrescrevível por quem usa o componente.
export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(function TextareaField(
  { id, label, error, rows = 3, ...rest },
  ref,
) {
  return (
    <div className="ui-textarea-field" data-invalid={error ? 'true' : undefined}>
      <label className="ui-textarea-field__label" htmlFor={id}>
        {label}
      </label>
      <textarea ref={ref} id={id} className="ui-textarea-field__input" rows={rows} {...rest} />
      {error && (
        <span className="ui-textarea-field__error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
});
