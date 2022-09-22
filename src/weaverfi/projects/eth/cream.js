// Imports:
import { WeaverError } from '../../error';
import { minABI, cream } from '../../ABIs';
import { query, addToken } from '../../functions';
// Initializations:
const chain = 'eth';
const project = 'cream';
const staking = [
    '0x780F75ad0B02afeb6039672E6a6CEDe7447a8b45',
    '0xBdc3372161dfd0361161e06083eE5D52a9cE7595',
    '0xD5586C1804D2e1795f3FBbAfB1FBB9099ee20A6c',
    '0xE618C25f580684770f2578FAca31fb7aCB2F5945'
];
const creamToken = '0x2ba592f78db6436527729929aaf6c908497cb200';
/* ========================================================================================================================================================================= */
// Function to get project balance:
export const get = async (wallet) => {
    let balance = [];
    balance.push(...(await getStakedCREAM(wallet).catch((err) => { throw new WeaverError(chain, project, 'getStakedCREAM()', err); })));
    return balance;
};
/* ========================================================================================================================================================================= */
// Function to get staked CREAM balances:
export const getStakedCREAM = async (wallet) => {
    let balances = [];
    let promises = staking.map(address => (async () => {
        let balance = parseInt(await query(chain, address, minABI, 'balanceOf', [wallet]));
        if (balance > 0) {
            let newToken = await addToken(chain, project, 'staked', creamToken, balance, wallet);
            balances.push(newToken);
        }
        let earned = parseInt(await query(chain, address, cream.stakingABI, 'earned', [wallet]));
        if (earned > 0) {
            let newToken = await addToken(chain, project, 'unclaimed', creamToken, earned, wallet);
            balances.push(newToken);
        }
    })());
    await Promise.all(promises);
    return balances;
};
