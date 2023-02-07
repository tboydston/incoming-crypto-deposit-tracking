const crypto = require("crypto");
const fs = require("fs");

const LogError = require("../lib/LogError");

/*
 *   Compares wallet deposits with deposits on the platform. Inconsistencies will be logged and sent to Telegram directly.
 */
module.exports = async (options, config, requestManager, logManager) => {
  const { coin } = options;
  const { method } = options;

  let dataPath = `${__dirname}/../data/lastDepositBlock-${coin}.txt`;
  const data = {};

  let txs = [];
  const txData = [];
  let depositString = "";
  let chainHeight = 0;
  let highestBlock = 0;
  const pubKeyHash = crypto
    .createHash("sha256")
    .update(config.addressGen.xpub)
    .digest("hex");
  let noteNumber = 1;

  // Check if default file path is overridden.
  try {
    if (config.data.paths.lastDepositBlock !== undefined) {
      dataPath = config.data.paths.lastDepositBlock;
    }
  } catch (e) {} // eslint-disable-line

  // Read file containing last block to determine which block we should look for new deposits from.
  try {
    if (!fs.existsSync(dataPath)) {
      logManager.log(
        `Last block data file does not exists at ${dataPath}. Attempting to create it.`
      );
      fs.writeFileSync(dataPath, "0");
    }
    data.lastDepositBlock = fs.readFileSync(dataPath).toString();
  } catch (e) {
    throw new LogError(
      `Error loading last block file. Raw Error: ${e.message}`,
      true,
      true
    );
  }

  // Retrieve chain data so we can update chain height.
  try {
    const chainInfo = await requestManager.rpc("getblockchaininfo", []);
    if (chainInfo.data.result === undefined || chainInfo.data.error != null) {
      throw Error(`Malformed response: ${JSON.stringify(chainInfo.data)}`);
    }
    chainHeight = chainInfo.data.result.blocks;
  } catch (e) {
    throw new LogError(
      `RPC getblockchaininfo error. Raw Error: ${e.message}`,
      true,
      true
    );
  }

  // Convert the last deposit block number to a block hash which is required by the lastsinceblock RPC function.
  try {
    const hashResponse = await requestManager.rpc("getblockhash", [
      parseInt(data.lastDepositBlock, 10),
    ]);
    if (
      hashResponse.data.result === undefined ||
      hashResponse.data.error != null
    ) {
      throw Error(`Malformed response: ${JSON.stringify(hashResponse.data)}`);
    }
    data.lastHash = hashResponse.data.result;
  } catch (e) {
    throw new LogError(
      `RPC getblockhash error. Raw Error: ${e.message}`,
      true,
      true
    );
  }

  // Request transactions since last confirmed deposit.
  try {
    const txResponse = await requestManager.rpc("listsinceblock", [
      data.lastHash,
      1,
      true,
    ]);
    if (
      txResponse.data.result.transactions === undefined ||
      txResponse.data.error != null
    ) {
      throw Error(`Malformed response: ${JSON.stringify(txResponse.data)}`);
    }
    txs = txResponse.data.result.transactions;
  } catch (e) {
    throw new LogError(
      `RPC listsinceblock error. Raw Error: ${e.message}`,
      true,
      true
    );
  }

  if (txs.length === 0) {
    try {
      await requestManager.post(config.platform.routes.deposits, {
        coin,
        chainHeight,
        txData,
      });
      logManager.log(
        `Notified platform of new block. Chain Height: ${chainHeight}`,
        true,
        false
      );
    } catch (e) {
      throw new LogError(
        `Error sending new chain height data to platform. Confirm platform API is operating. Error Message: ${e.message}`,
        true,
        true
      );
    }
    throw new LogError(
      `No new transactions since block ${data.lastDepositBlock}`
    );
  }

  // Format transactions for platform and Telegram.
  txs.forEach((tx) => {
    if (tx.category !== "receive") return;

    // Build platform notification.
    txData.push({
      xPubHash: pubKeyHash,
      address: tx.address,
      amount: tx.amount,
      confirmations: tx.confirmations,
      block: tx.blockheight,
      txid: tx.txid,
    });

    // Build Telegram notification.
    if (
      (config.notifications.notifyTgOnConfirmations.includes(
        tx.confirmations
      ) &&
        ((method === "walletNotify" && tx.confirmations <= 1) ||
          (method === "blockNotify" && tx.confirmations > 1) ||
          method === "cli") &&
        method !== "silent") ||
      method === "notifyAll"
    ) {
      depositString += `Deposit ${noteNumber}
        Address: [${tx.address}](${config.explorer.address}${tx.address})
        Amount: ${tx.amount}
        Confirmations: ${tx.confirmations === undefined ? 0 : tx.confirmations}
        TxId: [${tx.txid}](${config.explorer.tx}${tx.txid})`;

      if (tx.blockheight === undefined) {
        depositString += `\n`;
      } else {
        depositString += `\nBlock: [${tx.blockheight}](${config.explorer.block}${tx.blockheight})\n`;
      }
    }

    // Find the highest block to track deposits from.
    if (
      tx.blockheight !== undefined &&
      tx.blockheight > highestBlock &&
      tx.confirmations >= config.notifications.watchUntil
    ) {
      highestBlock = tx.blockheight;
    }

    noteNumber += 1;
  });

  // Send deposit data to Telegram and console.
  if (txData.length > 0 && depositString !== "") {
    await logManager.log(
      `Incoming ${coin} Deposit\\(s\\): \n${depositString}`,
      true,
      true
    );
  }

  // Send deposit info to platform.
  try {
    await requestManager.post(config.platform.routes.deposits, {
      coin,
      chainHeight,
      txData,
    });
    logManager.log(
      `Notified platform of deposit. Deposit: ${JSON.stringify(txData)}`,
      true,
      false
    );
  } catch (e) {
    throw new LogError(
      `Error sending new deposits data to platform. Confirm platform API is operating. Error Message: ${e.message}`,
      true,
      true
    );
  }

  // Update last block number in file.
  if (highestBlock > 0) {
    try {
      fs.writeFileSync(dataPath, highestBlock.toString());
      logManager.log(
        `Last deposit block updated to ${highestBlock.toString()}`,
        true,
        false
      );
    } catch (e) {
      throw new LogError(
        `Error writing last deposit block. Check to make sure disk is not full. Error Message: ${e.message}`,
        true,
        true
      );
    }
  }
};
