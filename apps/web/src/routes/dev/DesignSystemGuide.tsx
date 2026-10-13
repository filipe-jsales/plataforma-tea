import { useEffect, useState } from 'react';
import { Check, Info, Settings } from 'lucide-react';
import {
  Badge,
  Button,
  InlineFeedback,
  LinkButton,
  SegmentedControl,
  SelectableCard,
  Tabs,
  TextField,
  ToggleSwitch,
  Tooltip,
} from '../../components/ui';
import { useSensoryProfileStore } from '../../stores/useSensoryProfileStore';
import './DesignSystemGuide.css';

// DS2 - guia vivo do design system. Ferramenta de desenvolvimento, NÃO uma
// tela do produto: só é registrada em App.tsx quando `import.meta.env.DEV`
// (nunca existe no bundle de produção). Abrir com `npm run dev:web` e ir em
// /dev/design-system.

const TOKENS: { name: string; usage: string }[] = [
  { name: '--color-bg', usage: 'Fundo da página' },
  { name: '--color-surface', usage: 'Fundo de cards, botões secondary' },
  { name: '--color-text', usage: 'Texto padrão' },
  { name: '--color-text-on-dark', usage: 'Texto sobre fundo saturado (Badge, faixas de feedback)' },
  { name: '--color-primary', usage: 'Ação principal, foco, links' },
  { name: '--color-success', usage: 'Feedback de acerto, Badge success' },
  { name: '--color-danger', usage: 'Ação destrutiva (nunca feedback de erro do aluno)' },
  { name: '--color-warning', usage: 'Badge warning' },
  { name: '--color-border', usage: 'Bordas de cards, campos e botões secondary' },
  { name: '--hit-area-min', usage: 'Área mínima de toque/clique' },
];

function TokenTable() {
  const [values, setValues] = useState<Record<string, string>>({});
  const highContrast = useSensoryProfileStore((s) => s.highContrast);

  useEffect(() => {
    const styles = getComputedStyle(document.documentElement);
    setValues(Object.fromEntries(TOKENS.map((t) => [t.name, styles.getPropertyValue(t.name).trim()])));
  }, [highContrast]);

  return (
    <table className="ds-guide__tokens">
      <thead>
        <tr>
          <th>Token</th>
          <th>Valor atual</th>
          <th>Onde é usado</th>
        </tr>
      </thead>
      <tbody>
        {TOKENS.map((token) => (
          <tr key={token.name}>
            <td>
              <code>{token.name}</code>
            </td>
            <td>
              {values[token.name]?.startsWith('#') && (
                <span className="ds-guide__swatch" style={{ background: values[token.name] }} aria-hidden="true" />
              )}
              {values[token.name]}
            </td>
            <td>{token.usage}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function DesignSystemGuide() {
  const motionEnabled = useSensoryProfileStore((s) => s.motionEnabled);
  const highContrast = useSensoryProfileStore((s) => s.highContrast);
  const soundEnabled = useSensoryProfileStore((s) => s.soundEnabled);
  const [toggle, setToggle] = useState(false);
  const [segment, setSegment] = useState('a');
  const [tab, setTab] = useState('one');
  const [selected, setSelected] = useState(false);

  function setProfile(patch: Partial<{ motionEnabled: boolean; highContrast: boolean; soundEnabled: boolean }>) {
    useSensoryProfileStore.setState(patch);
    const root = document.documentElement;
    const next = { motionEnabled, highContrast, soundEnabled, ...patch };
    root.dataset.motion = next.motionEnabled ? 'full' : 'reduced';
    root.dataset.contrast = next.highContrast ? 'high' : 'standard';
    root.dataset.sound = next.soundEnabled ? 'on' : 'off';
  }

  return (
    <main className="ds-guide">
      <h1>Guia do design system</h1>
      <p>Ferramenta de desenvolvimento (só em modo dev). Ícones: sempre Lucide, nunca emoji.</p>

      <section>
        <h2>Perfil sensorial ao vivo</h2>
        <div className="ds-guide__row">
          <ToggleSwitch
            id="ds-motion"
            label="Movimento"
            checked={motionEnabled}
            onCheckedChange={(v) => setProfile({ motionEnabled: v })}
          />
          <ToggleSwitch
            id="ds-contrast"
            label="Alto contraste"
            checked={highContrast}
            onCheckedChange={(v) => setProfile({ highContrast: v })}
          />
          <ToggleSwitch
            id="ds-sound"
            label="Som"
            checked={soundEnabled}
            onCheckedChange={(v) => setProfile({ soundEnabled: v })}
          />
        </div>
      </section>

      <section>
        <h2>Tokens</h2>
        <TokenTable />
      </section>

      <section>
        <h2>Button / LinkButton</h2>
        <div className="ds-guide__row">
          {(['primary', 'secondary', 'ghost', 'success', 'danger'] as const).map((variant) => (
            <Button key={variant} variant={variant} icon={<Settings />}>
              {variant}
            </Button>
          ))}
          <Button disabled icon={<Settings />}>
            desabilitado
          </Button>
          <LinkButton to="/dev/design-system" variant="secondary" icon={<Settings />}>
            LinkButton
          </LinkButton>
        </div>
      </section>

      <section>
        <h2>ToggleSwitch / Badge / InlineFeedback</h2>
        <div className="ds-guide__row">
          <ToggleSwitch id="ds-toggle" label="Exemplo" checked={toggle} onCheckedChange={setToggle} />
          <ToggleSwitch id="ds-toggle-off" label="Desabilitado" checked={false} onCheckedChange={() => {}} disabled />
          {(['success', 'warning', 'neutral', 'info'] as const).map((variant) => (
            <Badge key={variant} variant={variant}>
              {variant}
            </Badge>
          ))}
        </div>
        <InlineFeedback kind="success">Acertou</InlineFeedback>
        <InlineFeedback kind="retry">Quase lá - quer tentar de novo?</InlineFeedback>
        <InlineFeedback kind="info" icon={<Info />}>
          Informação neutra
        </InlineFeedback>
      </section>

      <section>
        <h2>SelectableCard / SegmentedControl / TextField</h2>
        <div className="ds-guide__row">
          <SelectableCard icon={<Check />} selected={selected} onSelect={() => setSelected((v) => !v)}>
            Card (align center)
          </SelectableCard>
          <SelectableCard icon={<Check />} align="start" meta="Metadado secundário" selected={false} onSelect={() => {}}>
            Card (align start)
          </SelectableCard>
        </div>
        <SegmentedControl
          ariaLabel="Exemplo"
          value={segment}
          onValueChange={setSegment}
          options={[
            { value: 'a', label: 'Opção A' },
            { value: 'b', label: 'Opção B' },
          ]}
        />
        <TextField id="ds-text" label="Campo de texto" />
        <TextField id="ds-text-error" label="Campo com erro" error="Mensagem descritiva do erro" />
      </section>

      <section>
        <h2>Tabs / Tooltip</h2>
        <Tabs
          ariaLabel="Exemplo de abas"
          value={tab}
          onValueChange={setTab}
          items={[
            { value: 'one', label: 'Primeira', content: <p>Conteúdo da primeira aba.</p> },
            { value: 'two', label: 'Segunda', content: <p>Conteúdo da segunda aba.</p> },
          ]}
        />
        <Tooltip content="Reforço textual opcional">
          <Button variant="secondary">Passe o mouse ou foque</Button>
        </Tooltip>
      </section>
    </main>
  );
}
