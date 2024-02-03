require("dotenv").config();
const axios = require("axios");
const Web3 = require("web3");
const TwitterApi = require("twitter-api-v2").default;

// Twitter and Web3 Setup
const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_APP_KEY,
  appSecret: process.env.TWITTER_APP_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

const web3 = new Web3(new Web3.providers.HttpProvider(process.env.INFURA_URL));
const verseTokenABI = require("./VerseTokenABI.json"); // Add your ABI JSON
const verseTokenAddress = "0x249cA82617eC3DfB2589c4c17ab7EC9765350a18";
const verseTokenContract = new web3.eth.Contract(
  verseTokenABI,
  verseTokenAddress
);
const flamethrowerGifUrl = "https://i.imgflip.com/8ef4jd.gif";

let lastKnownBalanceEth = 0;
let verseUsdRate = 0;
let lastProcessedBlock = 0;

async function fetchVerseUsdRate() {
  try {
    const response = await axios.get(
      "https://markets.api.bitcoin.com/rates/convertor/?q=USD&c=VERSE"
    );
    verseUsdRate = response.data.USD.rate;
  } catch (e) {
    console.error(`Error fetching USD rate: ${e.message}`);
  }
}

async function postTweet(message) {
  try {
    const tweet = await twitterClient.v2.tweet(message);
    return tweet.data.id; // Return the ID of the posted tweet
  } catch (e) {
    console.error(`Error posting tweet: ${e.message}`);
  }
}

async function fetchCirculatingSupply() {
  try {
    const response = await axios.get(
      "https://markets.api.bitcoin.com/coin/data/circulating?c=VERSE"
    );
    return parseFloat(response.data);
  } catch (e) {
    console.error(`Error fetching circulating supply: ${e.message}`);
    return null;
  }
}

async function handleTotalVerseBurned(inReplyToTweetId = null) {
    const nullAddress = "0x0000000000000000000000000000000000000000";
    const startBlock = 16129240; // Block when Verse token was created
    const totalSupply = 210e9; // 210 billion VERSE
    const circulatingSupply = await fetchCirculatingSupply();
  
    const transferEventsToNull = await verseTokenContract.getPastEvents(
      "Transfer",
      {
        fromBlock: startBlock,
        toBlock: "latest",
        filter: { to: nullAddress },
      }
    );
  
    const totalBurnedWei = transferEventsToNull.reduce(
      (sum, event) => sum + BigInt(event.returnValues.value),
      BigInt(0)
    );
    const totalBurnedEth = web3.utils.fromWei(totalBurnedWei.toString(), "ether");
    const totalBurnEvents = transferEventsToNull.length;
    const totalSupplyBurnedPercent = (totalBurnedEth / totalSupply) * 100;
    const circulatingSupplyBurnedPercent = circulatingSupply
      ? (totalBurnedEth / circulatingSupply) * 100
      : null;
  
    let tweetMessage = `** Total $VERSE Burned **\n🔥 Cumulative Verse Tokens Burned: ${totalBurnedEth.toFixed(2)} VERSE (~$${(totalBurnedEth * verseUsdRate).toFixed(2)} USD)\n`;
    tweetMessage += `🔥 Total Burn Events: ${totalBurnEvents}\n`;
    tweetMessage += `📊 % of Total Supply Burned: ${totalSupplyBurnedPercent.toFixed(4)}%\n`;
    if (circulatingSupplyBurnedPercent) {
      tweetMessage += `🌐 % of Circulating Supply Burned: ${circulatingSupplyBurnedPercent.toFixed(4)}%\n`;
    }
    tweetMessage += `👨‍🚀 Visit https://verse.bitcoin.com/burn for more stats`;
  
    if (inReplyToTweetId) {
      await twitterClient.v2.reply(tweetMessage, inReplyToTweetId);
    } else {
      await postTweet(tweetMessage);
    }
  }
  

async function handleTransfer(event) {
  await fetchVerseUsdRate();
  const valueWei = event.returnValues.value;
  const valueEth = Number(web3.utils.fromWei(valueWei, "ether"));

  const burnEngineBalanceWei = await verseTokenContract.methods
    .balanceOf("0x6b2a57dE29e6d73650Cb17b7710F2702b1F73CB8")
    .call();
  lastKnownBalanceEth = Number(
    web3.utils.fromWei(burnEngineBalanceWei, "ether")
  );

  const tweetMessage =
    `🚀 New $Verse Token Deposit: ${valueEth.toFixed(2)} VERSE (~$${(
      valueEth * verseUsdRate
    ).toFixed(2)} USD)\n` +
    `🔥 Current Burn Engine Balance: ${lastKnownBalanceEth.toFixed(
      2
    )} VERSE (~$${(lastKnownBalanceEth * verseUsdRate).toFixed(2)} USD)`;
  await postTweet(tweetMessage);
}

async function handleTokensBurned(event) {
  await fetchVerseUsdRate();
  const amountWei = event.returnValues.amount;
  const amountEth = web3.utils.fromWei(amountWei, "ether");

  const tweetMessage = `🔥💥 Tokens Burned: ${amountEth.toFixed(2)} VERSE (~$${(
    amountEth * verseUsdRate
  ).toFixed(2)} USD)\nThe burn engine's flames roar!`;
  const tweetId = await postTweet(tweetMessage);
  await handleTotalVerseBurned(tweetId); // Post in reply to the burn event
}

async function monitorEvents() {
  const nullAddress = "0x0000000000000000000000000000000000000000";

  while (true) {
    try {
      const latestBlock = await web3.eth.getBlockNumber();
      const fromBlock =
        lastProcessedBlock > 0 ? lastProcessedBlock + 1 : 18481385;

      if (fromBlock <= latestBlock) {
        // Monitor transfers to the burn engine address
        const transferEvents = await verseTokenContract.getPastEvents(
          "Transfer",
          {
            fromBlock: fromBlock,
            toBlock: "latest",
            filter: { to: "0x6b2a57dE29e6d73650Cb17b7710F2702b1F73CB8" }, // Burn engine address
          }
        );
        transferEvents.forEach((event) => handleTransfer(event));

        // Monitor transfers to the null address (token burns)
        const burnEvents = await verseTokenContract.getPastEvents("Transfer", {
          fromBlock: fromBlock,
          toBlock: "latest",
          filter: { to: nullAddress },
        });
        burnEvents.forEach((event) => handleTokensBurned(event)); // Reuse or modify handleTokensBurned function accordingly

        lastProcessedBlock = latestBlock;
      } else {
        console.log(`💤 No new events to process. Next check in 30 seconds.`);
      }

      await new Promise((resolve) => setTimeout(resolve, 30000));
    } catch (e) {
      console.error(`Error in event monitoring: ${e.message}`);
      await new Promise((resolve) => setTimeout(resolve, 60000));
    }
  }
}

async function startTwitterStream() {
  try {
    const stream = twitterClient.v2.stream("tweets/search/stream", {
      "tweet.fields": ["author_id", "conversation_id", "created_at", "text"],
    });

    stream.autoReconnect = true;
    stream.autoReconnectRetries = Infinity;

    stream.on(ETwitterStreamEvent.Data, async (tweet) => {
      if (tweet.data.text.includes("@burnengine_bot")) {
        await handleTotalVerseBurned(tweet.data.id);
      }
    });

    stream.on(ETwitterStreamEvent.Error, (error) => {
      console.error("Stream error:", error);
    });

    await stream.connect();
  } catch (e) {
    console.error(`Error in Twitter stream: ${e.message}`);
  }
}

async function initialize() {
  try {
    const balanceWei = await verseTokenContract.methods
      .balanceOf("0x6b2a57dE29e6d73650Cb17b7710F2702b1F73CB8")
      .call();
    lastKnownBalanceEth = web3.utils.fromWei(balanceWei, "ether");
    console.log(`Initial Burn Engine Balance: ${lastKnownBalanceEth} VERSE`);
    await fetchVerseUsdRate();

    lastProcessedBlock = await web3.eth.getBlockNumber();
    console.log(`Starting event monitoring from block: ${lastProcessedBlock}`);
    monitorEvents();
    // startTwitterStream();
  } catch (e) {
    console.error(`Error during initialization: ${e.message}`);
  }
}

initialize().catch(console.error);
