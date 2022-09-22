// Imports:
import { sushiswap } from '../../ABIs';
import { WeaverError } from '../../error';
import { query, multicallOneContractQuery, addToken, addLPToken, parseBN } from '../../functions';
// Initializations:
const chain = 'eth';
const project = 'sushiswap';
const masterChef = '0xc2EdaD668740f1aA35E4D8f227fB8E17dcA888Cd';
const masterChefV2 = '0xEF0881eC094552b2e128Cf945EF17a6752B4Ec5d';
const sushi = '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2';
/* ========================================================================================================================================================================= */
// Function to get project balance:
export const get = async (wallet) => {
    let balance = [];
    balance.push(...(await getFarmBalances(wallet).catch((err) => { throw new WeaverError(chain, project, 'getFarmBalances()', err); })));
    balance.push(...(await getFarmV2Balances(wallet).catch((err) => { throw new WeaverError(chain, project, 'getFarmV2Balances()', err); })));
    return balance;
};
/* ========================================================================================================================================================================= */
// Function to get farm balances:
export const getFarmBalances = async (wallet) => {
    let balances = [];
    let sushiRewards = 0;
    let farmCount = parseInt(await query(chain, masterChef, sushiswap.masterChefABI, 'poolLength', []));
    let farms = [...Array(farmCount).keys()];
    // User Info Multicall Query:
    let calls = [];
    farms.forEach(farmID => {
        calls.push({ reference: farmID.toString(), methodName: 'userInfo', methodParameters: [farmID, wallet] });
    });
    let multicallResults = await multicallOneContractQuery(chain, masterChef, sushiswap.masterChefABI, calls);
    let promises = farms.map(farmID => (async () => {
        let userInfoResults = multicallResults[farmID];
        if (userInfoResults) {
            let balance = parseBN(userInfoResults[0]);
            if (balance > 0) {
                let lpToken = await query(chain, masterChef, sushiswap.masterChefABI, 'lpToken', [farmID]);
                let newToken = await addLPToken(chain, project, 'staked', lpToken, balance, wallet);
                balances.push(newToken);
                // Pending SUSHI Rewards:
                let rewards = parseInt(await query(chain, masterChef, sushiswap.masterChefABI, 'pendingSushi', [farmID, wallet]));
                if (rewards > 0) {
                    sushiRewards += rewards;
                }
            }
        }
    })());
    await Promise.all(promises);
    if (sushiRewards > 0) {
        let newToken = await addToken(chain, project, 'unclaimed', sushi, sushiRewards, wallet);
        balances.push(newToken);
    }
    return balances;
};
// Function to get farm V2 balances:
export const getFarmV2Balances = async (wallet) => {
    let balances = [];
    let sushiRewards = 0;
    let farmCount = parseInt(await query(chain, masterChefV2, sushiswap.masterChefABI, 'poolLength', []));
    let farms = [...Array(farmCount).keys()];
    // User Info Multicall Query:
    let calls = [];
    farms.forEach(farmID => {
        calls.push({ reference: farmID.toString(), methodName: 'userInfo', methodParameters: [farmID, wallet] });
    });
    let multicallResults = await multicallOneContractQuery(chain, masterChefV2, sushiswap.masterChefABI, calls);
    let promises = farms.map(farmID => (async () => {
        let userInfoResults = multicallResults[farmID];
        if (userInfoResults) {
            let balance = parseBN(userInfoResults[0]);
            if (balance > 0) {
                let lpToken = await query(chain, masterChefV2, sushiswap.masterChefABI, 'lpToken', [farmID]);
                let newToken = await addLPToken(chain, project, 'staked', lpToken, balance, wallet);
                balances.push(newToken);
                // Pending SUSHI Rewards:
                let rewards = parseInt(await query(chain, masterChefV2, sushiswap.masterChefABI, 'pendingSushi', [farmID, wallet]));
                if (rewards > 0) {
                    sushiRewards += rewards;
                }
            }
        }
    })());
    await Promise.all(promises);
    if (sushiRewards > 0) {
        let newToken = await addToken(chain, project, 'unclaimed', sushi, sushiRewards, wallet);
        balances.push(newToken);
    }
    return balances;
};
