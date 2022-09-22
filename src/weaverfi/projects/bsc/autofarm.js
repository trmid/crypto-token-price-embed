// Imports:
import { WeaverError } from '../../error';
import { minABI, autofarm } from '../../ABIs';
import { add4BeltToken, addBeltToken, addAlpacaToken } from '../../project-functions';
import { query, multicallOneContractQuery, addToken, addLPToken, parseBN } from '../../functions';
// Initializations:
const chain = 'bsc';
const project = 'autofarm';
const registry = '0x0895196562C7868C5Be92459FaE7f877ED450452';
const autoVault = '0x763a05bdb9f8946d8C3FA72d1e0d3f5E68647e5C';
const auto = '0xa184088a740c695e156f91f5cc086a06bb78b827';
const ignoredVaults = [331];
/* ========================================================================================================================================================================= */
// Function to get project balance:
export const get = async (wallet) => {
    let balance = [];
    balance.push(...(await getVaultBalances(wallet).catch((err) => { throw new WeaverError(chain, project, 'getVaultBalances()', err); })));
    balance.push(...(await getAutoVaultBalance(wallet).catch((err) => { throw new WeaverError(chain, project, 'getAutoVaultBalance()', err); })));
    return balance;
};
/* ========================================================================================================================================================================= */
// Function to get all vault balances:
export const getVaultBalances = async (wallet) => {
    let balances = [];
    let poolLength = parseInt(await query(chain, registry, autofarm.registryABI, 'poolLength', []));
    let vaults = [...Array(poolLength).keys()];
    let autoRewards = 0;
    // Balance Multicall Query:
    let calls = [];
    vaults.forEach(vaultID => {
        if (vaultID != 0 && !ignoredVaults.includes(vaultID)) {
            calls.push({ reference: vaultID.toString(), methodName: 'stakedWantTokens', methodParameters: [vaultID, wallet] });
        }
    });
    let multicallResults = await multicallOneContractQuery(chain, registry, autofarm.registryABI, calls);
    let promises = vaults.map(vaultID => (async () => {
        let balanceResults = multicallResults[vaultID];
        if (balanceResults) {
            let balance = parseBN(balanceResults[0]);
            if (balance > 99) {
                let token = (await query(chain, registry, autofarm.registryABI, 'poolInfo', [vaultID]))[0];
                let symbol = await query(chain, token, minABI, 'symbol', []);
                // Regular LP Vaults:
                if (symbol.endsWith('LP')) {
                    let newToken = await addLPToken(chain, project, 'staked', token, balance, wallet);
                    balances.push(newToken);
                    // 4Belt Vault:
                }
                else if (symbol === '4Belt') {
                    let newToken = await add4BeltToken(chain, project, 'staked', token, balance, wallet);
                    balances.push(newToken);
                    // Belt Vaults:
                }
                else if (symbol.startsWith('belt')) {
                    let newToken = await addBeltToken(chain, project, 'staked', token, balance, wallet);
                    balances.push(newToken);
                    // Alpaca Vaults:
                }
                else if (symbol.startsWith('ib')) {
                    let newToken = await addAlpacaToken(chain, project, 'staked', token, balance, wallet);
                    balances.push(newToken);
                    // Single-Asset Vaults:
                }
                else {
                    let newToken = await addToken(chain, project, 'staked', token, balance, wallet);
                    balances.push(newToken);
                }
                // Pending AUTO Rewards:
                let rewards = parseInt(await query(chain, registry, autofarm.pendingRewardsABI, 'pendingAUTO', [vaultID, wallet]));
                if (rewards > 0) {
                    autoRewards += rewards;
                }
            }
        }
    })());
    await Promise.all(promises);
    if (autoRewards > 0) {
        let newToken = await addToken(chain, project, 'unclaimed', auto, autoRewards, wallet);
        balances.push(newToken);
    }
    return balances;
};
// Function to get AUTO vault balance:
export const getAutoVaultBalance = async (wallet) => {
    let balance = parseInt(await query(chain, autoVault, autofarm.registryABI, 'stakedWantTokens', [0, wallet]));
    if (balance > 300000000000) {
        let newToken = await addToken(chain, project, 'staked', auto, balance, wallet);
        return [newToken];
    }
    else {
        return [];
    }
};
