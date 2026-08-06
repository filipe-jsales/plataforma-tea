import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subject } from './entities/subject.entity';
import { Topic } from './entities/topic.entity';

@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(Subject)
    private readonly subjectsRepository: Repository<Subject>,
    @InjectRepository(Topic)
    private readonly topicsRepository: Repository<Topic>,
  ) {}

  findAllSubjects(): Promise<Subject[]> {
    return this.subjectsRepository.find();
  }

  findTopicsBySubjectSlug(subjectSlug: string): Promise<Topic[]> {
    return this.topicsRepository.find({
      where: { subject: { slug: subjectSlug } },
      relations: { subject: true },
    });
  }

  // Alimenta o seletor de matéria/módulo (2.3): já devolve subject+topic
  // juntos porque o componente lista "módulos" (disciplina + assunto), não
  // disciplinas soltas. MVP tem 1 linha, mas o componente não sabe disso.
  findAllTopics(): Promise<Topic[]> {
    return this.topicsRepository.find({ relations: { subject: true } });
  }
}
