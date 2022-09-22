// Imports:
import { pancakeswap } from '../../ABIs';
import { WeaverError } from '../../error';
import { query, multicallOneContractQuery, addToken, addLPToken, parseBN } from '../../functions';
// Initializations:
const chain = 'bsc';
const project = 'pancakeswap';
const registry = '0x73feaa1eE314F8c655E354234017bE2193C9E24E';
const registryV2 = '0xa5f8C5Dbd5F286960b9d90548680aE5ebFf07652';
const autoCakePool = '0xa80240Eb5d7E05d3F250cF000eEc0891d00b51CC';
const cake = '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82';
/* ========================================================================================================================================================================= */
// Function to get project balance:
export const get = async (wallet) => {
    let balance = [];
    balance.push(...(await getFarmBalances(wallet).catch((err) => { throw new WeaverError(chain, project, 'getFarmBalances()', err); })));
    balance.push(...(await getFarmBalancesV2(wallet).catch((err) => { throw new WeaverError(chain, project, 'getFarmBalancesV2()', err); })));
    balance.push(...(await getAutoCakePoolBalance(wallet).catch((err) => { throw new WeaverError(chain, project, 'getAutoCakePoolBalance()', err); })));
    return balance;
};
/* ========================================================================================================================================================================= */
// Function to get farm balances:
export const getFarmBalances = async (wallet) => {
    let balances = [];
    let cakeRewards = 0;
    let poolLength = parseInt(await query(chain, registry, pancakeswap.registryABI, 'poolLength', []));
    let farms = [...Array(poolLength).keys()];
    // User Info Multicall Query:
    let calls = [];
    farms.forEach(farmID => {
        calls.push({ reference: farmID.toString(), methodName: 'userInfo', methodParameters: [farmID, wallet] });
    });
    let multicallResults = await multicallOneContractQuery(chain, registry, pancakeswap.registryABI, calls);
    let promises = farms.map(farmID => (async () => {
        let userInfoResults = multicallResults[farmID];
        if (userInfoResults) {
            let balance = parseBN(userInfoResults[0]);
            if (balance > 0) {
                let token = (await query(chain, registry, pancakeswap.registryABI, 'poolInfo', [farmID]))[0];
                // Single-Asset Cake Farm:
                if (farmID === 0) {
                    let newToken = await addToken(chain, project, 'staked', token, balance, wallet);
                    balances.push(newToken);
                    // All Other Farms:
                }
                else {
                    let newToken = await addLPToken(chain, project, 'staked', token, balance, wallet);
                    balances.push(newToken);
                }
                // Pending Cake Rewards:
                let rewards = parseInt(await query(chain, registry, pancakeswap.registryABI, 'pendingCake', [farmID, wallet]));
                if (rewards > 0) {
                    cakeRewards += rewards;
                }
            }
        }
    })());
    await Promise.all(promises);
    if (cakeRewards > 0) {
        let newToken = await addToken(chain, project, 'unclaimed', cake, cakeRewards, wallet);
        balances.push(newToken);
    }
    return balances;
};
// Function to get farm V2 balances:
export const getFarmBalancesV2 = async (wallet) => {
    let balances = [];
    let cakeRewards = 0;
    let poolLength = parseInt(await query(chain, registryV2, pancakeswap.registryABI, 'poolLength', []));
    let farms = [...Array(poolLength).keys()];
    // User Info Multicall Query:
    let calls = [];
    farms.forEach(farmID => {
        calls.push({ reference: farmID.toString(), methodName: 'userInfo', methodParameters: [farmID, wallet] });
    });
    let multicallResults = await multicallOneContractQuery(chain, registryV2, pancakeswap.registryABI, calls);
    let promises = farms.map(farmID => (async () => {
        let userInfoResults = multicallResults[farmID];
        if (userInfoResults) {
            let balance = parseBN(userInfoResults[0]);
            if (balance > 0) {
                let token = await query(chain, registryV2, pancakeswap.registryABI, 'lpToken', [farmID]);
                // Single-Asset Cake Farm:
                if (farmID === 0) {
                    let newToken = await addToken(chain, project, 'staked', token, balance, wallet);
                    balances.push(newToken);
                    // All Other Farms:
                }
                else {
                    let newToken = await addLPToken(chain, project, 'staked', token, balance, wallet);
                    balances.push(newToken);
                }
                // Pending Cake Rewards:
                let rewards = parseInt(await query(chain, registryV2, pancakeswap.registryABI, 'pendingCake', [farmID, wallet]));
                if (rewards > 0) {
                    cakeRewards += rewards;
                }
            }
        }
    })());
    await Promise.all(promises);
    if (cakeRewards > 0) {
        let newToken = await addToken(chain, project, 'unclaimed', cake, cakeRewards, wallet);
        balances.push(newToken);
    }
    return balances;
};
// Function to get CAKE in auto-compounding pool:
export const getAutoCakePoolBalance = async (wallet) => {
    let balance = parseInt((await query(chain, autoCakePool, pancakeswap.autoCakePoolABI, 'userInfo', [wallet]))[0]);
    if (balance > 0) {
        let multiplier = parseInt(await query(chain, autoCakePool, pancakeswap.autoCakePoolABI, 'getPricePerFullShare', [])) / (10 ** 18);
        let actualBalance = balance * multiplier;
        let newToken = await addToken(chain, project, 'staked', cake, actualBalance, wallet);
        return [newToken];
    }
    else {
        return [];
    }
};
