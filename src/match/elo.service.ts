import { Injectable } from '@nestjs/common';
import { GameResult } from './interfaces/game-result.interface';

@Injectable()
export class EloService {
  async calculateEloGain(result: number, match: any): Promise<GameResult> {
    const k = 40;
    const d = 400;
    const rWhite = match.whiteElo;
    const rBlack = match.blackElo;
    const eWhite = 1 / (1 + Math.pow(10, (rBlack - rWhite) / d));
    const eBlack = 1 / (1 + Math.pow(10, (rWhite - rBlack) / d));
    let sWhite = result;
    let sBlack;
    switch (result) {
      case 1:
        sBlack = 0;
        break;
      case 0.5:
        sBlack = 0.5;
        break;
      case 0:
        sBlack = 1;
        break;
      default:
        throw new Error('Invalid game result.');
    }

    const gWhite = Math.round(k * (sWhite - eWhite));
    const gBlack = Math.round(k * (sBlack - eBlack));
    const rnWhite = rWhite + gWhite;
    const rnBlack = rBlack + gBlack;

    return {
      nWhiteRating: rnWhite,
      nBlackRating: rnBlack,
      gainWhite: gWhite,
      gainBlack: gBlack,
    };
  }
}
