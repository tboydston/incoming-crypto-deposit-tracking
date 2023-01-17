const fs = require("fs");
const RequestManager = require("../lib/RequestManager");
const LogManager = require("../lib/LogManager");

const allConfigs = require("../config");

const coin = process.argv[2];
const config = allConfigs[coin];

(async () => {
  for (const coin in allConfigs) {
    const config = allConfigs[coin];
    const now = (Date.now() / 1000).toFixed(0);

    // Load log manager.
    try {
      lm = new LogManager(
        "monitorChains",
        coin,
        config.notifications.telegram.token,
        config.notifications.telegram.chatId,
        "Chain Monitoring"
      );
    } catch (e) {
      console.log(`Error loading log manager. Raw Error: ${e.message}`);
      continue;
    }

    // Check to make sure monitoring is enabled for this coin.
    if (config.chainMonitoring.enabled !== true) {
      lm.log(`Monitoring disabled for ${coin}`);
      continue;
    }

    // Check to see if lastBlock file exists for coin if not create it at 0.
    try {
      if (!fs.existsSync(`${__dirname}/../data/lastBlock-${coin}.txt`)) {
        fs.writeFileSync(`${__dirname}/../data/lastBlock-${coin}.txt`, "0");
      }
    } catch (e) {
      lm.log(
        `Error reading checking or creating last block file. Raw Error: ${e.message}`,
        true,
        true
      );
      continue;
    }

    let data = {};

    // Read file containing last block to determine which block we should look for new deposits from.
    try {
      let lastBlockResult = fs
        .readFileSync(`${__dirname}/../data/lastBlock-${coin}.txt`)
        .toString()
        .split(":");
      data.lastBlock = lastBlockResult[0];
      data.lastBlockScanTime = lastBlockResult[1];
    } catch (e) {
      lm.log(`Error loading last block. Raw Error: ${e.message}`, true, true);
      continue;
    }

    // Initiate RequestManager class used for making RPC and signed platform API requests.
    let requestManager = {};

    try {
      requestManager = new RequestManager(
        config.platform.address,
        config.platform.port,
        config.rpc.address,
        config.rpc.port,
        config.rpc.user,
        config.rpc.pass,
        "",
        ""
      );
    } catch (e) {
      lm.log(`Error loading request manager. Raw Error: ${e.message}`);
      return;
    }

    // Get block count from chain.
    try {
      hashResponse = await requestManager.rpc("getblockcount");
    } catch (e) {
      lm.log(`RPC server error. Raw Error: ${e.message}`, true, true);
      continue;
    }

    if (
      hashResponse.data.result == undefined ||
      hashResponse.data.error != null
    ) {
      lm.log(
        `RPC getblockcount malformed. Raw Response: ${JSON.stringify(
          hashResponse.data
        )}`,
        true,
        true
      );
      continue;
    }

    const newHighestBlock = hashResponse.data.result;
    const checkDurationMin = ((now - data.lastBlockScanTime) / 60).toFixed(0);
    const warningThreshold = (
      config.chainMonitoring.expectBlockPeriod / 60
    ).toFixed(0);

    // If the block number has not been changed within our expected block period we log and send a warning to TG.
    if (
      newHighestBlock <= data.lastBlock &&
      data.lastBlockScanTime < now - config.chainMonitoring.expectBlockPeriod
    ) {
      lm.log(
        `${coin} chain has not updated in over ${checkDurationMin} minute\\(s\\).`,
        true,
        true
      );
      continue;
    }

    // If the block number has not been changed but time between blocks is still less than the expected block period we log that we scanned but don't notify TG.
    if (newHighestBlock <= data.lastBlock) {
      lm.log(
        `${coin} chain has not updated in over ${checkDurationMin} minute\\(s\\). Within warning threshold of ${warningThreshold} minute\\(s\\). No notification sent.`,
        true,
        false
      );
      continue;
    }

    // There has been a new block so we update the block number and time to the data file.
    try {
      fs.writeFileSync(
        `${__dirname}/../data/lastBlock-${coin}.txt`,
        `${newHighestBlock.toString()}:${now}`
      );
      lm.log(`New ${coin} block: ${newHighestBlock.toString()}`, true, false);
    } catch (e) {
      lm.log(
        `Error writing last block. Check to make sure disk is not full. Raw Error: ${e.message}`,
        true,
        true
      );
      continue;
    }
  }
})();
