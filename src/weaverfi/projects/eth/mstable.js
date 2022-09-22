// Imports:
import { WeaverError } from '../../error';
import { minABI, mstable } from '../../ABIs';
import { addStableToken, addBalancerToken } from '../../project-functions';
import { query, multicallOneMethodQuery, addToken, addXToken, parseBN } from '../../functions';
// Initializations:
const chain = 'eth';
const project = 'mstable';
const imUSD = '0x30647a72dc82d7fbb1123ea74716ab8a317eac19';
const imBTC = '0x17d8CBB6Bce8cEE970a4027d1198F6700A7a6c24';
const imUSDVault = '0x78BefCa7de27d07DC6e71da295Cc2946681A6c7B';
const imBTCVault = '0xF38522f63f40f9Dd81aBAfD2B8EFc2EC958a3016';
const stakedMTA = '0x8f2326316eC696F6d023E37A9931c2b2C177a3D7';
const balStaking = '0xeFbe22085D9f29863Cfb77EEd16d3cC0D927b011';
const mta = '0xa3bed4e1c75d00fa6f4e5e6922db7261b5e9acd2';
const pools = [
    '0xfE842e95f8911dcc21c943a1dAA4bd641a1381c6',
    '0x4fB30C5A3aC8e85bC32785518633303C4590752d',
    '0x4eaa01974B6594C0Ee62fFd7FEE56CF11E6af936',
    '0x36f944b7312eac89381bd78326df9c84691d8a5b',
    '0x2F1423D27f9B20058d9D1843E342726fDF985Eb4',
    '0xc3280306b6218031e61752d060b091278d45c329',
    '0x48c59199Da51B7E30Ea200a74Ea07974e62C4bA7' // mBTC-HBTC
];
const vaults = [
    '0xD124B55f70D374F58455c8AEdf308E52Cf2A6207',
    '0xAdeeDD3e5768F7882572Ad91065f93BA88343C99',
    '0x0997dDdc038c8A958a3A3d00425C16f8ECa87deb',
    '0xF93e0ddE0F7C48108abbD880DB7697A86169f13b',
    '0xD24099Eb4CD604198071958655E4f2D263a5539B',
    '0x97e2a2f97a2e9a4cfb462a49ab7c8d205abb9ed9',
    '0xF65D53AA6e2E4A5f4F026e73cb3e22C22D75E35C' // mBTC-HBTC
];
/* ========================================================================================================================================================================= */
// Function to get project balance:
export const get = async (wallet) => {
    let balance = [];
    balance.push(...(await getAssetBalances(wallet).catch((err) => { throw new WeaverError(chain, project, 'getAssetBalances()', err); })));
    balance.push(...(await getPoolBalances(wallet).catch((err) => { throw new WeaverError(chain, project, 'getPoolBalances()', err); })));
    balance.push(...(await getVaultBalances(wallet).catch((err) => { throw new WeaverError(chain, project, 'getVaultBalances()', err); })));
    balance.push(...(await getStaked(wallet).catch((err) => { throw new WeaverError(chain, project, 'getStaked()', err); })));
    return balance;
};
/* ========================================================================================================================================================================= */
// Function to get asset balances:
export const getAssetBalances = async (wallet) => {
    let balances = [];
    // imUSD:
    let usdAssetBalance = parseInt(await query(chain, imUSD, minABI, 'balanceOf', [wallet]));
    if (usdAssetBalance > 0) {
        let decimals = parseInt(await query(chain, imUSD, minABI, 'decimals', []));
        let exchangeRate = parseInt(await query(chain, imUSD, mstable.assetABI, 'exchangeRate', [])) / (10 ** decimals);
        let token = await query(chain, imUSD, mstable.assetABI, 'underlying', []);
        let newToken = await addToken(chain, project, 'staked', token, usdAssetBalance * exchangeRate, wallet);
        balances.push(newToken);
    }
    // imBTC:
    let btcAssetBalance = parseInt(await query(chain, imBTC, minABI, 'balanceOf', [wallet]));
    if (btcAssetBalance > 0) {
        let decimals = parseInt(await query(chain, imBTC, minABI, 'decimals', []));
        let exchangeRate = parseInt(await query(chain, imBTC, mstable.assetABI, 'exchangeRate', [])) / (10 ** decimals);
        let token = await query(chain, imBTC, mstable.assetABI, 'underlying', []);
        let newToken = await addToken(chain, project, 'staked', token, btcAssetBalance * exchangeRate, wallet);
        balances.push(newToken);
    }
    // imUSD Vault:
    let usdVaultBalance = parseInt(await query(chain, imUSDVault, mstable.vaultABI, 'rawBalanceOf', [wallet]));
    if (usdVaultBalance > 0) {
        let decimals = parseInt(await query(chain, imUSD, minABI, 'decimals', []));
        let exchangeRate = parseInt(await query(chain, imUSD, mstable.assetABI, 'exchangeRate', [])) / (10 ** decimals);
        let token = await query(chain, imUSD, mstable.assetABI, 'underlying', []);
        let newToken = await addToken(chain, project, 'staked', token, usdVaultBalance * exchangeRate, wallet);
        balances.push(newToken);
        let rewards = parseInt(await query(chain, imUSDVault, mstable.vaultABI, 'earned', [wallet]));
        if (rewards > 0) {
            let newToken = await addToken(chain, project, 'unclaimed', mta, rewards, wallet);
            balances.push(newToken);
        }
    }
    // imBTC Vault:
    let btcVaultBalance = parseInt(await query(chain, imBTCVault, mstable.vaultABI, 'rawBalanceOf', [wallet]));
    if (btcVaultBalance > 0) {
        let decimals = parseInt(await query(chain, imBTC, minABI, 'decimals', []));
        let exchangeRate = parseInt(await query(chain, imBTC, mstable.assetABI, 'exchangeRate', [])) / (10 ** decimals);
        let token = await query(chain, imBTC, mstable.assetABI, 'underlying', []);
        let newToken = await addToken(chain, project, 'staked', token, btcVaultBalance * exchangeRate, wallet);
        balances.push(newToken);
        let rewards = parseInt(await query(chain, imBTCVault, mstable.vaultABI, 'earned', [wallet]));
        if (rewards > 0) {
            let newToken = await addToken(chain, project, 'unclaimed', mta, rewards, wallet);
            balances.push(newToken);
        }
    }
    return balances;
};
// Function to get pool balances:
export const getPoolBalances = async (wallet) => {
    let balances = [];
    // Balance Multicall Query:
    let multicallResults = await multicallOneMethodQuery(chain, pools, minABI, 'balanceOf', [wallet]);
    let promises = pools.map(pool => (async () => {
        let balanceResults = multicallResults[pool];
        if (balanceResults) {
            let balance = parseBN(balanceResults[0]);
            if (balance > 0) {
                let newToken = await addStableToken(chain, project, 'staked', pool, balance, wallet);
                balances.push(newToken);
            }
        }
    })());
    await Promise.all(promises);
    return balances;
};
// Function to get vault balances:
export const getVaultBalances = async (wallet) => {
    let balances = [];
    let mtaRewards = 0;
    // Balance Multicall Query:
    let multicallResults = await multicallOneMethodQuery(chain, vaults, mstable.vaultABI, 'rawBalanceOf', [wallet]);
    let promises = vaults.map(vault => (async () => {
        let balanceResults = multicallResults[vault];
        if (balanceResults) {
            let balance = parseBN(balanceResults[0]);
            if (balance > 0) {
                let lpToken = await query(chain, vault, mstable.vaultABI, 'stakingToken', []);
                let newToken = await addStableToken(chain, project, 'staked', lpToken, balance, wallet);
                balances.push(newToken);
                let rewards = parseInt(await query(chain, vault, mstable.vaultABI, 'earned', [wallet]));
                if (rewards > 0) {
                    mtaRewards += rewards;
                }
            }
        }
    })());
    await Promise.all(promises);
    if (mtaRewards > 0) {
        let newToken = await addToken(chain, project, 'unclaimed', mta, mtaRewards, wallet);
        balances.push(newToken);
    }
    return balances;
};
// Function to get staked balances:
export const getStaked = async (wallet) => {
    let balances = [];
    // MTA Staking:
    let mtaBalance = parseInt((await query(chain, stakedMTA, mstable.stakingABI, 'rawBalanceOf', [wallet]))[0]);
    if (mtaBalance > 0) {
        let newToken = await addXToken(chain, project, 'staked', stakedMTA, mtaBalance, wallet, mta, mtaBalance);
        balances.push(newToken);
        let mtaRewards = parseInt(await query(chain, stakedMTA, mstable.stakingABI, 'earned', [wallet]));
        if (mtaRewards > 0) {
            let newToken = await addToken(chain, project, 'unclaimed', mta, mtaRewards, wallet);
            balances.push(newToken);
        }
    }
    // Balancer LP Staking:
    let balBalance = parseInt((await query(chain, balStaking, mstable.stakingABI, 'rawBalanceOf', [wallet]))[0]);
    if (balBalance > 0) {
        let token = await query(chain, balStaking, mstable.stakingABI, 'STAKED_TOKEN', []);
        let newToken = await addBalancerToken(chain, project, 'staked', token, balBalance, wallet);
        balances.push(newToken);
        let mtaRewards = parseInt(await query(chain, balStaking, mstable.stakingABI, 'earned', [wallet]));
        if (mtaRewards > 0) {
            let newToken = await addToken(chain, project, 'unclaimed', mta, mtaRewards, wallet);
            balances.push(newToken);
        }
    }
    return balances;
};
