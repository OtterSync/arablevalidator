const Web3 = require('web3');
const BigNumber = require('bignumber.js')
const { bsc_url } = require('../../../../config/config.rpc');
const {
  busd_abi,
  bnb_abi,
  busdPrice_abi,
  bnbPrice_abi,
  busdBNB_abi,
  mainFarmContract_abi,
} = require('../../libs/abis');
const {
  panCakeFarmAddress,
  busdBNBAddress,
  busdAddress,
  bnbAddress,
  priceFeedBNBAddress,
  priceFeedBusdAddress,
} = require('../../libs/address');
const {
  calculateLpTokenPrice,
} = require('../../utils/calculatingLpTokenPrice');
const web3 = new Web3(bsc_url); 

async function pancakswap_busd_bnb_collector() {
  try {
    const poolContract = new web3.eth.Contract(busdBNB_abi, busdBNBAddress);
    const busdContract = new web3.eth.Contract(busd_abi, busdAddress);
    const bnbContract = new web3.eth.Contract(bnb_abi, bnbAddress);
    const priceBusdContract = new web3.eth.Contract(
      busdPrice_abi,
      priceFeedBusdAddress
    );
    const mainFarmContract = new web3.eth.Contract(
      mainFarmContract_abi,
      panCakeFarmAddress
    );
    const priceBNBContract = new web3.eth.Contract(
      bnbPrice_abi,
      priceFeedBNBAddress
    );
    //live price Of bnb
    const bnbPriceRoundData = await priceBNBContract.methods
      .latestRoundData()
      .call();
    const bnbPriceRoundAnswer = await bnbPriceRoundData.answer;
    const bnbPriceDecimals = await priceBNBContract.methods.decimals().call();
    const bnbPrice =
     new BigNumber(await bnbPriceRoundAnswer).div(new BigNumber(Math.pow(10, bnbPriceDecimals)));
    //live Price of busd
    const busdPriceRoundData = await priceBusdContract.methods
      .latestRoundData()
      .call();
    const busdPriceRoundAnswer = await busdPriceRoundData.answer;
    const busdPriceDecimals = await priceBusdContract.methods.decimals().call();
    const busdPrice =
     new BigNumber(await busdPriceRoundAnswer).div(new BigNumber(Math.pow(10, busdPriceDecimals)));
    //total supply of the pool
    const totalSupplyPool = await poolContract.methods.totalSupply().call();
    const totalSupplyDecimals = await poolContract.methods.decimals().call();
    const totalSupply =
     new BigNumber(await totalSupplyPool).div(new BigNumber(Math.pow(10, totalSupplyDecimals)));
    // Getting total number of busd and bnb in pool
    const busdDecimals = await busdContract.methods.decimals().call();
    const bnbDecimals = await bnbContract.methods.decimals().call();
    const reserves = await poolContract.methods.getReserves().call();
    const totalBusd = new BigNumber(await reserves[0]).div(new BigNumber(Math.pow(10, busdDecimals)));
    const totalBnb = new BigNumber(await reserves[1]).div(new BigNumber(Math.pow(10, bnbDecimals)));
    //calculating total liquidity
    const lpTokenPrice = await calculateLpTokenPrice(
      totalBusd,
      busdPrice,
      totalBnb,
      bnbPrice,
      totalSupply
    );
    //Reward mechanism
    const poolInfo = await mainFarmContract.methods.poolInfo(252).call();
    const poolAllocation = await poolInfo.allocPoint;
    const totalAllocPoint = await mainFarmContract.methods
      .totalAllocPoint()
      .call();
    let rewardsPerBlock = await mainFarmContract.methods
      .cakePerBlock()
      .call();
    const cakeEmissionPerBlock = web3.utils.fromWei(rewardsPerBlock,'ether');
    const poolRewardsPerBlock =
      (new BigNumber(poolAllocation).div(new BigNumber(totalAllocPoint))).times(new BigNumber(cakeEmissionPerBlock));
    //console.log(`BNB price ${bnbPrice}. Busd Price ${busdPrice}. Total Cake emission per block: ${cakeEmissionPerBlock}. Cake allocated to busd/BNB pool: ${poolRewardsPerBlock}.`)

    return {
      bnbPrice,
      busdPrice,
      busdBnbLpTokenPrice: lpTokenPrice,
      poolCakeRewardsPerBlock: poolRewardsPerBlock,
    };
  } catch (error) {
    console.log(error);
  }
}

exports.pancakswap_busd_bnb_collector = pancakswap_busd_bnb_collector;
