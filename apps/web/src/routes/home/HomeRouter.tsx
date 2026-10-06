import { useAuthStore } from '../../stores/useAuthStore';
import { AdminHome } from './AdminHome';
import { StudentHome } from './StudentHome';
import { TeacherHome } from './TeacherHome';

// 2.1 - home diferenciada por papel. Um componente por papel (não um
// formulário condicional gigante) - cada um decide sozinho o que faz
// sentido pro seu público, sem acoplar as três lógicas.
export function HomeRouter() {
  const role = useAuthStore((state) => state.user?.role);

  if (role === 'teacher') {
    return <TeacherHome />;
  }
  if (role === 'admin') {
    return <AdminHome />;
  }
  return <StudentHome />;
}
