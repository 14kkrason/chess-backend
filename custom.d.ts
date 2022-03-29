import { ValidatedUser } from 'src/auth/interfaces/validated-user.interface';

declare global {
  namespace Express {
    export interface Request {
      user?: ValidatedUser;
    }
  }
}
