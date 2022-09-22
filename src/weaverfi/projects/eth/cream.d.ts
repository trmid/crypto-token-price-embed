import type { Address, Token, LPToken, DebtToken } from '../../types';
export declare const get: (wallet: Address) => Promise<(Token | LPToken | DebtToken)[]>;
export declare const getStakedCREAM: (wallet: Address) => Promise<Token[]>;
