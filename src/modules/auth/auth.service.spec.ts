import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from '../../entities/user.entity';
import { Dokan } from '../../entities/dokan.entity';
import { UserRole } from '../../common/enums';

describe('AuthService', () => {
  let service: AuthService;
  let usersRepo: { findOne: jest.Mock };
  const jwt = { sign: jest.fn(() => 'jwt-token') };

  beforeEach(async () => {
    usersRepo = { findOne: jest.fn() };
    const dataSource = {
      transaction: jest.fn(async (cb: any) =>
        cb({
          create: (_entity: any, data: any) => data,
          save: jest.fn(async (entity: any) => ({ id: 'u1', ...entity })),
        }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: usersRepo },
        { provide: getRepositoryToken(Dokan), useValue: {} },
        { provide: JwtService, useValue: jwt },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('returns token + user on happy path as GRAHOK', async () => {
      usersRepo.findOne.mockResolvedValue(null);
      const result = await service.register({
        email: 'Test@Example.com',
        password: 'password123',
        name: 'Tester',
        role: UserRole.GRAHOK,
      } as any);

      expect(result.token).toBe('jwt-token');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.role).toBe(UserRole.GRAHOK);
    });

    it('throws ConflictException when email already registered', async () => {
      usersRepo.findOne.mockResolvedValue({ id: 'existing' });
      await expect(
        service.register({
          email: 'taken@example.com',
          password: 'password123',
          name: 'Tester',
          role: UserRole.GRAHOK,
        } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('throws BadRequestException when DOKANDAR signs up without dokan details', async () => {
      usersRepo.findOne.mockResolvedValue(null);
      await expect(
        service.register({
          email: 'shop@example.com',
          password: 'password123',
          name: 'Owner',
          role: UserRole.DOKANDAR,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException when email not found', async () => {
      usersRepo.findOne.mockResolvedValue(null);
      await expect(
        service.login({ email: 'nobody@example.com', password: 'pw' } as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when password is wrong', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 4);
      usersRepo.findOne.mockResolvedValue({
        id: 'u1',
        email: 'user@example.com',
        passwordHash,
        role: UserRole.GRAHOK,
      });
      await expect(
        service.login({ email: 'user@example.com', password: 'wrong-password' } as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns token + user when credentials are valid', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 4);
      usersRepo.findOne.mockResolvedValue({
        id: 'u1',
        email: 'user@example.com',
        name: 'User',
        passwordHash,
        role: UserRole.GRAHOK,
      });
      const result = await service.login({
        email: 'user@example.com',
        password: 'correct-password',
      } as any);
      expect(result.token).toBe('jwt-token');
      expect(result.user.id).toBe('u1');
    });
  });
});
