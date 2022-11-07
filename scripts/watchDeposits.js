const fs = require("fs");
const crypto = require("crypto");
const RequestManager = require("../lib/RequestManager");
const LogManager = require("../lib/LogManager");

const allConfigs = require("../config");

const coin = process.argv[2];
const config = allConfigs[coin];

let method = process.argv[3];

(async () => {
  if (coin === undefined) {
    console.log("Coin must be defined. Example: node watchDeposits.js BTC");
  }

  if (method === undefined) {
    method = "notifyAll";
  }

  // Load log manager.
  try {
    lm = new LogManager(
      "watchDeposits",
      coin,
      config.notifications.telegram.token,
      config.notifications.telegram.chatId,
      "Watch Deposits"
    );
  } catch (e) {
    console.log(`Error loading log manager. Raw Error: ${e.message}`);
    return;
  }

  // Load keys used for signing requests to remote server.
  try {
    config.keys = {};
    config.keys.pub = fs.readFileSync(
      `${__dirname}/../keys/${config.keyFiles.pub}`
    );
    config.keys.priv = fs.readFileSync(
      `${__dirname}/../keys/${config.keyFiles.priv}`
    );
  } catch (e) {
    lm.log(`Error loading signing keys. Raw Error: ${e.message}`, true, true);
    return;
  }

  // Check to see if lastDepositBlock file exists for coin if not create it at 0.
  try {
    if (!fs.existsSync(`${__dirname}/../data/lastDepositBlock-${coin}.txt`)) {
      fs.writeFileSync(
        `${__dirname}/../data/lastDepositBlock-${coin}.txt`,
        "0"
      );
    }
  } catch (e) {
    lm.log(
      `Error reading checking or creating last block file. Raw Error: ${e.message}`,
      true,
      true
    );
    return;
  }

  let data = {};

  // Read file containing last block to determine which block we should look for new deposits from.
  try {
    data.lastDepositBlock = fs
      .readFileSync(`${__dirname}/../data/lastDepositBlock-${coin}.txt`)
      .toString();
  } catch (e) {
    lm.log(`Error loading last block. Raw Error: ${e.message}`, true, true);
    return;
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
      config.keys.priv,
      config.keys.pub
    );
  } catch (e) {
    lm.log(
      `Error loading request manager. Raw Error: ${e.message}`,
      true,
      true
    );
    return;
  }

  // Convert the last deposit block number to a block hash which is required by the lastsinceblock RPC function.
  let hashResponse = {};

  try {
    hashResponse = await requestManager.rpc("getblockhash", [
      parseInt(data.lastDepositBlock),
    ]);
  } catch (e) {
    lm.log(`RPC server error. Raw Error: ${e.message}`, true, true);
    return;
  }

  if (
    hashResponse.data.result == undefined ||
    hashResponse.data.error != null
  ) {
    lm.log(
      `RPC getblockhash malformed. Raw Response: ${JSON.stringify(
        hashResponse.data
      )}`,
      true,
      true
    );
    return;
  }

  data.lastHash = hashResponse.data.result;

  let txResponse = {};

  // Request transactions since last confirmed deposit.
  try {
    txResponse = await requestManager.rpc("listsinceblock", [
      data.lastHash,
      1,
      true,
    ]);
  } catch (e) {
    lm.log(`RPC server error. Raw Error: ${e.message}`, true, true);
    return;
  }

  if (txResponse.data.result.transactions == undefined) {
    lm.log(
      `RPC listsinceblock malformed. Raw Response: ${JSON.stringify(
        txResponse.data
      )}`,
      true,
      true
    );
    return;
  }

  const txs = txResponse.data.result.transactions;

  if (txs.length == 0) {
    lm.log(`No new transactions since block ${data.lastDepositBlock}`);
    return;
  }

  let txData = [];
  let depositString = "";
  let heighestBlock = 0;
  let pubKeyHash = crypto
    .createHash("sha256")
    .update(config.addressGen.xpub)
    .digest("hex");
  let noteNumber = 1;

  // Format transactions for platform.
  txs.forEach((tx) => {
    if (tx.category !== "receive") return;

    txData.push({
      xPubHash: pubKeyHash,
      address: tx.address,
      amount: tx.amount,
      confirmations: tx.confirmations,
      block: tx.blockheight,
      txid: tx.txid,
    });

    // Check to see if we should send a notification about this transaction.
    if (
      (tx.confirmations === 0 && config.notifications.unconfirmed) ||
      (method === "blockNotify" &&
        tx.confirmations === 1 &&
        config.notifications.confirmed) ||
      (tx.confirmations === config.notifications.when &&
        tx.confirmations > 1) ||
      method === "notifyAll"
    ) {
      depositString += `Deposit ${noteNumber}
            Address: [${tx.address}](${config.explorer.address}${tx.address})
            Amount: ${tx.amount}
            Confirmations: ${
              tx.confirmations === undefined ? 0 : tx.confirmations
            }
            TxId: [${tx.txid}](${config.explorer.tx}${tx.txid})`;

      if (tx.blockheight === undefined) {
        depositString += `\n`;
      } else {
        depositString += `\nBlock: [${tx.blockheight}](${config.explorer.block}${tx.blockheight})\n`;
      }
    }

    // Find the highest block to track deposits from.
    if (
      tx.blockheight != undefined &&
      tx.blockheight > heighestBlock &&
      tx.confirmations >= config.notifications.watchUntil
    ) {
      heighestBlock = tx.blockheight;
    }

    noteNumber++;
  });

  if (txData.length > 0 && depositString.length !== 0) {
    lm.log(`Incoming ${coin} Deposit\\(s\\): \n${depositString}`, true, true);
  }

  // Send deposit info to platform.
  try {
    remoteResponse = await requestManager.post(
      config.platform.routes.deposits,
      {
        coin,
        txData,
      }
    );
    lm.log(
      `Notified platform of deposit. Deposit: ${JSON.stringify(txData)}`,
      true,
      false
    );
  } catch (e) {
    lm.log(
      `Error sending deposits to platform for TXID: ${tx.txid} . Confirm platform API is operating. Raw Error: ${e.message}`,
      true,
      true
    );
    return;
  }

  // Only unconfirmed transactions were found so we don't reset the highest block.
  if (heighestBlock == 0) return;

  // Update last block number in file.
  try {
    fs.writeFileSync(
      `${__dirname}/../data/lastDepositBlock-${coin}.txt`,
      heighestBlock.toString()
    );
    lm.log(
      `Last deposit block updated to ${heighestBlock.toString()}`,
      true,
      false
    );
  } catch (e) {
    lm.log(
      `Error writing last deposit block. Check to make sure disk is not full. Raw Error: ${e.message}`,
      true,
      true
    );
    return;
  }
})();
