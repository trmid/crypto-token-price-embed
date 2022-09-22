// Imports:
import { WeaverError } from '../../error';
import { minABI, lydia } from '../../ABIs';
import { query, multicallOneContractQuery, multicallOneMethodQuery, addToken, addLPToken, parseBN } from '../../functions';
// Initializations:
const chain = 'avax';
const project = 'lydia';
const registry = '0xFb26525B14048B7BB1F3794F6129176195Db7766';
const autoLydFarm = '0xA456bB3a9905D56A9b40D6361EDA931ed52d5bED';
const lyd = '0x4C9B4E1AC6F24CdE3660D5E4Ef1eBF77C710C084';
const maximusFarms = [
    '0x036fa505E4D6358a772f578B4031c9AF1af5Bd1D',
    '0x7d0Cc15C9d3740E18a27064b8EFfE5EbAA7944e7',
    '0xdF5C8D10685cbdEA26fed99A3BB1142987345013',
    '0x07F9B7b1FeD6a71AF80AC85d1691A4EC0EBE370b',
    '0xad9aC72aAE3dB711CDcC9FD1142bE46742102354',
    '0x15eCF52152C15029557c89CD9CF9Cf148366BFDC',
    '0xeB3dDd62CF53199593811dae4653321Ce26Ec537'
];
/* ========================================================================================================================================================================= */
// Function to get project balance:
export const get = async (wallet) => {
    let balance = [];
    balance.push(...(await getFarmBalances(wallet).catch((err) => { throw new WeaverError(chain, project, 'getFarmBalances()', err); })));
    balance.push(...(await getAutoLYDFarmBalance(wallet).catch((err) => { throw new WeaverError(chain, project, 'getAutoLYDFarmBalance()', err); })));
    balance.push(...(await getMaximusFarmBalances(wallet).catch((err) => { throw new WeaverError(chain, project, 'getMaximusFarmBalances()', err); })));
    return balance;
};
/* ========================================================================================================================================================================= */
// Function to get all farm balances:
export const getFarmBalances = async (wallet) => {
    let balances = [];
    let farmCount = parseInt(await query(chain, registry, lydia.registryABI, 'poolLength', []));
    let farms = [...Array(farmCount).keys()];
    // User Info Multicall Query:
    let calls = [];
    farms.forEach(farmID => {
        calls.push({ reference: farmID.toString(), methodName: 'userInfo', methodParameters: [farmID, wallet] });
    });
    let multicallResults = await multicallOneContractQuery(chain, registry, lydia.registryABI, calls);
    let promises = farms.map(farmID => (async () => {
        let userInfoResults = multicallResults[farmID];
        if (userInfoResults) {
            let balance = parseBN(userInfoResults[0]);
            if (balance > 0) {
                let poolInfo = await query(chain, registry, lydia.registryABI, 'poolInfo', [farmID]);
                if (poolInfo.lpToken.toLowerCase() === lyd.toLowerCase()) {
                    let newToken = await addToken(chain, project, 'staked', poolInfo.lpToken, balance, wallet);
                    balances.push(newToken);
                }
                else {
                    let newToken = await addLPToken(chain, project, 'staked', poolInfo.lpToken, balance, wallet);
                    balances.push(newToken);
                }
                let rewards = await (query(chain, registry, lydia.registryABI, 'pendingLyd', [farmID, wallet]));
                if (rewards > 0) {
                    let newToken = await addToken(chain, project, 'unclaimed', lyd, rewards, wallet);
                    balances.push(newToken);
                }
            }
        }
    })());
    await Promise.all(promises);
    return balances;
};
// Function to get Auto LYD farm balance:
export const getAutoLYDFarmBalance = async (wallet) => {
    let shares = parseInt(await query(chain, autoLydFarm, lydia.lydFarmABI, 'sharesOf', [wallet]));
    if (shares > 0) {
        let exchangeRate = parseInt(await query(chain, autoLydFarm, lydia.lydFarmABI, 'getPricePerFullShare', [])) / (10 ** 18);
        let balance = shares * exchangeRate;
        let newToken = await addToken(chain, project, 'staked', lyd, balance, wallet);
        return [newToken];
    }
    else {
        return [];
    }
};
// Function to get Maximus farm balances:
export const getMaximusFarmBalances = async (wallet) => {
    let balances = [];
    // Balance Multicall Query:
    let multicallResults = await multicallOneMethodQuery(chain, maximusFarms, minABI, 'balanceOf', [wallet]);
    let promises = maximusFarms.map(farm => (async () => {
        let balanceResults = multicallResults[farm];
        if (balanceResults) {
            let balance = parseBN(balanceResults[0]);
            if (balance > 0) {
                let lpToken = await query(chain, farm, lydia.maximusFarmABI, 'stakingToken', []);
                let newToken = await addLPToken(chain, project, 'staked', lpToken, balance, wallet);
                balances.push(newToken);
                let rewards = parseInt(await query(chain, farm, lydia.maximusFarmABI, 'earned', [wallet]));
                if (rewards > 0) {
                    let newToken = await addToken(chain, project, 'unclaimed', lyd, rewards, wallet);
                    balances.push(newToken);
                }
            }
        }
    })());
    await Promise.all(promises);
    return balances;
};
