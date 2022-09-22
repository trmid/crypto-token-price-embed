// Imports:
import { WeaverError } from '../../error';
import { minABI, venus } from '../../ABIs';
import { query, multicallComplexQuery, addToken, addDebtToken, parseBN, defaultAddress } from '../../functions';
// Initializations:
const chain = 'bsc';
const project = 'venus';
const controller = '0xfD36E2c2a6789Db23113685031d7F16329158384';
const vault = '0x0667eed0a0aab930af74a3dfedd263a73994f216';
const xvsVault = '0x051100480289e704d20e9DB4804837068f3f9204';
const vai = '0x4BD17003473389A42DAF6a0a729f6Fdb328BbBd7';
const xvs = '0xcF6BB5389c92Bdda8a3747Ddb454cB7a64626C63';
/* ========================================================================================================================================================================= */
// Function to get project balance:
export const get = async (wallet) => {
    let balance = [];
    balance.push(...(await getMarketBalances(wallet).catch((err) => { throw new WeaverError(chain, project, 'getMarketBalances()', err); })));
    balance.push(...(await getPendingRewards(wallet).catch((err) => { throw new WeaverError(chain, project, 'getPendingRewards()', err); })));
    balance.push(...(await getStakedVAI(wallet).catch((err) => { throw new WeaverError(chain, project, 'getStakedVAI()', err); })));
    balance.push(...(await getStakedXVS(wallet).catch((err) => { throw new WeaverError(chain, project, 'getStakedXVS()', err); })));
    return balance;
};
/* ========================================================================================================================================================================= */
// Function to get market balances:
export const getMarketBalances = async (wallet) => {
    let balances = [];
    let markets = await query(chain, controller, venus.controllerABI, 'getAllMarkets', []);
    // Market Balance Multicall Query:
    let abi = minABI.concat(venus.marketABI);
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
                    let exchangeRate = parseInt(await query(chain, market, venus.marketABI, 'exchangeRateStored', []));
                    let decimals = parseInt(await query(chain, market, minABI, 'decimals', []));
                    let underlyingToken = market.toLowerCase() === '0xa07c5b74c9b40447a954e1466938b865b6bbea36' ? defaultAddress : await query(chain, market, venus.marketABI, 'underlying', []);
                    let underlyingBalance = (balance / (10 ** decimals)) * (exchangeRate / (10 ** (decimals + 2)));
                    let newToken = await addToken(chain, project, 'lent', underlyingToken, underlyingBalance, wallet);
                    balances.push(newToken);
                }
            }
            // Borrowing Balances:
            if (borrowingResults) {
                let debt = parseBN(borrowingResults[0]);
                if (debt > 0) {
                    let underlyingToken = market.toLowerCase() === '0xa07c5b74c9b40447a954e1466938b865b6bbea36' ? defaultAddress : await query(chain, market, venus.marketABI, 'underlying', []);
                    let newToken = await addDebtToken(chain, project, underlyingToken, debt, wallet);
                    balances.push(newToken);
                }
            }
        }
    })());
    await Promise.all(promises);
    return balances;
};
// Function to get pending XVS rewards:
export const getPendingRewards = async (wallet) => {
    let rewards = parseInt(await query(chain, controller, venus.controllerABI, 'venusAccrued', [wallet]));
    if (rewards > 0) {
        let newToken = await addToken(chain, project, 'unclaimed', xvs, rewards, wallet);
        return [newToken];
    }
    else {
        return [];
    }
};
// Function to get staked VAI balance:
export const getStakedVAI = async (wallet) => {
    let balances = [];
    let balance = parseInt((await query(chain, vault, venus.vaultABI, 'userInfo', [wallet])).amount);
    if (balance > 0) {
        let newToken = await addToken(chain, project, 'staked', vai, balance, wallet);
        balances.push(newToken);
    }
    let pendingRewards = parseInt(await query(chain, vault, venus.vaultABI, 'pendingXVS', [wallet]));
    if (pendingRewards > 0) {
        let newToken = await addToken(chain, project, 'unclaimed', xvs, pendingRewards, wallet);
        balances.push(newToken);
    }
    return balances;
};
// Function to get staked XVS balance:
export const getStakedXVS = async (wallet) => {
    let xvsBalance = 0;
    let balance = parseInt(await query(chain, xvsVault, venus.xvsVaultABI, 'getUserInfo', [xvs, 0, wallet]));
    if (balance > 0) {
        xvsBalance += balance;
        let pendingRewards = parseInt(await query(chain, xvsVault, venus.xvsVaultABI, 'pendingReward', [xvs, 0, wallet]));
        if (pendingRewards > 0) {
            xvsBalance += pendingRewards;
        }
        let newToken = await addToken(chain, project, 'staked', xvs, xvsBalance, wallet);
        return [newToken];
    }
    else {
        return [];
    }
};
