// Imports:
import { WeaverError } from '../../error';
import { minABI, benqi } from '../../ABIs';
import { query, multicallComplexQuery, addToken, addDebtToken, parseBN, defaultAddress } from '../../functions';
// Initializations:
const chain = 'avax';
const project = 'benqi';
const controller = '0x486Af39519B4Dc9a7fCcd318217352830E8AD9b4';
/* ========================================================================================================================================================================= */
// Function to get project balance:
export const get = async (wallet) => {
    let balance = [];
    balance.push(...(await getMarketBalances(wallet).catch((err) => { throw new WeaverError(chain, project, 'getMarketBalances()', err); })));
    return balance;
};
/* ========================================================================================================================================================================= */
// Function to get all market balances and debt:
export const getMarketBalances = async (wallet) => {
    let balances = [];
    let markets = await query(chain, controller, benqi.controllerABI, 'getAllMarkets', []);
    // Market Balance Multicall Query:
    let abi = minABI.concat(benqi.marketABI);
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
                    let tokenAddress = market.toLowerCase() === '0x5c0401e81bc07ca70fad469b451682c0d747ef1c' ? defaultAddress : await query(chain, market, benqi.marketABI, 'underlying', []);
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
