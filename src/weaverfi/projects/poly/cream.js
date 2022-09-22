// Imports:
import { WeaverError } from '../../error';
import { minABI, cream } from '../../ABIs';
import { query, multicallComplexQuery, addToken, addDebtToken, parseBN } from '../../functions';
// Initializations:
const chain = 'poly';
const project = 'cream';
const controller = '0x20CA53E2395FA571798623F1cFBD11Fe2C114c24';
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
    let markets = await query(chain, controller, cream.controllerABI, 'getAllMarkets', []);
    // Market Balance Multicall Query:
    let abi = minABI.concat(cream.tokenABI);
    let calls = [
        { reference: 'marketBalance', methodName: 'balanceOf', methodParameters: [wallet] },
        { reference: 'borrowBalance', methodName: 'borrowBalanceStored', methodParameters: [wallet] }
    ];
    let multicallResults = await multicallComplexQuery(chain, markets, abi, calls);
    let promises = markets.map(market => (async () => {
        let marketResults = multicallResults[market];
        if (marketResults) {
            let marketBalanceResults = marketResults['marketBalance'];
            let borrowingResults = marketResults['borrowBalance'];
            // Lending Balances:
            if (marketBalanceResults) {
                let balance = parseBN(marketBalanceResults[0]);
                if (balance > 0) {
                    let exchangeRate = parseInt(await query(chain, market, cream.tokenABI, 'exchangeRateStored', []));
                    let decimals = parseInt(await query(chain, market, minABI, 'decimals', []));
                    let tokenAddress = await query(chain, market, cream.tokenABI, 'underlying', []);
                    let underlyingBalance = (balance / (10 ** decimals)) * (exchangeRate / (10 ** (decimals + 2)));
                    let newToken = await addToken(chain, project, 'lent', tokenAddress, underlyingBalance, wallet);
                    balances.push(newToken);
                }
            }
            // Borrowing Balances:
            if (borrowingResults) {
                let debt = parseBN(borrowingResults[0]);
                if (debt > 0) {
                    let tokenAddress = await query(chain, market, cream.tokenABI, 'underlying', []);
                    let newToken = await addDebtToken(chain, project, tokenAddress, debt, wallet);
                    balances.push(newToken);
                }
            }
        }
    })());
    await Promise.all(promises);
    return balances;
};
