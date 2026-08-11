import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubjectsService } from './subjects.service';

@Controller('subjects')
@UseGuards(JwtAuthGuard)
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Get('topics')
  async listTopics() {
    const topics = await this.subjectsService.findAllTopics();
    return topics.map((topic) => ({
      topicId: topic.id,
      subjectId: topic.subjectId,
      name: `${topic.subject.name} — ${topic.name}`,
      // 3.13/3.16 — decide pro frontend qual página abrir ao confirmar este
      // módulo (SubjectSelector.handleConfirm); nunca inferido do slug/nome.
      domain: topic.domain,
    }));
  }
}
