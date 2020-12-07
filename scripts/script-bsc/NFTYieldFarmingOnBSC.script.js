/// Using BSC testnet
const Web3 = require('web3');
//const web3 = new Web3('https://data-seed-prebsc-2-s1.binance.org:8545'); /// [Note]: Endpoing is the BSC testnet
const provider = new Web3.providers.HttpProvider('https://data-seed-prebsc-2-s1.binance.org:8545');
const web3 = new Web3(provider);

/// Openzeppelin test-helper
const { time } = require('@openzeppelin/test-helpers');

/// Artifact of smart contracts 
const NFTYieldFarming = artifacts.require("NFTYieldFarmingOnBSC");  /// on BSC
const NFTToken = artifacts.require("MockNFTToken");    /// As a NFT token (ERC721)
const LPToken = artifacts.require("BEP20LPToken");     /// As a LP token (BEP20)
//const LPToken = artifacts.require("MockLPToken");    /// As a LP token (ERC20)
const GovernanceToken = artifacts.require("BEP20GovernanceToken");  /// As a reward token and a governance token

/***
 * @dev - Execution COMMAND: 
 **/

/// Acccounts
let deployer;
let admin;
let user1;
let user2;
let user3;

/// Global contract instance
let nftYieldFarming;
let nftToken;
let lpToken;
let governanceToken;

/// Global variable for each contract addresses
let NFT_YIELD_FARMING;
let NFT_TOKEN;
let LP_TOKEN;
let GOVERNANCE_TOKEN;


///-----------------------------------------------
/// Execute all methods
///-----------------------------------------------

/// [Note]: For truffle exec (Remarks: Need to use module.exports)
module.exports = function(callback) {
    main().then(() => callback()).catch(err => callback(err));
};

async function main() {
    console.log("\n------------- Check state in advance -------------");
    await checkStateInAdvance();

    console.log("\n------------- Setup smart-contracts -------------");
    await setUpSmartContracts();
    await transferOwnershipToNFTYieldFarmingContract();

    console.log("\n------------- Preparation for tests in advance -------------");
    await preparationForTestsInAdvance();

    console.log("\n------------- Process of the NFT yield farming (in case all staked-LP tokens are not withdrawn) -------------");
    await currentBlock1();
    await addNewNFTPoolAsATarget();
    await stake10LPTokensAtBlock310();
    await stake20LPTokensAtBlock314();
    await stake30LPTokensAtBlock318();
    
    await currentBlock2();
    await totalSupplyOfGovernanceToken();
    await governanceTokenBalanceOfUser1();
    await governanceTokenBalanceOfanotherUsers();
    await governanceTokenBalanceOfNFTYieldFarmingOnBSCContract();
    await unstakeAndWithdraw();
}


///-----------------------------------------------
/// Methods
///-----------------------------------------------
async function checkStateInAdvance() {
    /// Assign addresses into global variables of wallets
    deployer = process.env.DEPLOYER_WALLET;
    admin = process.env.ADMIN_WALLET;
    user1 = process.env.USER_1_WALLET;
    user2 = process.env.USER_2_WALLET;
    user3 = process.env.USER_3_WALLET;
    console.log('=== deployer ===', deployer);
    console.log('=== admin ===', admin);
    console.log('=== user1 ===', user1);
    console.log('=== user2 ===', user2);
    console.log('=== user3 ===', user3);
}

async function setUpSmartContracts() {
    /// Assign the deployed-contract addresses on BSC testnet into each contracts
    console.log("Deploy the NFT token (ERC721) contract instance");
    // NFT_TOKEN = "0x1fa22E714E7F1012E6F438a89D89940B8f836B03";
    // nftToken = await NFTToken.at(NFT_TOKEN);
    nftToken = await NFTToken.new({ from: deployer });
    NFT_TOKEN = nftToken.address;

    console.log("Deploy the LP token (BEP20) contract instance");
    // LP_TOKEN = "0xa7ed98650d4C5EC7DDDA9394a68bDC257E4f1e75";
    // lpToken = await LPToken.at(LP_TOKEN);
    lpToken = await LPToken.new({ from: deployer });
    LP_TOKEN = lpToken.address;

    console.log("Deploy the Governance token (BEP20) contract instance");
    // GOVERNANCE_TOKEN = "0xf9Cd775feaE9E57E2675C04cB6F6aF3148097cC8";
    // governanceToken = await GovernanceToken.at(GOVERNANCE_TOKEN);
    governanceToken = await GovernanceToken.new({ from: deployer });
    GOVERNANCE_TOKEN = governanceToken.address;

    console.log("Deploy the NFTYieldFarming contract instance");
    /// [Note]: 100 per block farming rate starting at block 300 with bonus until block 1000
    const _devaddr = admin;  /// Admin address
    const _governanceTokenPerBlock = web3.utils.toWei("100", "ether");  /// [Note]: This unit is amount. Not blockNumber
    const _startBlock = "300";
    const _bonusEndBlock = "1000";

    nftYieldFarming = await NFTYieldFarming.new(GOVERNANCE_TOKEN, _devaddr, _governanceTokenPerBlock, _startBlock, _bonusEndBlock, { from: deployer });
    NFT_YIELD_FARMING = nftYieldFarming.address;

    /// Logs (each deployed-contract addresses)
    console.log('=== NFT_TOKEN ===', NFT_TOKEN);    
    console.log('=== LP_TOKEN ===', LP_TOKEN);
    console.log('=== GOVERNANCE_TOKEN ===', GOVERNANCE_TOKEN);
    console.log('=== NFT_YIELD_FARMING ===', NFT_YIELD_FARMING);  /// e.g. 0x28E0F63035Fb8beC5aA4D71163D3244585c9A054  
}

async function transferOwnershipToNFTYieldFarmingContract() {
    console.log("Transfer ownership of the Governance token (ERC20) contract to the NFTYieldFarming contract");
    const newOwner = NFT_YIELD_FARMING;
    const txReceipt = await governanceToken.transferOwnership(newOwner, { from: deployer });
}

async function preparationForTestsInAdvance() {
    console.log("Mint the NFT token (ERC721) to user1");
    const tokenURI = "https://testnft.example/token-id-8u5h2m.json";
    let txReceipt = await nftToken.mintTo(user1, tokenURI, { from: deployer });

    console.log("Transfer the LP token (BEP20) from deployer to 3 users");
    const amount = web3.utils.toWei('1000', 'ether');
    let txReceipt1 = await lpToken.transfer(user1, amount, { from: deployer });
    let txReceipt2 = await lpToken.transfer(user2, amount, { from: deployer });
    let txReceipt3 = await lpToken.transfer(user3, amount, { from: deployer });
}


///------------------------------
/// Process of NFT Yield Farming
///------------------------------
async function currentBlock1() {
    const currentBlock = await web3.eth.getBlockNumber();
    console.log('=== currentBlock 1 ===', String(currentBlock));
}

async function addNewNFTPoolAsATarget() {
    console.log("Add a new NFT Pool as a target");
    const _nftToken = NFT_TOKEN;  /// NFT token as a target to stake
    const _lpToken = LP_TOKEN;    /// LP token to be staked
    const _allocPoint = "100";
    const _withUpdate = true;
    let txReceipt = await nftYieldFarming.addNFTPool(_nftToken, _lpToken, _allocPoint, _withUpdate, { from: deployer });
}

async function stake10LPTokensAtBlock310() {
    console.log("Stake 10 LP tokens at block 310");
    /// [Note]: Block to mint the GovernanceToken start from block 300.
    /// User1 stake (deposit) 10 LP tokens at block 310.
    //await time.advanceBlockTo("309");

    const _nftPoolId = 0;
    const _stakeAmount = web3.utils.toWei('10', 'ether');  /// 10 LP Token
    let txReceipt1 = await lpToken.approve(NFT_YIELD_FARMING, _stakeAmount, { from: deployer });    /// [Result]: Success
    let txReceipt2 = await nftYieldFarming.deposit(_nftPoolId, _stakeAmount, { from: deployer });   /// [Result]: Success
    // let txReceipt1 = await lpToken.approve(NFT_YIELD_FARMING, _stakeAmount, { from: user1 });    /// [Result]: Fail
    // let txReceipt2 = await nftYieldFarming.deposit(_nftPoolId, _stakeAmount, { from: user1 });   /// [Result]: Fail
}

async function stake20LPTokensAtBlock314() {
    console.log("Stake 20 LP tokens at block 314");
    /// [Note]: Block to mint the GovernanceToken start from block 300.
    /// User2 stake (deposit) 20 LP tokens at block 314.
    //await time.advanceBlockTo("313");

    const _nftPoolId = 0;
    const _stakeAmount = web3.utils.toWei('20', 'ether');  /// 20 LP Token
    let txReceipt1 = await lpToken.approve(NFT_YIELD_FARMING, _stakeAmount, { from: deployer });
    let txReceipt2 = await nftYieldFarming.deposit(_nftPoolId, _stakeAmount, { from: deployer });
    // let txReceipt1 = await lpToken.approve(NFT_YIELD_FARMING, _stakeAmount, { from: user2 });
    // let txReceipt2 = await nftYieldFarming.deposit(_nftPoolId, _stakeAmount, { from: user2 });
}

async function stake30LPTokensAtBlock318() {
    console.log("Stake 30 LP tokens at block 318");
    /// [Note]: Block to mint the GovernanceToken start from block 300.
    /// User3 stake (deposit) 30 LPs at block 318
    //await time.advanceBlockTo("317");

    const _nftPoolId = 0;
    const _stakeAmount = web3.utils.toWei('30', 'ether');  /// 30 LP Token
    let txReceipt1 = await lpToken.approve(NFT_YIELD_FARMING, _stakeAmount, { from: deployer });
    let txReceipt2 = await nftYieldFarming.deposit(_nftPoolId, _stakeAmount, { from: deployer });
    // let txReceipt1 = await lpToken.approve(NFT_YIELD_FARMING, _stakeAmount, { from: user3 });
    // let txReceipt2 = await nftYieldFarming.deposit(_nftPoolId, _stakeAmount, { from: user3 });
}

async function stake10MoreLPTokensAtBlock320() {
    console.log("Stake 10 more LP tokens at block 320");
    /// [Note]: Block to mint the GovernanceToken start from block 300.
    /// User1 stake (deposit) 10 more LP tokens at block 320.
    //await time.advanceBlockTo("319");

    const _nftPoolId = 0;
    const _stakeAmount4 = web3.utils.toWei('10', 'ether');  /// 10 LP Token
    let txReceipt1 = await lpToken.approve(NFT_YIELD_FARMING, _stakeAmount, { from: deployer });
    let txReceipt2 = await nftYieldFarming.deposit(_nftPoolId, _stakeAmount, { from: deployer });
    // let txReceipt1 = await lpToken.approve(NFT_YIELD_FARMING, _stakeAmount, { from: user1 });
    // let txReceipt2 = await nftYieldFarming.deposit(_nftPoolId, _stakeAmount, { from: user1 });
}

async function currentBlock2() {
    console.log("Current block should be at block 321");
    const currentBlock = await web3.eth.getBlockNumber();
    console.log('=== currentBlock 2 ===', String(currentBlock));

    // let currentBlock = await time.latestBlock();
    // console.log('=== currentBlock ===', String(currentBlock));
    // assert.equal(
    //     currentBlock,
    //     "321",
    //     "Current block should be 321"
    // );
}

async function totalSupplyOfGovernanceToken() {
    console.log("Total Supply of the GovernanceToken should be 11000 (at block 321)");
    ///  At this point (At block 321): 
    ///      TotalSupply of GovernanceToken: 1000 * (321 - 310) = 11000
    ///      User1 should have: 4*1000 + 4*1/3*1000 + 2*1/6*1000 = 5666
    ///      NFTYieldFarming contract should have the remaining: 10000 - 5666 = 4334
    let totalSupplyOfGovernanceToken = await governanceToken.totalSupply();
    console.log('=== totalSupplyOfGovernanceToken ===', String(totalSupplyOfGovernanceToken));
    // assert.equal(
    //     Math.round(web3.utils.fromWei(totalSupplyOfGovernanceToken, 'ether')),
    //     11000,  /// [Note]: This is amount value rounded.
    //     "Total supply of the Governance tokens (at block 321) should be 11000"
    // );
}

async function governanceTokenBalanceOfUser1() {
    console.log("GovernanceToken balance of user1 should be 5667 (at block 321)");
    let governanceTokenBalanceOfUser1 = await governanceToken.balanceOf(user1, { from: user1 });
    console.log('=== GovernanceToken balance of user1 ===', String(governanceTokenBalanceOfUser1));
    // assert.equal(
    //     Math.round(web3.utils.fromWei(governanceTokenBalanceOfUser1, 'ether')),
    //     5667,  /// [Note]: This is amount value rounded.
    //     "GovernanceToken balance of user1 should be 5667 (at block 321)"
    // );
}

async function governanceTokenBalanceOfanotherUsers() {
    console.log("GovernanceToken balance of user2, user3, admin (at block 321)");
    let governanceTokenBalanceOfUser2 = await governanceToken.balanceOf(user2, { from: user2 });
    let governanceTokenBalanceOfUser3 = await governanceToken.balanceOf(user3, { from: user3 });
    let governanceTokenBalanceOfAdmin = await governanceToken.balanceOf(admin, { from: admin });
    console.log('=== GovernanceToken balance of user2 ===', String(governanceTokenBalanceOfUser2));
    console.log('=== GovernanceToken balance of user3 ===', String(governanceTokenBalanceOfUser3));
    console.log('=== GovernanceToken balance of admin ===', String(governanceTokenBalanceOfAdmin));
}

async function governanceTokenBalanceOfNFTYieldFarmingOnBSCContract() {
    console.log("GovernanceToken balance of the NFTYieldFarmingOnBSC contract should be 4333 (at block 321)");
    let governanceTokenBalance = await governanceToken.balanceOf(NFT_YIELD_FARMING, { from: user1 });
    console.log('=== GovernanceToken balance of the NFTYieldFarming contract ===', String(governanceTokenBalance));
    // assert.equal(
    //     Math.round(web3.utils.fromWei(governanceTokenBalance, 'ether')),
    //     4333,  /// [Note]: This is amount value rounded.
    //     "GovernanceToken balance of the NFTYieldFarming contract should be 4333 (at block 321)"
    // );
}

async function unstakeAndWithdraw() {
    console.log("Un-stake and withdraw 10 LP tokens and receive 5952 GovernanceToken as rewards (at block 322)");
    /// [Note]: Total LPs amount staked of user1 is 20 LP tokens at block 321.
    /// [Note]: Therefore, maximum withdraw amount for user1 is 20 LPs
    const _nftPoolId = 0;
    const _unStakeAmount = web3.utils.toWei('10', 'ether');  /// 10 LP Token
    let txReceipt = await nftYieldFarming.withdraw(_nftPoolId, _unStakeAmount, { from: deployer });
    //let txReceipt = await nftYieldFarming.withdraw(_nftPoolId, _unStakeAmount, { from: user1 });

    let governanceTokenBalanceOfUser1 = await governanceToken.balanceOf(user1, { from: user1 });
    console.log('=== GovernanceToken balance of user1 ===', String(governanceTokenBalanceOfUser1));
}
