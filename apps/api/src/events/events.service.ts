import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateEventDto } from './dto/create-event.dto';
import { InteractionEvent } from './entities/interaction-event.entity';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(InteractionEvent)
    private readonly eventsRepository: Repository<InteractionEvent>,
  ) {}

  async record(dto: CreateEventDto): Promise<InteractionEvent> {
    const event = this.eventsRepository.create({
      studentPseudoId: dto.studentPseudoId,
      category: dto.category,
      type: dto.type,
      payload: dto.payload ?? {},
      sessionId: dto.sessionId ?? null,
    });
    return this.eventsRepository.save(event);
  }
}
