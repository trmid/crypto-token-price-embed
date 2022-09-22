// Imports:
import { WeaverError } from '../../error';
import { minABI, beefy } from '../../ABIs';
import { add4BeltToken, addBeltToken, addAlpacaToken } from '../../project-functions';
import { query, multicallOneMethodQuery, addToken, addLPToken, parseBN, fetchData } from '../../functions';
// Initializations:
const chain = 'bsc';
const project = 'beefy';
const staking = '0x0d5761D9181C7745855FC985f646a842EB254eB9';
const bifi = '0xca3f508b8e4dd382ee878a314789373d80a5190a';
const wbnb = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
const apiURL = 'https://api.beefy.finance';
/* ========================================================================================================================================================================= */
// Function to get project balance:
export const get = async (wallet) => {
    let balance = [];
    let vaultsData = await fetchData(`${apiURL}/vaults`);
    let apyData = await fetchData(`${apiURL}/apy`);
    let vaults = vaultsData.filter(vault => vault.chain === 'bsc' && vault.status === 'active');
    if (vaults.length > 0) {
        balance.push(...(await getVaultBalances(wallet, vaults, apyData).catch((err) => { throw new WeaverError(chain, project, 'getVaultBalances()', err); })));
        balance.push(...(await getStakedBIFI(wallet).catch((err) => { throw new WeaverError(chain, project, 'getStakedBIFI()', err); })));
    }
    else {
        throw new WeaverError(chain, project, 'Invalid response from Beefy API');
    }
    return balance;
};
/* ========================================================================================================================================================================= */
// Function to get vault balances:
export const getVaultBalances = async (wallet, vaults, apys) => {
    let balances = [];
    // Balance Multicall Query:
    let vaultAddresses = vaults.map(vault => vault.earnedTokenAddress);
    let multicallResults = await multicallOneMethodQuery(chain, vaultAddresses, minABI, 'balanceOf', [wallet]);
    let promises = vaults.map(vault => (async () => {
        let balanceResults = multicallResults[vault.earnedTokenAddress];
        if (balanceResults) {
            let balance = parseBN(balanceResults[0]);
            if (balance > 0) {
                let decimals = parseInt(await query(chain, vault.earnedTokenAddress, minABI, 'decimals', []));
                let exchangeRate = parseInt(await query(chain, vault.earnedTokenAddress, beefy.vaultABI, 'getPricePerFullShare', []));
                let underlyingBalance = balance * (exchangeRate / (10 ** decimals));
                // Native Token Vaults:
                if (!vault.tokenAddress) {
                    if (vault.token === 'BNB') {
                        let newToken = await addToken(chain, project, 'staked', wbnb, underlyingBalance, wallet);
                        let vaultAPY = apys[vault.id];
                        if (vaultAPY) {
                            newToken.info = {
                                apy: vaultAPY
                            };
                        }
                        balances.push(newToken);
                    }
                }
                else {
                    // Unique Vaults (3+ Assets):
                    if (vault.assets.length > 2) {
                        if (vault.id === 'belt-4belt') {
                            let newToken = await add4BeltToken(chain, project, 'staked', vault.tokenAddress, underlyingBalance, wallet);
                            let vaultAPY = apys[vault.id];
                            if (vaultAPY) {
                                newToken.info = {
                                    apy: vaultAPY
                                };
                            }
                            balances.push(newToken);
                        }
                        // LP Token Vaults:
                    }
                    else if (vault.assets.length === 2 && vault.id != 'omnifarm-usdo-busd-ot' && vault.id != 'ellipsis-renbtc') {
                        let newToken = await addLPToken(chain, project, 'staked', vault.tokenAddress, underlyingBalance, wallet);
                        let vaultAPY = apys[vault.id];
                        if (vaultAPY) {
                            newToken.info = {
                                apy: vaultAPY
                            };
                        }
                        balances.push(newToken);
                        // Single-Asset Vaults:
                    }
                    else if (vault.assets.length === 1) {
                        if (vault.platform === 'Belt') {
                            let newToken = await addBeltToken(chain, project, 'staked', vault.tokenAddress, underlyingBalance, wallet);
                            let vaultAPY = apys[vault.id];
                            if (vaultAPY) {
                                newToken.info = {
                                    apy: vaultAPY
                                };
                            }
                            balances.push(newToken);
                        }
                        else if (vault.platform === 'Alpaca') {
                            let newToken = await addAlpacaToken(chain, project, 'staked', vault.tokenAddress, underlyingBalance, wallet);
                            let vaultAPY = apys[vault.id];
                            if (vaultAPY) {
                                newToken.info = {
                                    apy: vaultAPY
                                };
                            }
                            balances.push(newToken);
                        }
                        else {
                            let newToken = await addToken(chain, project, 'staked', vault.tokenAddress, underlyingBalance, wallet);
                            let vaultAPY = apys[vault.id];
                            if (vaultAPY) {
                                newToken.info = {
                                    apy: vaultAPY
                                };
                            }
                            balances.push(newToken);
                        }
                    }
                }
            }
        }
    })());
    await Promise.all(promises);
    return balances;
};
// Function to get staked BIFI balance:
export const getStakedBIFI = async (wallet) => {
    let balances = [];
    let balance = parseInt(await query(chain, staking, minABI, 'balanceOf', [wallet]));
    if (balance > 0) {
        let newToken = await addToken(chain, project, 'staked', bifi, balance, wallet);
        balances.push(newToken);
    }
    let pendingRewards = parseInt(await query(chain, staking, beefy.stakingABI, 'earned', [wallet]));
    if (pendingRewards > 0) {
        let newToken = await addToken(chain, project, 'unclaimed', wbnb, pendingRewards, wallet);
        balances.push(newToken);
    }
    return balances;
};
