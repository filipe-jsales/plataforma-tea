import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformSetting } from './entities/platform-setting.entity';

const DEFAULT_MIN_SAMPLE_SIZE_THRESHOLD = 5;

// Singleton: a plataforma tem exatamente 1 linha de configuração global,
// nunca por escola/turma. `getOrCreate` garante que ela existe (lazy
// init) sem precisar de uma migration de seed condicional — a primeira
// leitura já materializa a linha default se ninguém tiver alterado nada
// ainda.
@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(PlatformSetting)
    private readonly settingsRepository: Repository<PlatformSetting>,
  ) {}

  async getOrCreate(): Promise<PlatformSetting> {
    const [existing] = await this.settingsRepository.find({ take: 1 });
    if (existing) {
      return existing;
    }
    const created = this.settingsRepository.create({
      minSampleSizeThreshold: DEFAULT_MIN_SAMPLE_SIZE_THRESHOLD,
    });
    return this.settingsRepository.save(created);
  }

  // Alterar o threshold é puramente sobre apresentação (AC de 6.5: "não
  // recalcula dado histórico nem afeta nada além da exibição do aviso") —
  // por isso não existe evento/migration por mudança, só um UPDATE simples
  // na linha singleton.
  async updateMinSampleSizeThreshold(value: number): Promise<PlatformSetting> {
    const setting = await this.getOrCreate();
    setting.minSampleSizeThreshold = value;
    return this.settingsRepository.save(setting);
  }
}
