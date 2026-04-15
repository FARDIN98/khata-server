import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../../entities/user.entity';
import { Dokan } from '../../entities/dokan.entity';
import { RegisterDto, LoginDto } from './dto/register.dto';
import { UserRole } from '../../common/enums';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(Dokan) private dokansRepo: Repository<Dokan>,
    private jwt: JwtService,
    private dataSource: DataSource,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    if (dto.role === UserRole.DOKANDAR && !dto.dokan) {
      throw new BadRequestException('Dokan details required for Dokandar signup');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.dataSource.transaction(async (m) => {
      const u = m.create(User, {
        email: dto.email,
        passwordHash,
        name: dto.name,
        phone: dto.phone,
        role: dto.role,
      });
      await m.save(u);

      if (dto.role === UserRole.DOKANDAR && dto.dokan) {
        const d = m.create(Dokan, { ...dto.dokan, owner: u });
        await m.save(d);
        u.dokan = d;
      }
      return u;
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.usersRepo.findOne({
      where: { email: dto.email },
      relations: ['dokan'],
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    return this.buildAuthResponse(user);
  }

  private buildAuthResponse(user: User) {
    const token = this.jwt.sign({ sub: user.id, email: user.email, role: user.role });
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        dokan: user.dokan
          ? { id: user.dokan.id, name: user.dokan.name, category: user.dokan.category }
          : null,
      },
    };
  }
}
