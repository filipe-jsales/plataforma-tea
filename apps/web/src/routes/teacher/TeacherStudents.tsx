import { useEffect, useState } from "react";
import { ApiError, apiClient } from "../../lib/apiClient";
import { getIllustrationAsset } from "../../lib/illustrationAssets";
import type { ClassroomRosterStudent } from "../../lib/enrollmentTypes";
import type { ResetCredentialResult } from "../../lib/studentAccountTypes";
import {
  Button,
  Dialog,
  InlineFeedback,
  LinkButton,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "../../components/ui";
import "./TeacherStudents.css";
import { ArrowRightLeft, KeyRound } from "lucide-react";

interface TeacherClassroomOption {
  id: string;
  name: string;
  joinCode: string;
}

// 1.5 — Vínculo aluno ↔ turma ↔ professor. Lista os alunos da turma
// selecionada e permite transferir um aluno pra outra turma sem perder o
// histórico (o backend encerra a matrícula anterior e cria uma nova — ver
// EnrollmentsService.transfer).
export function TeacherStudents() {
  const [classrooms, setClassrooms] = useState<TeacherClassroomOption[] | null>(
    null,
  );
  const [classroomId, setClassroomId] = useState("");
  const [roster, setRoster] = useState<ClassroomRosterStudent[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [transferringStudent, setTransferringStudent] =
    useState<ClassroomRosterStudent | null>(null);
  const [destinationClassroomId, setDestinationClassroomId] = useState("");
  const [transferSaving, setTransferSaving] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  // 1.3 — recuperação de acesso: professor titular da turma gera uma
  // sequência de login NOVA pro aluno que esqueceu a credencial.
  const [resettingStudent, setResettingStudent] =
    useState<ClassroomRosterStudent | null>(null);
  const [resetSaving, setResetSaving] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetResult, setResetResult] = useState<ResetCredentialResult | null>(
    null,
  );

  useEffect(() => {
    apiClient.get<TeacherClassroomOption[]>("/home/teacher").then((list) => {
      setClassrooms(list);
      if (list.length > 0) setClassroomId((current) => current || list[0].id);
    });
  }, []);

  function reloadRoster() {
    if (!classroomId) return;
    setRoster(null);
    setLoadError(null);
    apiClient
      .get<ClassroomRosterStudent[]>(
        `/teacher/classrooms/${classroomId}/students`,
      )
      .then(setRoster)
      .catch((caught) =>
        setLoadError(
          caught instanceof Error
            ? caught.message
            : "Não foi possível carregar a turma.",
        ),
      );
  }

  useEffect(reloadRoster, [classroomId]);

  function openTransfer(student: ClassroomRosterStudent) {
    setTransferringStudent(student);
    setDestinationClassroomId("");
    setTransferError(null);
  }

  async function handleTransfer(event: React.FormEvent) {
    event.preventDefault();
    if (!transferringStudent || !destinationClassroomId) return;
    setTransferSaving(true);
    setTransferError(null);
    try {
      await apiClient.post(
        `/teacher/students/${transferringStudent.id}/enrollments`,
        {
          classroomId: destinationClassroomId,
        },
      );
      setTransferringStudent(null);
      reloadRoster();
    } catch (caught) {
      setTransferError(
        caught instanceof ApiError
          ? caught.message
          : "Não foi possível transferir o aluno.",
      );
    } finally {
      setTransferSaving(false);
    }
  }

  function openReset(student: ClassroomRosterStudent) {
    setResettingStudent(student);
    setResetResult(null);
    setResetError(null);
  }

  async function handleReset() {
    if (!resettingStudent) return;
    setResetSaving(true);
    setResetError(null);
    try {
      const result = await apiClient.post<ResetCredentialResult>(
        `/teacher/students/${resettingStudent.id}/reset-credential`,
        {},
      );
      setResetResult(result);
    } catch (caught) {
      setResetError(
        caught instanceof ApiError
          ? caught.message
          : "Não foi possível gerar uma nova credencial.",
      );
    } finally {
      setResetSaving(false);
    }
  }

  const destinationOptions = (classrooms ?? []).filter(
    (classroom) => classroom.id !== classroomId,
  );

  return (
    <main className="teacher-students staff-theme page">
      <LinkButton to="/home" variant="ghost" icon="←">
        Voltar
      </LinkButton>
      <h1>Meus alunos</h1>

      {classrooms !== null && classrooms.length === 0 && (
        <InlineFeedback kind="info">
          Você ainda não tem nenhuma turma sob sua responsabilidade.
        </InlineFeedback>
      )}

      {classrooms !== null && classrooms.length > 1 && (
        <Select
          id="roster-classroom"
          label="Turma"
          value={classroomId}
          onValueChange={setClassroomId}
          options={classrooms.map((classroom) => ({
            value: classroom.id,
            label: classroom.name,
          }))}
        />
      )}

      {loadError && <InlineFeedback kind="retry">{loadError}</InlineFeedback>}
      {roster === null && classroomId && !loadError && <p>Carregando…</p>}

      {roster !== null && roster.length === 0 && (
        <p className="teacher-students__empty">
          Nenhum aluno matriculado nesta turma ainda.
        </p>
      )}

      {roster !== null && roster.length > 0 && (
        <Table ariaLabel="Alunos da turma">
          <TableHead>
            <TableRow>
              <TableHeaderCell scope="col">Aluno</TableHeaderCell>
              <TableHeaderCell scope="col">Matriculado desde</TableHeaderCell>
              <TableHeaderCell scope="col">Ações</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {roster.map((student) => (
              <TableRow key={student.id}>
                <TableCell>
                  <span className="teacher-students__student">
                    {student.avatar && (
                      <img
                        className="teacher-students__avatar"
                        src={getIllustrationAsset(student.avatar.assetRef)}
                        alt=""
                      />
                    )}
                    {student.displayName}
                  </span>
                </TableCell>
                <TableCell>
                  {new Date(student.enrolledAt).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell>
                  <Button
                    variant="secondary"
                    icon={<ArrowRightLeft />}
                    disabled={destinationOptions.length === 0}
                    onClick={() => openTransfer(student)}
                  >
                    Transferir de turma
                  </Button>
                  <Button
                    variant="ghost"
                    icon={<KeyRound />}
                    onClick={() => openReset(student)}
                  >
                    Recuperar acesso
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog
        open={transferringStudent !== null}
        onOpenChange={(open) => !open && setTransferringStudent(null)}
        title={
          transferringStudent
            ? `Transferir ${transferringStudent.displayName}`
            : "Transferir aluno"
        }
        description="A matrícula atual é encerrada e uma nova é criada na turma de destino — o histórico de progresso do aluno não é perdido."
      >
        {transferringStudent && (
          <form
            className="teacher-students__transfer-form"
            onSubmit={handleTransfer}
          >
            <Select
              id="destination-classroom"
              label="Nova turma"
              placeholder="Escolha a turma de destino"
              value={destinationClassroomId}
              onValueChange={setDestinationClassroomId}
              options={destinationOptions.map((classroom) => ({
                value: classroom.id,
                label: classroom.name,
              }))}
            />
            {transferError && (
              <InlineFeedback kind="retry">{transferError}</InlineFeedback>
            )}
            <Button
              type="submit"
              disabled={transferSaving || !destinationClassroomId}
            >
              {transferSaving ? "Transferindo…" : "Confirmar transferência"}
            </Button>
          </form>
        )}
      </Dialog>

      <Dialog
        open={resettingStudent !== null}
        onOpenChange={(open) => !open && setResettingStudent(null)}
        title={
          resettingStudent
            ? `Recuperar acesso — ${resettingStudent.displayName}`
            : "Recuperar acesso"
        }
        description="Gera uma sequência de login nova pro aluno. A sequência antiga deixa de funcionar imediatamente."
      >
        {resettingStudent && !resetResult && (
          <div className="teacher-students__reset-body">
            <p>
              {resettingStudent.displayName} não vai conseguir mais entrar com a
              sequência de imagens antiga depois desta ação. Confirme só se o
              aluno realmente esqueceu a credencial.
            </p>
            {resetError && (
              <InlineFeedback kind="retry">{resetError}</InlineFeedback>
            )}
            <Button onClick={handleReset} disabled={resetSaving}>
              {resetSaving ? "Gerando…" : "Gerar nova credencial"}
            </Button>
          </div>
        )}

        {resetResult && (
          <div className="teacher-students__reset-body">
            <InlineFeedback kind="success">
              Nova credencial gerada. Mostre a sequência abaixo pro aluno
              anotar/memorizar.
            </InlineFeedback>
            <div className="teacher-students__credential-images">
              {resetResult.credential.loginImages.map((image, index) => (
                <div key={index} className="teacher-students__credential-image">
                  <img
                    src={getIllustrationAsset(image.assetRef)}
                    alt={image.label}
                  />
                  <span aria-hidden="true">{index + 1}</span>
                </div>
              ))}
            </div>
            <Button
              variant="secondary"
              onClick={() => setResettingStudent(null)}
            >
              Fechar
            </Button>
          </div>
        )}
      </Dialog>
    </main>
  );
}
