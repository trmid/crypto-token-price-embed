// Imports:
import { WeaverError } from '../../error';
import { minABI, spookyswap } from '../../ABIs';
import { addSpookyToken } from '../../project-functions';
import { query, multicallOneContractQuery, addToken, addLPToken, parseBN } from '../../functions';
// Initializations:
const chain = 'ftm';
const project = 'spookyswap';
const masterChef = '0x2b2929E785374c651a81A63878Ab22742656DcDd';
const boo = '0x841FAD6EAe12c286d1Fd18d1d525DFfA75C7EFFE';
const xboo = '0xa48d959AE2E88f1dAA7D5F611E01908106dE7598';
/* ========================================================================================================================================================================= */
// Function to get project balance:
export const get = async (wallet) => {
    let balance = [];
    balance.push(...(await getPoolBalances(wallet).catch((err) => { throw new WeaverError(chain, project, 'getPoolBalances()', err); })));
    balance.push(...(await getStakedBOO(wallet).catch((err) => { throw new WeaverError(chain, project, 'getStakedBOO()', err); })));
    return balance;
};
/* ========================================================================================================================================================================= */
// Function to get all pool balances:
export const getPoolBalances = async (wallet) => {
    let balances = [];
    let poolCount = parseInt(await query(chain, masterChef, spookyswap.masterChefABI, 'poolLength', []));
    let poolList = [...Array(poolCount).keys()];
    // User Info Multicall Query:
    let calls = [];
    poolList.forEach(poolID => {
        calls.push({ reference: poolID.toString(), methodName: 'userInfo', methodParameters: [poolID, wallet] });
    });
    let multicallResults = await multicallOneContractQuery(chain, masterChef, spookyswap.masterChefABI, calls);
    let promises = poolList.map(poolID => (async () => {
        let userInfoResults = multicallResults[poolID];
        if (userInfoResults) {
            let balance = parseBN(userInfoResults[0]);
            if (balance > 0) {
                let token = (await query(chain, masterChef, spookyswap.masterChefABI, 'poolInfo', [poolID])).lpToken;
                let newToken = await addLPToken(chain, project, 'staked', token, balance, wallet);
                balances.push(newToken);
                let rewards = parseInt(await query(chain, masterChef, spookyswap.masterChefABI, 'pendingBOO', [poolID, wallet]));
                if (rewards > 0) {
                    let newToken = await addToken(chain, project, 'unclaimed', boo, rewards, wallet);
                    balances.push(newToken);
                }
            }
        }
    })());
    await Promise.all(promises);
    return balances;
};
// Function to get staked BOO:
export const getStakedBOO = async (wallet) => {
    let balance = parseInt(await query(chain, xboo, minABI, 'balanceOf', [wallet]));
    if (balance > 0) {
        let newToken = await addSpookyToken(chain, project, 'staked', balance, wallet);
        return [newToken];
    }
    else {
        return [];
    }
};
