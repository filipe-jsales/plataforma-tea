// 1.5 - mesma forma que a API de enrollments devolve.
export interface ClassroomRosterStudent {
  id: string;
  displayName: string;
  avatar: { label: string; assetRef: string } | null;
  enrolledAt: string;
}

export interface TransferResult {
  studentId: string;
  previousClassroomId: string | null;
  newClassroom: { id: string; name: string; joinCode: string };
}
