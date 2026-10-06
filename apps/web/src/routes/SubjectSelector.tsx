import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/apiClient';
import { logEvent } from '../lib/logEvent';
import type { AvailableChallengeForStudent } from '../lib/challengeAllocationTypes';
import type { ContentCategory } from '../lib/contentCategory';
import { CONTENT_CATEGORY_STUDENT_LABEL } from '../lib/contentCategory';
import { MINI_GAMES_CATALOG } from '../lib/miniGamesCatalog';
import { useAuthStore } from '../stores/useAuthStore';
import { Badge, Button, LinkButton, SelectableCard } from '../components/ui';
import './SubjectSelector.css';
import { BookOpenCheck, Gamepad2, Laptop } from 'lucide-react';

interface TopicOption {
  topicId: string;
  subjectId: string;
  name: string;
  // 3.13/3.16 - qual página abre ao confirmar este módulo. Ausente (tópicos
  // antigos, testes existentes) cai no domínio original de tartaruga -
  // nunca inferido do slug/nome do tópico.
  domain?: string;
  // CC1 - categoria curricular (Informática Educacional × Educação em
  // Computação). Ausente (testes existentes, resposta de API antiga) cai
  // em Informática Educacional - mesmo default do backend
  // (`Topic.category`), nunca um 3º grupo "sem categoria" na tela.
  category?: ContentCategory;
}

// CC1 - as duas categorias existem hoje como 2 blocos visuais já
// separados (tópicos × "Mini jogos", ver histórico deste componente) -
// esta é a MESMA quantidade de áreas, só agrupadas pelo que o produto
// realmente distingue (o assunto ensinado), não por qual motor renderiza
// (blocos vs. mini jogo). Regra não-negociável 2 ("no máximo 1 paleta nova
// por tela") continua satisfeita: nenhuma 3ª área nova.
const CATEGORY_ORDER: ContentCategory[] = ['informatica_educacional', 'educacao_computacao'];
const CATEGORY_ICON: Record<ContentCategory, React.ReactNode> = {
  informatica_educacional: <BookOpenCheck color="#000000" strokeWidth={1.75} />,
  educacao_computacao: <Laptop color="#000000" strokeWidth={1.75} />
};
const DEFAULT_CATEGORY: ContentCategory = 'informatica_educacional';

// 2.3 - seletor de matéria/módulo. Componente genérico pra N itens (AC1);
// com 1 item só, ainda exige confirmação explícita - não pula sozinho
// (AC2, previsibilidade/TEACCH).
//
// 4.3 - esta tela também é onde "a trilha" do aluno vive: além dos módulos
// curriculares (sequência fixa Use-Modify-Create), lista os desafios que o
// PRÓPRIO professor alocou explicitamente à turma do aluno
// (`GET /students/me/classroom-challenges`). Um desafio nunca aparece aqui
// sem alocação explícita (AC3 de 4.3) - a lista vem vazia, nunca um erro,
// quando não há nada alocado.
export function SubjectSelector() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [topics, setTopics] = useState<TopicOption[] | null>(null);
  const [selected, setSelected] = useState<TopicOption | null>(null);
  const [classroomChallenges, setClassroomChallenges] = useState<AvailableChallengeForStudent[] | null>(null);

  useEffect(() => {
    apiClient.get<TopicOption[]>('/subjects/topics').then(setTopics);
    apiClient.get<AvailableChallengeForStudent[]>('/students/me/classroom-challenges').then(setClassroomChallenges);
  }, []);

  if (!user) return null;

  function handleConfirm() {
    if (!selected || !user) return;
    logEvent({
      studentPseudoId: user.pseudonymId,
      category: 'RD-C',
      type: 'subject_module_selected',
      payload: { subjectId: selected.subjectId, topicId: selected.topicId },
    });
    // 3.13/3.16 - trilha "Estados da Matéria" abre numa página dedicada
    // (WaterStateChallengePage), nunca ChallengePage (que é específica do
    // mundo de tartaruga/Pixi). Um domínio novo sempre exige página nova de
    // verdade, então esta ramificação por `domain` é o mínimo necessário
    // aqui - não uma tabela de rotas genérica pra 2 itens.
    navigate(
      selected.domain === 'water_state'
        ? `/water/${selected.topicId}`
        : `/subjects/${selected.topicId}`,
    );
  }

  return (
    <main className="subject-selector">
      <h1>Onde você quer entrar?</h1>

      {/* CC1 - duas seções fixas (nunca uma 3ª), agrupadas pelo assunto
          ensinado (Informática Educacional × Educação em Computação) -
          um tópico curricular e um mini jogo da MESMA categoria aparecem
          juntos, mesmo vindo de fontes diferentes (API × catálogo local
          de mini jogos, ver lib/miniGamesCatalog.ts). */}
      {CATEGORY_ORDER.map((category) => {
        const categoryTopics = (topics ?? []).filter(
          (topic) => (topic.category ?? DEFAULT_CATEGORY) === category,
        );
        const categoryMiniGames = MINI_GAMES_CATALOG.filter((game) => game.category === category);
        const hasItems = categoryTopics.length > 0 || categoryMiniGames.length > 0;

        return (
          <section key={category} className="subject-selector__category">
            <h2>
              <span aria-hidden="true">{CATEGORY_ICON[category]}</span>{' '}
              {CONTENT_CATEGORY_STUDENT_LABEL[category]}
            </h2>

            {topics !== null && !hasItems && (
              <p className="subject-selector__category-empty">Em breve, novidades por aqui.</p>
            )}

            {hasItems && (
              <ul className="subject-selector__list">
                {categoryTopics.map((topic) => (
                  <li key={topic.topicId}>
                    <SelectableCard
                      icon={<BookOpenCheck color="#000000" strokeWidth={1.75} />}
                      selected={selected?.topicId === topic.topicId}
                      onSelect={() => setSelected(topic)}
                    >
                      {topic.name}
                    </SelectableCard>
                  </li>
                ))}
                {categoryMiniGames.map((game) => (
                  <li key={game.key}>
                    <LinkButton to={game.entryPath} variant="secondary" icon={<Gamepad2 color="#000000" strokeWidth={1.75} />}>
                      {game.title}
                    </LinkButton>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      <Button variant="success" onClick={handleConfirm} disabled={!selected}>
        Confirmar
      </Button>

      {classroomChallenges && classroomChallenges.length > 0 && (
        <section className="subject-selector__classroom-challenges">
          <h2>Desafios da sua turma</h2>
          <ul className="subject-selector__list">
            {classroomChallenges.map((challenge) => (
              <li key={challenge.id} className="subject-selector__classroom-challenge">
                <LinkButton to={`/challenge/${challenge.id}`} variant="secondary" icon="🧩">
                  {challenge.title}
                </LinkButton>
                {/* E1 - marcador discreto, nunca contagem/urgência (AC1/AC4):
                    "Novo" some sozinho quando o aluno abre o desafio (AC2,
                    ver ChallengePage), sem contador agregado (AC3). */}
                {challenge.isNew && <Badge variant="info">Novo</Badge>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
