// Imports:
import { WeaverError } from '../../error';
import { minABI, quickswap } from '../../ABIs';
import { query, multicallOneMethodQuery, multicallOneContractQuery, addToken, addLPToken, addXToken, parseBN, zero } from '../../functions';
// Initializations:
const chain = 'poly';
const project = 'quickswap';
const registry = '0x8aAA5e259F74c8114e0a471d9f2ADFc66Bfe09ed';
const dualRegistry = '0x9Dd12421C637689c3Fc6e661C9e2f02C2F61b3Eb';
const quick = '0x831753dd7087cac61ab5644b308642cc1c33dc13';
const dquick = '0xf28164a485b0b2c90639e47b0f377b4a438a16b1';
const wmatic = '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270';
const farmCount = 188;
const dualFarmCount = 17;
/* ========================================================================================================================================================================= */
// Function to get project balance:
export const get = async (wallet) => {
    let balance = [];
    let farms = await getFarms().catch((err) => { throw new WeaverError(chain, project, 'getFarms()', err); });
    let dualFarms = await getDualFarms().catch((err) => { throw new WeaverError(chain, project, 'getDualFarms()', err); });
    let ratio = await getRatio().catch((err) => { throw new WeaverError(chain, project, 'getRatio()', err); });
    balance.push(...(await getFarmBalances(wallet, farms, ratio).catch((err) => { throw new WeaverError(chain, project, 'getFarmBalances()', err); })));
    balance.push(...(await getDualFarmBalances(wallet, dualFarms, ratio).catch((err) => { throw new WeaverError(chain, project, 'getDualFarmBalances()', err); })));
    balance.push(...(await getStakedQUICK(wallet, ratio).catch((err) => { throw new WeaverError(chain, project, 'getStakedQUICK()', err); })));
    return balance;
};
/* ========================================================================================================================================================================= */
// Function to get all farm balances:
export const getFarmBalances = async (wallet, farms, ratio) => {
    let balances = [];
    // Balance Multicall Query:
    let multicallResults = await multicallOneMethodQuery(chain, farms, minABI, 'balanceOf', [wallet]);
    let promises = farms.map(farm => (async () => {
        let balanceResults = multicallResults[farm];
        if (balanceResults) {
            let balance = parseBN(balanceResults[0]);
            if (balance > 0) {
                let token = await query(chain, farm, quickswap.farmABI, 'stakingToken', []);
                let newToken = await addLPToken(chain, project, 'staked', token, balance, wallet);
                balances.push(newToken);
                // Pending QUICK Rewards:
                let rewards = parseInt(await query(chain, farm, quickswap.farmABI, 'earned', [wallet]));
                if (rewards > 0) {
                    let newToken = await addToken(chain, project, 'unclaimed', quick, rewards * ratio, wallet);
                    balances.push(newToken);
                }
            }
        }
    })());
    await Promise.all(promises);
    return balances;
};
// Function to get all dual farm balances:
export const getDualFarmBalances = async (wallet, dualFarms, ratio) => {
    let balances = [];
    // Balance Multicall Query:
    let multicallResults = await multicallOneMethodQuery(chain, dualFarms, minABI, 'balanceOf', [wallet]);
    let promises = dualFarms.map(farm => (async () => {
        let balanceResults = multicallResults[farm];
        if (balanceResults) {
            let balance = parseBN(balanceResults[0]);
            if (balance > 0) {
                let token = await query(chain, farm, quickswap.dualFarmABI, 'stakingToken', []);
                let newToken = await addLPToken(chain, project, 'staked', token, balance, wallet);
                balances.push(newToken);
                // Pending QUICK Rewards:
                let rewardsA = parseInt(await query(chain, farm, quickswap.dualFarmABI, 'earnedA', [wallet]));
                if (rewardsA > 0) {
                    let newToken = await addToken(chain, project, 'unclaimed', quick, rewardsA * ratio, wallet);
                    balances.push(newToken);
                }
                // Pending WMATIC Rewards:
                let rewardsB = parseInt(await query(chain, farm, quickswap.dualFarmABI, 'earnedB', [wallet]));
                if (rewardsB > 0) {
                    let newToken = await addToken(chain, project, 'unclaimed', wmatic, rewardsB, wallet);
                    balances.push(newToken);
                }
            }
        }
    })());
    await Promise.all(promises);
    return balances;
};
// Function to get staked QUICK balance:
export const getStakedQUICK = async (wallet, ratio) => {
    let balance = parseInt(await query(chain, dquick, minABI, 'balanceOf', [wallet]));
    if (balance > 0) {
        let newToken = await addXToken(chain, project, 'staked', dquick, balance, wallet, quick, balance * ratio);
        return [newToken];
    }
    else {
        return [];
    }
};
/* ========================================================================================================================================================================= */
// Function to get farms:
const getFarms = async () => {
    let farmIDs = [...Array(farmCount + 1).keys()];
    // Token Multicall Query:
    let tokenCalls = [];
    farmIDs.forEach(id => {
        tokenCalls.push({ reference: id.toString(), methodName: 'stakingTokens', methodParameters: [id] });
    });
    let tokenMulticallResults = await multicallOneContractQuery(chain, registry, quickswap.registryABI, tokenCalls);
    // Farms Multicall Query:
    let tokens = Object.keys(tokenMulticallResults).map(id => tokenMulticallResults[id][0]);
    let farmCalls = [];
    tokens.forEach(token => {
        farmCalls.push({ reference: token, methodName: 'stakingRewardsInfoByStakingToken', methodParameters: [token] });
    });
    let farmMulticallResults = await multicallOneContractQuery(chain, registry, quickswap.registryABI, farmCalls);
    let farms = Object.keys(farmMulticallResults).map(token => farmMulticallResults[token][0]).filter(farm => farm != zero);
    return farms;
};
// Function to get dual reward farms:
const getDualFarms = async () => {
    let farmIDs = [...Array(dualFarmCount + 1).keys()];
    // Token Multicall Query:
    let tokenCalls = [];
    farmIDs.forEach(id => {
        tokenCalls.push({ reference: id.toString(), methodName: 'stakingTokens', methodParameters: [id] });
    });
    let tokenMulticallResults = await multicallOneContractQuery(chain, dualRegistry, quickswap.dualRegistryABI, tokenCalls);
    // Dual Farms Multicall Query:
    let tokens = Object.keys(tokenMulticallResults).map(id => tokenMulticallResults[id][0]);
    let dualFarmCalls = [];
    tokens.forEach(token => {
        dualFarmCalls.push({ reference: token, methodName: 'stakingRewardsInfoByStakingToken', methodParameters: [token] });
    });
    let dualFarmMulticallResults = await multicallOneContractQuery(chain, dualRegistry, quickswap.dualRegistryABI, dualFarmCalls);
    let dualFarms = Object.keys(dualFarmMulticallResults).map(token => dualFarmMulticallResults[token][0]).filter(farm => farm != zero);
    return dualFarms;
};
// Function to get dQUICK ratio:
const getRatio = async () => {
    let ratio = parseInt(await query(chain, dquick, quickswap.stakingABI, 'dQUICKForQUICK', [100000000])) / (10 ** 8);
    return ratio;
};
