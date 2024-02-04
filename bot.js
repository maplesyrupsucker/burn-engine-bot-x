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

function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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

  let tweetMessage = `🔥 Cumulative Verse Tokens Burned: ${totalBurnedEth.toFixed(
    2
  )} $VERSE (~$${(totalBurnedEth * verseUsdRate).toFixed(2)} USD)\n`;
  tweetMessage += `🔥 Total Burn Events: ${totalBurnEvents}\n`;
  tweetMessage += `📊 % of Total Supply Burned: ${totalSupplyBurnedPercent.toFixed(
    4
  )}%\n`;
  if (circulatingSupplyBurnedPercent) {
    tweetMessage += `🌐 % of Circulating Supply Burned: ${circulatingSupplyBurnedPercent.toFixed(
      4
    )}%\n`;
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
    `🚀 $Verse Burn Engine Deposit Detected: ${numberWithCommas(
      valueEth.toFixed(2)
    )} VERSE (~$${numberWithCommas(
      (valueEth * verseUsdRate).toFixed(2)
    )} USD)\n` +
    `🔥 Current Burn Engine Balance: ${numberWithCommas(
      lastKnownBalanceEth.toFixed(2)
    )} VERSE (~$${numberWithCommas(
      (lastKnownBalanceEth * verseUsdRate).toFixed(2)
    )} USD)\n` +
    `👨‍🚀 Want to burn all $VERSE in the burn engine? Spend 10,000 VERSE at verse.bitcoin.com/burn to ignite the engine!`;
  await postTweet(tweetMessage);
}

const burnMessages = [
  "🔥 $VERSE is ablaze with another burn!",
  "💥 The burn engine roars with $VERSE energy!",
  "🚀 $VERSE just got hotter with this burn!",
  "🔥 Feel the heat? That's another $VERSE burn!",
  "💥 Boom! Another batch of $VERSE bites the dust!",
  "🚀 Blazing through $VERSE with another fiery burn!",
  "🔥 The $VERSE furnace is burning bright!",
  "💥 A scorching $VERSE burn just took place!",
  "🚀 Rockets ignited! $VERSE is burning up!",
  "🔥 $VERSE just fueled the flames of the burn engine!",
  "💥 $VERSE inferno! Another burn executed!",
  "🚀 Blast off! $VERSE burn is a go!",
  "🔥 $VERSE incineration in progress!",
  "💥 Sizzling hot! $VERSE burn achieved!",
  "🚀 Up in flames! Another $VERSE burn completed!",
  "🔥 The $VERSE pyre blazes once more!",
  "💥 Feel the burn! $VERSE is at it again!",
  "🚀 $VERSE burn-off: Spectacular and fiery!",
  "🔥 Turning up the heat with $VERSE!",
  "💥 Flare-up detected in the $VERSE burn engine!",
  "🚀 Another $VERSE combustion, brilliantly done!",
  "🔥 $VERSE is sizzling away in the burn chamber!",
  "💥 Sparking a $VERSE blaze with this burn!",
  "🚀 The $VERSE flame dances with another burn!",
  "🔥 $VERSE burn: a fiery spectacle!",
];

// Randomly select a message
function getRandomBurnMessage() {
  const randomIndex = Math.floor(Math.random() * burnMessages.length);
  return burnMessages[randomIndex];
}

async function handleTokensBurned(event) {
  await fetchVerseUsdRate();
  const amountWei = event.returnValues.amount;
  // Use string representation to handle large numbers
  const amountEth = web3.utils.fromWei(amountWei.toString(), "ether");
  const tweetMessage = `🔥💥 Verse Burn Detected: ${parseFloat(
    amountEth
  ).toFixed(2)} VERSE (~$${(parseFloat(amountEth) * verseUsdRate).toFixed(
    2
  )} USD)\n${getRandomBurnMessage()}`;

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
