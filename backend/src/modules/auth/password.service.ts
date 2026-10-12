import { Injectable, OnModuleInit } from '@nestjs/common';
import * as argon2 from 'argon2';
import { randomBytes } from 'node:crypto';

@Injectable()
export class PasswordService implements OnModuleInit {
  private dummyHash!: string;
  async onModuleInit() { this.dummyHash = await this.hash(randomBytes(32).toString('hex')); }

  hash(password: string): Promise<string> {
    if (!password || password.length > 1024) throw new Error('Invalid password length');
    return argon2.hash(password, {
      type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1, hashLength: 32,
    });
  }

  async verify(hash: string | undefined, password: string): Promise<boolean> {
    try {
      const matches = await argon2.verify(hash ?? this.dummyHash, password);
      return !!hash && matches;
    } catch {
      // Corrupt hashes fail closed; still perform a normal-cost comparison.
      await argon2.verify(this.dummyHash, password);
      return false;
    }
  }
}
