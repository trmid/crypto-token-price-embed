// Imports:
import { WeaverError } from '../../error';
import { minABI, belt } from '../../ABIs';
import { add4BeltToken, addBeltToken } from '../../project-functions';
import { query, multicallOneMethodQuery, multicallOneContractQuery, addToken, addLPToken, addXToken, parseBN } from '../../functions';
// Initializations:
const chain = 'bsc';
const project = 'belt';
const masterBelt = '0xD4BbC80b9B102b77B21A06cb77E954049605E6c1';
const beltToken = '0xE0e514c71282b6f4e823703a39374Cf58dc3eA4f';
const stakedBelt = '0x1794BB186c15FdDBf4AAC4a3b0e2f40659e9B841';
const pools = {
    '4Belt': { token: '0x9cb73F20164e399958261c289Eb5F9846f4D1404', vaultID: 3 },
    'beltBTC': { token: '0x51bd63F240fB13870550423D208452cA87c44444', vaultID: 7 },
    'beltETH': { token: '0xAA20E8Cb61299df2357561C2AC2e1172bC68bc25', vaultID: 8 },
    'beltBNB': { token: '0xa8Bb71facdd46445644C277F9499Dd22f6F0A30C', vaultID: 9 },
    'Cake-LP': { token: '0xF3Bc6FC080ffCC30d93dF48BFA2aA14b869554bb', vaultID: 11 },
    'beltDAI': { token: '0x9A86fc508a423AE8a243445dBA7eD5364118AB1D' },
    'beltUSDC': { token: '0x7a59bf07D529A5FdBab67D597d63d7D5a83E61E5' },
    'beltUSDT': { token: '0x55E1B1e49B969C018F2722445Cd2dD9818dDCC25' },
    'beltBUSD': { token: '0x9171Bf7c050aC8B4cf7835e51F7b4841DFB2cCD0' }
};
/* ========================================================================================================================================================================= */
// Function to get project balance:
export const get = async (wallet) => {
    let balance = [];
    balance.push(...(await getStakedBELT(wallet).catch((err) => { throw new WeaverError(chain, project, 'getStakedBELT()', err); })));
    balance.push(...(await getPoolBalances(wallet).catch((err) => { throw new WeaverError(chain, project, 'getPoolBalances()', err); })));
    balance.push(...(await getVaultBalances(wallet).catch((err) => { throw new WeaverError(chain, project, 'getVaultBalances()', err); })));
    return balance;
};
/* ========================================================================================================================================================================= */
// Function to get staked BELT balance:
export const getStakedBELT = async (wallet) => {
    let balance = parseInt(await query(chain, stakedBelt, minABI, 'balanceOf', [wallet]));
    if (balance > 0) {
        let exchangeRate = parseInt(await query(chain, stakedBelt, belt.stakingABI, 'getPricePerFullShare', [])) / (10 ** 18);
        let lockupEnd = parseInt(await query(chain, stakedBelt, belt.stakingABI, 'getUserLockUpEndTime', [wallet]));
        let newToken = await addXToken(chain, project, 'staked', stakedBelt, balance, wallet, beltToken, balance * exchangeRate);
        newToken.info = {
            unlock: lockupEnd
        };
        return [newToken];
    }
    else {
        return [];
    }
};
// Function to get pool balances:
export const getPoolBalances = async (wallet) => {
    let balances = [];
    // Balance Multicall Query:
    let poolAddresses = Object.keys(pools).map(pool => pools[pool].token);
    let multicallResults = await multicallOneMethodQuery(chain, poolAddresses, minABI, 'balanceOf', [wallet]);
    let promises = Object.keys(pools).map(poolKey => (async () => {
        let balanceResults = multicallResults[pools[poolKey].token];
        if (balanceResults) {
            let balance = parseBN(balanceResults[0]);
            if (balance > 0) {
                // 4Belt Pool:
                if (poolKey === '4Belt') {
                    let newToken = await add4BeltToken(chain, project, 'liquidity', pools[poolKey].token, balance, wallet);
                    balances.push(newToken);
                    // PancakeSwap LP:
                }
                else if (poolKey === 'Cake-LP') {
                    let newToken = await addLPToken(chain, project, 'liquidity', pools[poolKey].token, balance, wallet);
                    balances.push(newToken);
                    // Belt Tokens:
                }
                else {
                    let newToken = await addBeltToken(chain, project, 'staked', pools[poolKey].token, balance, wallet);
                    balances.push(newToken);
                }
            }
        }
    })());
    await Promise.all(promises);
    return balances;
};
// Function to get vault balances:
export const getVaultBalances = async (wallet) => {
    let balances = [];
    let beltRewards = 0;
    // Balance Multicall Query:
    let calls = [];
    Object.keys(pools).forEach(poolKey => {
        let vaultID = pools[poolKey].vaultID;
        if (vaultID) {
            calls.push({ reference: poolKey, methodName: 'stakedWantTokens', methodParameters: [vaultID, wallet] });
        }
    });
    let multicallResults = await multicallOneContractQuery(chain, masterBelt, belt.masterBeltABI, calls);
    let promises = Object.keys(pools).map(poolKey => (async () => {
        let balanceResults = multicallResults[poolKey];
        if (balanceResults) {
            let balance = parseBN(balanceResults[0]);
            if (balance > 0) {
                // 4Belt Pool:
                if (poolKey === '4Belt') {
                    let newToken = await add4BeltToken(chain, project, 'staked', pools[poolKey].token, balance, wallet);
                    balances.push(newToken);
                    // PancakeSwap LP:
                }
                else if (poolKey === 'Cake-LP') {
                    let newToken = await addLPToken(chain, project, 'staked', pools[poolKey].token, balance, wallet);
                    balances.push(newToken);
                    // Belt Tokens:
                }
                else {
                    let newToken = await addBeltToken(chain, project, 'staked', pools[poolKey].token, balance, wallet);
                    balances.push(newToken);
                }
                // Pending BELT Rewards:
                let rewards = parseInt(await query(chain, masterBelt, belt.masterBeltABI, 'pendingBELT', [pools[poolKey].vaultID, wallet]));
                if (rewards > 0) {
                    beltRewards += rewards;
                }
            }
        }
    })());
    await Promise.all(promises);
    if (beltRewards > 0) {
        let newToken = await addToken(chain, project, 'unclaimed', beltToken, beltRewards, wallet);
        balances.push(newToken);
    }
    return balances;
};
