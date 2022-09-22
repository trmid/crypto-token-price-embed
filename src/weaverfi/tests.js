// Example Wallet:
const wallet = '0xbE4FeAE32210f682A41e1C41e3eaF4f8204cD29E';
// Example ABI:
const erc20TransferEventABI = [
    { "anonymous": false, "inputs": [
            { "indexed": true, "internalType": "address", "name": "from", "type": "address" },
            { "indexed": true, "internalType": "address", "name": "to", "type": "address" },
            { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }
        ], "name": "Transfer", "type": "event" }
];
/* ========================================================================================================================================================================= */
// Tests Function:
const tests = async () => {
    // Project Test:
    // let projectBalance = await weaver.OP.getProjectBalance(wallet, 'pooltogether');
    // console.log('🕷️ ~ projectBalance', projectBalance);
    /* ================================================== */
    // Chain-Specific Tests:
    // let allProjectBalances = await weaver.ETH.getAllProjectBalances(wallet);
    // console.log('🕷️ ~ allProjectBalances', allProjectBalances);
    // let walletBalance = await weaver.ETH.getWalletBalance(wallet);
    // console.log('🕷️ ~ walletBalance', walletBalance);
    // let nftBalance = await weaver.ETH.getNFTBalance(wallet);
    // console.log('🕷️ ~ nftBalance', nftBalance);
    // let walletCheck = weaver.ETH.isAddress(wallet);
    // console.log('🕷️ ~ walletCheck', walletCheck);
    // let txCount = await weaver.ETH.getTXCount(wallet);
    // console.log('🕷️ ~ txCount', txCount);
    // let projects = weaver.ETH.getProjects();
    // console.log('🕷️ ~ projects', projects);
    // let tokens = weaver.ETH.getTokens();
    // console.log('🕷️ ~ tokens', tokens);
    // let gasResult = await weaver.ETH.getGasEstimates();
    // console.log('🕷️ ~ gasResult', gasResult);
    /* ================================================== */
    // Query Tests:
    // let queryResult = parseInt(await weaver.ETH.query(chains['eth'].usdc, minABI, 'balanceOf', [wallet]));
    // console.log('🕷️ ~ queryResult', queryResult);
    // let queryBlocksResult = await weaver.ETH.queryBlocks(chains['eth'].usdc, erc20TransferEventABI, 'Transfer', 50000, [], 15083775, 15083778);
    // console.log('🕷️ ~ queryBlocksResult', queryBlocksResult);
    /* ================================================== */
    // Generic Tests:
    // let allChains = weaver.getAllChains();
    // console.log('🕷️ ~ allChains', allChains);
    // let allChainInfo = weaver.getAllChainInfo();
    // console.log('🕷️ ~ allChainInfo', allChainInfo);
    // let allProjects = weaver.getAllProjects();
    // console.log('🕷️ ~ allProjects', allProjects);
    // let allTokens = weaver.getAllTokens();
    // console.log('🕷️ ~ allTokens', allTokens);
    // let allBalances = await weaver.getAllBalances(wallet);
    // console.log('🕷️ ~ allBalances', allBalances);
    /* ================================================== */
    // Domain Name Tests:
    // let ensAddress = await weaver.ETH.resolveENS('ncookie.eth');
    // console.log('🕷️ ~ ensAddress', ensAddress);
    // let ensDomain = await weaver.ETH.lookupENS(wallet);
    // console.log('🕷️ ~ ensDomain', ensDomain);
    // let ensAvatar = await weaver.ETH.fetchAvatarENS('ncookie.eth');
    // console.log('🕷️ ~ ensAvatar', ensAvatar);
    /* ================================================== */
    // Token Pricing Tests:
    // let allTokenPrices = await weaver.getAllTokenPrices();
    // console.log('🕷️ ~ allTokenPrices', allTokenPrices);
    // let nativeTokenPrices = await weaver.getNativeTokenPrices();
    // console.log('🕷️ ~ nativeTokenPrices', nativeTokenPrices);
    // let prices = weaver.fetchPrices();
    // console.log('🕷️ ~ prices', prices);
    // let chainPrices = weaver.ETH.fetchPrices();
    // console.log('🕷️ ~ chainPrices', chainPrices);
    // let tokenPrices = await weaver.ETH.getTokenPrices();
    // console.log('🕷️ ~ tokenPrices', tokenPrices);
    // let tokenPrice = await weaver.ETH.getTokenPrice(defaultAddress, 18);
    // console.log('🕷️ ~ tokenPrice', tokenPrice);
};
/* ========================================================================================================================================================================= */
// Running Tests:
tests();
export {};
