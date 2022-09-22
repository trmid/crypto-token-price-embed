// Imports:
import { WeaverError } from '../../error';
import { minABI, autofarm } from '../../ABIs';
import { addCurveToken } from '../../project-functions';
import { query, multicallOneContractQuery, addToken, addLPToken, parseBN } from '../../functions';
// Initializations:
const chain = 'ftm';
const project = 'autofarm';
const registry = '0x76b8c3ECdF99483335239e66F34191f11534cbAA';
const ignoredVaults = [75, 76, 87, 89, 93];
/* ========================================================================================================================================================================= */
// Function to get project balance:
export const get = async (wallet) => {
    let balance = [];
    balance.push(...(await getVaultBalances(wallet).catch((err) => { throw new WeaverError(chain, project, 'getVaultBalances()', err); })));
    return balance;
};
/* ========================================================================================================================================================================= */
// Function to get all vault balances:
export const getVaultBalances = async (wallet) => {
    let balances = [];
    let poolLength = parseInt(await query(chain, registry, autofarm.registryABI, 'poolLength', []));
    let vaults = [...Array(poolLength).keys()];
    // Balance Multicall Query:
    let calls = [];
    vaults.forEach(vaultID => {
        if (!ignoredVaults.includes(vaultID)) {
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
                // Curve Vaults:
                if (vaultID === 39 || vaultID === 40 || vaultID === 41 || vaultID === 66 || vaultID === 69) {
                    let newToken = await addCurveToken(chain, project, 'staked', token, balance, wallet);
                    balances.push(newToken);
                    // LP Token Vaults:
                }
                else if (symbol.includes('LP')) {
                    let newToken = await addLPToken(chain, project, 'staked', token, balance, wallet);
                    balances.push(newToken);
                    // Single-Asset Vaults:
                }
                else {
                    let newToken = await addToken(chain, project, 'staked', token, balance, wallet);
                    balances.push(newToken);
                }
            }
        }
    })());
    await Promise.all(promises);
    return balances;
};
