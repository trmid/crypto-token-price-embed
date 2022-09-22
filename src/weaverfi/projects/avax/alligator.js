// Imports:
import { WeaverError } from '../../error';
import { minABI, alligator } from '../../ABIs';
import { query, multicallOneContractQuery, multicallOneMethodQuery, addToken, addLPToken, addXToken, parseBN } from '../../functions';
// Initializations:
const chain = 'avax';
const project = 'alligator';
const factory = '0xD9362AA8E0405C93299C573036E7FB4ec3bE1240';
const masterChef = '0x2cB3FF6894a07A9957Cf6797a29218CEBE13F42f';
const gtr = '0x43c812ba28cb061b1be7514145a15c9e18a27342';
const xgtr = '0x32A948F018870548bEd7e888Cd97a257b700D4c6';
/* ========================================================================================================================================================================= */
// Function to get project balance:
export const get = async (wallet) => {
    let balance = [];
    balance.push(...(await getPoolBalances(wallet).catch((err) => { throw new WeaverError(chain, project, 'getPoolBalances()', err); })));
    balance.push(...(await getFarmBalances(wallet).catch((err) => { throw new WeaverError(chain, project, 'getFarmBalances()', err); })));
    balance.push(...(await getStakedGTR(wallet).catch((err) => { throw new WeaverError(chain, project, 'getStakedGTR()', err); })));
    return balance;
};
/* ========================================================================================================================================================================= */
// Function to get all pool balances:
export const getPoolBalances = async (wallet) => {
    let balances = [];
    let poolCount = parseInt(await query(chain, factory, alligator.factoryABI, 'allPairsLength', []));
    let pools = [...Array(poolCount).keys()];
    // LP Token Multicall Query:
    let lpCalls = [];
    pools.forEach(poolID => {
        lpCalls.push({ reference: poolID.toString(), methodName: 'allPairs', methodParameters: [poolID] });
    });
    let lpMulticallResults = await multicallOneContractQuery(chain, factory, alligator.factoryABI, lpCalls);
    // Balance Multicall Query:
    let lpAddresses = Object.keys(lpMulticallResults).map(id => lpMulticallResults[id][0]);
    let balanceMulticallResults = await multicallOneMethodQuery(chain, lpAddresses, minABI, 'balanceOf', [wallet]);
    let promises = lpAddresses.map(lpToken => (async () => {
        let balanceResults = balanceMulticallResults[lpToken];
        if (balanceResults) {
            let balance = parseBN(balanceResults[0]);
            if (balance > 0) {
                let newToken = await addLPToken(chain, project, 'staked', lpToken, balance, wallet);
                balances.push(newToken);
            }
        }
    })());
    await Promise.all(promises);
    return balances;
};
// Function to get all farm balances:
export const getFarmBalances = async (wallet) => {
    let balances = [];
    let farmCount = parseInt(await query(chain, masterChef, alligator.masterChefABI, 'poolLength', []));
    let farms = [...Array(farmCount).keys()];
    // User Info Multicall Query:
    let calls = [];
    farms.forEach(farmID => {
        calls.push({ reference: farmID.toString(), methodName: 'userInfo', methodParameters: [farmID, wallet] });
    });
    let multicallResults = await multicallOneContractQuery(chain, masterChef, alligator.masterChefABI, calls);
    let promises = farms.map(farmID => (async () => {
        let userInfoResults = multicallResults[farmID];
        if (userInfoResults) {
            let balance = parseBN(userInfoResults[0]);
            if (balance > 0) {
                let token = (await query(chain, masterChef, alligator.masterChefABI, 'poolInfo', [farmID])).lpToken;
                let symbol = await query(chain, token, minABI, 'symbol', []);
                // Standard LPs:
                if (symbol === 'ALP') {
                    let newToken = await addLPToken(chain, project, 'staked', token, balance, wallet);
                    balances.push(newToken);
                    // xGTR Farm:
                }
                else if (symbol === 'xGTR') {
                    let gtrStaked = parseInt(await query(chain, gtr, minABI, 'balanceOf', [xgtr]));
                    let xgtrSupply = parseInt(await query(chain, xgtr, minABI, 'totalSupply', []));
                    let newToken = await addXToken(chain, project, 'staked', xgtr, balance, wallet, gtr, balance * (gtrStaked / xgtrSupply));
                    balances.push(newToken);
                }
                // Pending Rewards:
                let rewards = parseInt((await query(chain, masterChef, alligator.masterChefABI, 'pendingTokens', [farmID, wallet])).pendingGtr);
                if (rewards > 0) {
                    let newToken = await addToken(chain, project, 'unclaimed', gtr, rewards, wallet);
                    balances.push(newToken);
                }
            }
        }
    })());
    await Promise.all(promises);
    return balances;
};
// Function to get staked GTR balance:
export const getStakedGTR = async (wallet) => {
    let balance = parseInt(await query(chain, xgtr, minABI, 'balanceOf', [wallet]));
    if (balance > 0) {
        let gtrStaked = parseInt(await query(chain, gtr, minABI, 'balanceOf', [xgtr]));
        let xgtrSupply = parseInt(await query(chain, xgtr, minABI, 'totalSupply', []));
        let newToken = await addXToken(chain, project, 'staked', xgtr, balance, wallet, gtr, balance * (gtrStaked / xgtrSupply));
        return [newToken];
    }
    else {
        return [];
    }
};
