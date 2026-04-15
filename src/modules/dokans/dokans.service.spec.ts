import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { DokansService } from './dokans.service';
import { Dokan } from '../../entities/dokan.entity';

describe('DokansService', () => {
  let service: DokansService;
  let repo: { findOne: jest.Mock; save: jest.Mock; remove: jest.Mock };

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      save: jest.fn(async (d: any) => d),
      remove: jest.fn(async () => undefined),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DokansService,
        { provide: getRepositoryToken(Dokan), useValue: repo },
      ],
    }).compile();
    service = module.get<DokansService>(DokansService);
  });

  describe('findForOwner', () => {
    it('returns the dokan whose owner matches', async () => {
      repo.findOne.mockResolvedValue({ id: 'd1', name: 'Shop' });
      const result = await service.findForOwner('u1');
      expect(result.id).toBe('d1');
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { owner: { id: 'u1' } },
      });
    });

    it('throws NotFoundException when the user owns no dokan', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findForOwner('u-orphan')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateForOwner', () => {
    it('only updates the caller\u2019s own dokan', async () => {
      repo.findOne.mockResolvedValue({ id: 'd1', name: 'Old', category: 'food' });
      const result = await service.updateForOwner('u1', { name: 'New Name' } as any);
      expect(result.name).toBe('New Name');
      expect(repo.save).toHaveBeenCalled();
    });

    it('throws NotFoundException when the caller does not own a dokan', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(
        service.updateForOwner('u-orphan', { name: 'New' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
