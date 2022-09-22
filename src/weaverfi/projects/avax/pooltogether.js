// Imports:
import { minABI } from '../../ABIs';
import { WeaverError } from '../../error';
import { query, addToken } from '../../functions';
// Initializations:
const chain = 'avax';
const project = 'pooltogether';
const poolTicketV4 = '0xB27f379C050f6eD0973A01667458af6eCeBc1d90';
const poolDepositV4 = '0xF830F5Cb2422d555EC34178E27094a816c8F95EC';
const usdc = '0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664';
/* ========================================================================================================================================================================= */
// Function to get project balance:
export const get = async (wallet) => {
    let balance = [];
    balance.push(...(await getPoolBalanceV4(wallet).catch((err) => { throw new WeaverError(chain, project, 'getPoolBalanceV4()', err); })));
    return balance;
};
/* ========================================================================================================================================================================= */
// Function to get V4 pool balance:
export const getPoolBalanceV4 = async (wallet) => {
    let balance = parseInt(await query(chain, poolTicketV4, minABI, 'balanceOf', [wallet]));
    if (balance > 0) {
        let newToken = await addToken(chain, project, 'staked', usdc, balance, wallet, poolDepositV4);
        return [newToken];
    }
    else {
        return [];
    }
};
