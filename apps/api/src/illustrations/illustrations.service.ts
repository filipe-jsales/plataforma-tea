import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IllustrationKind } from '../common/enums/illustration-kind.enum';
import { Illustration } from './entities/illustration.entity';

const LOGIN_IMAGE_SEQUENCE_LENGTH = 3;

@Injectable()
export class IllustrationsService {
  constructor(
    @InjectRepository(Illustration)
    private readonly illustrationsRepository: Repository<Illustration>,
  ) {}

  findByKind(kind: IllustrationKind): Promise<Illustration[]> {
    return this.illustrationsRepository.find({
      where: { kind },
      order: { position: 'ASC' },
    });
  }

  // 1.2 — "seleção/geração de avatar": quando o professor não escolhe um
  // avatar explicitamente, o sistema gera um. Nunca deriva do nome do
  // aluno (AC: "nome em texto livre nunca é usado como parte da
  // credencial") — sorteio simples sobre o catálogo já curado.
  async pickRandomAvatar(): Promise<Illustration> {
    const avatars = await this.findByKind(IllustrationKind.AVATAR);
    if (avatars.length === 0) {
      throw new InternalServerErrorException('Nenhum avatar cadastrado.');
    }
    return avatars[Math.floor(Math.random() * avatars.length)];
  }

  // 1.2 — credencial simplificada do aluno: sorteia 3 imagens distintas do
  // pool `login_image` (nunca o pool de avatar — ver Illustration, "quem
  // eu sou" não pode se confundir com "minha senha"), em ordem aleatória —
  // mesmo mecanismo já usado no login por sequência de imagens
  // (AuthService.loginStudent compara essa ordem exatamente).
  async pickRandomLoginImageSequence(): Promise<Illustration[]> {
    const pool = await this.findByKind(IllustrationKind.LOGIN_IMAGE);
    if (pool.length < LOGIN_IMAGE_SEQUENCE_LENGTH) {
      throw new InternalServerErrorException(
        'Catálogo de imagens de login insuficiente.',
      );
    }
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, LOGIN_IMAGE_SEQUENCE_LENGTH);
  }
}
