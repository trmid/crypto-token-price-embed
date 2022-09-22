// Imports:
import { sushiswap } from '../../ABIs';
import { WeaverError } from '../../error';
import { query, multicallOneContractQuery, addToken, addLPToken, parseBN } from '../../functions';
// Initializations:
const chain = 'poly';
const project = 'sushiswap';
const masterChef = '0x0769fd68dFb93167989C6f7254cd0D766Fb2841F';
const sushi = '0x0b3f868e0be5597d5db7feb59e1cadbb0fdda50a';
/* ========================================================================================================================================================================= */
// Function to get project balance:
export const get = async (wallet) => {
    let balance = [];
    balance.push(...(await getFarmBalances(wallet).catch((err) => { throw new WeaverError(chain, project, 'getFarmBalances()', err); })));
    return balance;
};
/* ========================================================================================================================================================================= */
// Function to get farm balances:
export const getFarmBalances = async (wallet) => {
    let balances = [];
    let sushiRewards = 0;
    let farmCount = parseInt(await query(chain, masterChef, sushiswap.masterChefABI, 'poolLength', []));
    let farms = [...Array(farmCount).keys()];
    // User Info Multicall Query:
    let calls = [];
    farms.forEach(farmID => {
        calls.push({ reference: farmID.toString(), methodName: 'userInfo', methodParameters: [farmID, wallet] });
    });
    let multicallResults = await multicallOneContractQuery(chain, masterChef, sushiswap.masterChefABI, calls);
    let promises = farms.map(farmID => (async () => {
        let userInfoResults = multicallResults[farmID];
        if (userInfoResults) {
            let balance = parseBN(userInfoResults[0]);
            if (balance > 0) {
                let lpToken = await query(chain, masterChef, sushiswap.masterChefABI, 'lpToken', [farmID]);
                let newToken = await addLPToken(chain, project, 'staked', lpToken, balance, wallet);
                balances.push(newToken);
                // Pending SUSHI Rewards:
                let rewards = parseInt(await query(chain, masterChef, sushiswap.masterChefABI, 'pendingSushi', [farmID, wallet]));
                if (rewards > 0) {
                    sushiRewards += rewards;
                }
            }
        }
    })());
    await Promise.all(promises);
    if (sushiRewards > 0) {
        let newToken = await addToken(chain, project, 'unclaimed', sushi, sushiRewards, wallet);
        balances.push(newToken);
    }
    return balances;
};
