import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/apiClient';
import { logEvent } from '../lib/logEvent';
import { useAuthStore } from '../stores/useAuthStore';
import './SubjectSelector.css';

interface TopicOption {
  topicId: string;
  subjectId: string;
  name: string;
}

// 2.3 — seletor de matéria/módulo. Componente genérico pra N itens (AC1);
// com 1 item só, ainda exige confirmação explícita — não pula sozinho
// (AC2, previsibilidade/TEACCH).
export function SubjectSelector() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [topics, setTopics] = useState<TopicOption[] | null>(null);
  const [selected, setSelected] = useState<TopicOption | null>(null);

  useEffect(() => {
    apiClient.get<TopicOption[]>('/subjects/topics').then(setTopics);
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
    navigate(`/subjects/${selected.topicId}`);
  }

  return (
    <main className="subject-selector">
      <h1>Onde você quer entrar?</h1>

      {topics && (
        <ul className="subject-selector__list">
          {topics.map((topic) => (
            <li key={topic.topicId}>
              <button
                type="button"
                className={
                  'subject-selector__item' +
                  (selected?.topicId === topic.topicId ? ' subject-selector__item--selected' : '')
                }
                onClick={() => setSelected(topic)}
              >
                <span className="subject-selector__icon" aria-hidden="true">
                  📐
                </span>
                <span>{topic.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        className="subject-selector__confirm"
        onClick={handleConfirm}
        disabled={!selected}
      >
        Confirmar
      </button>
    </main>
  );
}
