// Imports:
import { avalaunch } from '../../ABIs';
import { WeaverError } from '../../error';
import { query, addToken, addLPToken } from '../../functions';
// Initializations:
const chain = 'avax';
const project = 'avalaunch';
const staking = '0xA6A01f4b494243d84cf8030d982D7EeB2AeCd329';
const lpStaking = '0x6E125b68F0f1963b09add1b755049e66f53CC1EA';
const lpToken = '0x42152bDD72dE8d6767FE3B4E17a221D6985E8B25';
const xava = '0xd1c3f94de7e5b45fa4edbba472491a9f4b166fc4';
/* ========================================================================================================================================================================= */
// Function to get project balance:
export const get = async (wallet) => {
    let balance = [];
    balance.push(...(await getStakedXAVA(wallet).catch((err) => { throw new WeaverError(chain, project, 'getStakedXAVA()', err); })));
    balance.push(...(await getStakedLP(wallet).catch((err) => { throw new WeaverError(chain, project, 'getStakedLP()', err); })));
    return balance;
};
/* ========================================================================================================================================================================= */
// Function to get staked XAVA balance:
export const getStakedXAVA = async (wallet) => {
    let xavaBalance = 0;
    let balance = parseInt(await query(chain, staking, avalaunch.stakingABI, 'deposited', [0, wallet]));
    if (balance > 0) {
        xavaBalance += balance;
        let pendingXAVA = parseInt(await query(chain, staking, avalaunch.stakingABI, 'pending', [0, wallet]));
        if (pendingXAVA > 0) {
            xavaBalance += pendingXAVA;
        }
        let newToken = await addToken(chain, project, 'staked', xava, xavaBalance, wallet);
        return [newToken];
    }
    else {
        return [];
    }
};
// Function to get staked LP balance:
export const getStakedLP = async (wallet) => {
    let balances = [];
    let balance = parseInt(await query(chain, lpStaking, avalaunch.stakingABI, 'deposited', [0, wallet]));
    if (balance > 0) {
        let newToken = await addLPToken(chain, project, 'staked', lpToken, balance, wallet);
        balances.push(newToken);
        let pendingXAVA = parseInt(await query(chain, lpStaking, avalaunch.stakingABI, 'pending', [0, wallet]));
        if (pendingXAVA > 0) {
            let newToken = await addToken(chain, project, 'unclaimed', xava, pendingXAVA, wallet);
            balances.push(newToken);
        }
    }
    return balances;
};
