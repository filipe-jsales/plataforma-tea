import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/apiClient';
import { logEvent } from '../lib/logEvent';
import type { AvailableChallengeForStudent } from '../lib/challengeAllocationTypes';
import { useAuthStore } from '../stores/useAuthStore';
import { Badge, Button, LinkButton, SelectableCard } from '../components/ui';
import './SubjectSelector.css';

interface TopicOption {
  topicId: string;
  subjectId: string;
  name: string;
  // 3.13/3.16 — qual página abre ao confirmar este módulo. Ausente (tópicos
  // antigos, testes existentes) cai no domínio original de tartaruga —
  // nunca inferido do slug/nome do tópico.
  domain?: string;
}

// 2.3 — seletor de matéria/módulo. Componente genérico pra N itens (AC1);
// com 1 item só, ainda exige confirmação explícita — não pula sozinho
// (AC2, previsibilidade/TEACCH).
//
// 4.3 — esta tela também é onde "a trilha" do aluno vive: além dos módulos
// curriculares (sequência fixa Use-Modify-Create), lista os desafios que o
// PRÓPRIO professor alocou explicitamente à turma do aluno
// (`GET /students/me/classroom-challenges`). Um desafio nunca aparece aqui
// sem alocação explícita (AC3 de 4.3) — a lista vem vazia, nunca um erro,
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
    // 3.13/3.16 — trilha "Estados da Matéria" abre numa página dedicada
    // (WaterStateChallengePage), nunca ChallengePage (que é específica do
    // mundo de tartaruga/Pixi). Um domínio novo sempre exige página nova de
    // verdade, então esta ramificação por `domain` é o mínimo necessário
    // aqui — não uma tabela de rotas genérica pra 2 itens.
    navigate(
      selected.domain === 'water_state'
        ? `/water/${selected.topicId}`
        : `/subjects/${selected.topicId}`,
    );
  }

  return (
    <main className="subject-selector">
      <h1>Onde você quer entrar?</h1>

      {topics && (
        <ul className="subject-selector__list">
          {topics.map((topic) => (
            <li key={topic.topicId}>
              <SelectableCard
                icon="📐"
                selected={selected?.topicId === topic.topicId}
                onSelect={() => setSelected(topic)}
              >
                {topic.name}
              </SelectableCard>
            </li>
          ))}
        </ul>
      )}

      <Button onClick={handleConfirm} disabled={!selected}>
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
                {/* E1 — marcador discreto, nunca contagem/urgência (AC1/AC4):
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
