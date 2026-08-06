import { Controller, Get, Query } from '@nestjs/common';
import { ListIllustrationsDto } from './dto/list-illustrations.dto';
import { IllustrationsService } from './illustrations.service';

// Sem guard de propósito: o catálogo de avatares/imagens de login é
// consumido durante o fluxo de login do aluno, antes de qualquer JWT
// existir — mesmo raciocínio do roster em AuthController. Só devolve
// label/assetRef/position, nunca dado de aluno.
@Controller('illustrations')
export class IllustrationsController {
  constructor(private readonly illustrationsService: IllustrationsService) {}

  @Get()
  async list(@Query() query: ListIllustrationsDto) {
    const illustrations = await this.illustrationsService.findByKind(query.kind);
    return illustrations.map((illustration) => ({
      id: illustration.id,
      slug: illustration.slug,
      label: illustration.label,
      assetRef: illustration.assetRef,
      position: illustration.position,
    }));
  }
}
