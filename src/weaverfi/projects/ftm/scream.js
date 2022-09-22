// Imports:
import { WeaverError } from '../../error';
import { minABI, scream } from '../../ABIs';
import { query, multicallComplexQuery, addToken, addDebtToken, addXToken, parseBN } from '../../functions';
// Initializations:
const chain = 'ftm';
const project = 'scream';
const controller = '0x260E596DAbE3AFc463e75B6CC05d8c46aCAcFB09';
const screamToken = '0xe0654C8e6fd4D733349ac7E09f6f23DA256bF475';
const xscream = '0xe3D17C7e840ec140a7A51ACA351a482231760824';
/* ========================================================================================================================================================================= */
// Function to get project balance:
export const get = async (wallet) => {
    let balance = [];
    balance.push(...(await getMarketBalances(wallet).catch((err) => { throw new WeaverError(chain, project, 'getMarketBalances()', err); })));
    balance.push(...(await getStakedSCREAM(wallet).catch((err) => { throw new WeaverError(chain, project, 'getStakedSCREAM()', err); })));
    return balance;
};
/* ========================================================================================================================================================================= */
// Function to get all market balances and debt:
export const getMarketBalances = async (wallet) => {
    let balances = [];
    let markets = await query(chain, controller, scream.controllerABI, 'getAllMarkets', []);
    // Market Balance Multicall Query:
    let abi = minABI.concat(scream.marketABI);
    let calls = [
        { reference: 'marketBalance', methodName: 'balanceOf', methodParameters: [wallet] },
        { reference: 'accountSnapshot', methodName: 'getAccountSnapshot', methodParameters: [wallet] }
    ];
    let multicallResults = await multicallComplexQuery(chain, markets, abi, calls);
    let promises = markets.map(market => (async () => {
        let marketResults = multicallResults[market];
        if (marketResults) {
            let marketBalanceResults = marketResults['marketBalance'];
            let accountSnapshotResults = marketResults['accountSnapshot'];
            if (marketBalanceResults && accountSnapshotResults) {
                let balance = parseBN(marketBalanceResults[0]);
                let debt = parseBN(accountSnapshotResults[2]);
                let exchangeRate = parseBN(accountSnapshotResults[3]);
                if (balance > 0 || debt > 0) {
                    let tokenAddress = await query(chain, market, scream.marketABI, 'underlying', []);
                    // Lending Balances:
                    if (balance > 0) {
                        let underlyingBalance = balance * (exchangeRate / (10 ** 18));
                        let newToken = await addToken(chain, project, 'lent', tokenAddress, underlyingBalance, wallet);
                        balances.push(newToken);
                    }
                    // Borrowing Balances:
                    if (debt > 0) {
                        let newToken = await addDebtToken(chain, project, tokenAddress, debt, wallet);
                        balances.push(newToken);
                    }
                }
            }
        }
    })());
    await Promise.all(promises);
    return balances;
};
// Function to get staked SCREAM balance:
export const getStakedSCREAM = async (wallet) => {
    let balance = parseInt(await query(chain, xscream, minABI, 'balanceOf', [wallet]));
    if (balance > 0) {
        let exchangeRate = parseInt(await query(chain, xscream, scream.stakingABI, 'getShareValue', [])) / (10 ** 18);
        let newToken = await addXToken(chain, project, 'unclaimed', xscream, balance, wallet, screamToken, balance * exchangeRate);
        return [newToken];
    }
    else {
        return [];
    }
};
