import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager } from '@mikro-orm/core';
import { User } from '../entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
    private readonly em: EntityManager,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepository.findAll();
  }

  async findOne(id: number): Promise<User | null> {
    return this.userRepository.findOne({ id });
  }

  async create(user: Partial<User>): Promise<User> {
    const newUser = new User();
    Object.assign(newUser, user);
    this.em.persist(newUser);
    await this.em.flush();
    return newUser;
  }

  async update(id: number, user: Partial<User>): Promise<User | null> {
    const existingUser = await this.userRepository.findOne({ id });
    if (!existingUser) {
      return null;
    }

    Object.assign(existingUser, user);
    await this.em.flush();
    return existingUser;
  }

  async delete(id: number): Promise<boolean> {
    const user = await this.userRepository.findOne({ id });
    if (!user) {
      return false;
    }

    this.em.remove(user);
    await this.em.flush();
    return true;
  }
}
