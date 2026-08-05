import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../common/enums/role.enum';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  // Escopado por role de propósito: uma senha correta de professor não deve
  // autenticar como admin, mesmo que o e-mail coincida por acidente.
  findByEmailAndRole(email: string, role: Role): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email, role } });
  }

  findByPseudonymId(pseudonymId: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { pseudonymId } });
  }

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id }, relations: { avatar: true } });
  }
}
