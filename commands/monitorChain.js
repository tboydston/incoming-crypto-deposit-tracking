const fs = require("fs");
const LogMessage = require("../lib/LogMessage");

/**
 * Designed to be run periodically via crontab. Confirms RPC api's are functional and blocks are updating
 */
/* eslint-disable-next-line no-unused-vars */
module.exports = async (options, config, requestManager, logManager) => {
  const { coin } = options;
  let dataPath = `${__dirname}/../data/lastBlock-${coin}.txt`;
  const now = (Date.now() / 1000).toFixed(0);
  let hashResponse = {};
  const data = {};

  // Check to make sure monitoring is enabled for this coin.
  if (config.chainMonitoring.enabled !== true) {
    throw new LogMessage(`Monitoring disabled for ${coin}`);
  }

  // Check if default file path is overridden.
  try {
    dataPath = config.data.paths.lastBlock;
    /* eslint-disable-next-line */
  } catch {}

  // Check to see if lastBlock file exists for coin if not create it at 0.
  try {
    if (!fs.existsSync(dataPath)) {
      fs.writeFileSync(dataPath, "0:0");
    }
  } catch (e) {
    throw new LogMessage(
      `Error reading, checking, or creating last block file. Raw Error: ${e.message}`,
      true,
      true
    );
  }

  // Read file containing last block to determine which block we should look for new deposits from.
  try {
    const lastBlockResult = await fs
      .readFileSync(dataPath)
      .toString()
      .split(":");
    [data.lastBlock, data.lastBlockScanTime] = lastBlockResult;

    if (data.lastBlock === undefined || data.lastBlockScanTime === undefined) {
      throw Error(
        `lastBlock or lastBlockScanTime in invalid format in the ${dataPath} file. lastBlock: ${data.lastBlock}, lastBlockScanTime: ${data.lastBlockScanTime}`
      );
    }
  } catch (e) {
    throw new LogMessage(
      `Error loading last block. Raw Error: ${e.message}`,
      true,
      true
    );
  }

  // Get block count from chain.
  try {
    hashResponse = await requestManager.rpc("getblockcount");
  } catch (e) {
    throw new LogMessage(
      `RPC server error. Raw Error: ${e.message}`,
      true,
      true
    );
  }

  if (
    hashResponse.data.result === undefined ||
    hashResponse.data.error != null
  ) {
    throw new LogMessage(
      `RPC getblockcount malformed. Raw Response: ${JSON.stringify(
        hashResponse.data
      )}`,
      true,
      true
    );
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
    throw new LogMessage(
      `${coin} chain has not updated in over ${checkDurationMin} minute\\(s\\). Exceeding warning threshold of ${warningThreshold} minute\\(s\\). No notification sent.`,
      true,
      true
    );
  }

  // If the block number has not been changed but time between blocks is still less than the expected block period we log that we scanned but don't notify TG.
  if (newHighestBlock <= data.lastBlock) {
    throw new LogMessage(
      `${coin} chain has not updated in over ${checkDurationMin} minute\\(s\\). Within warning threshold of ${warningThreshold} minute\\(s\\). No notification sent.`,
      true,
      false
    );
  }

  // There has been a new block so we update the block number and time to the data file.
  try {
    fs.writeFileSync(dataPath, `${newHighestBlock.toString()}:${now}`);
  } catch (e) {
    throw new LogMessage(
      `Error writing last block. Check to make sure disk is not full. Raw Error: ${e.message}`,
      true,
      true
    );
  }

  throw new LogMessage(
    `New ${coin} block: ${newHighestBlock.toString()}`,
    true,
    false
  );
};
