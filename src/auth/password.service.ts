import { Injectable } from '@nestjs/common';
import { promisify } from 'util';
import * as crypto from 'crypto';

const randomBytesAsync = promisify(crypto.randomBytes);

@Injectable()
export class PasswordService {
  async generatePassword() {
    const size = crypto.randomInt(12, 24);
    const bytes = await randomBytesAsync(size);
    return crypto
      .createHash('sha256')
      .update(bytes)
      .digest('hex')
      .slice(0, size + 16); // we do this to add variety - between 28 and 40 chars
  }
}
