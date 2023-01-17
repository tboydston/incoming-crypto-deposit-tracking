const crypto = require("crypto");

const LogError = require("../lib/LogError");

module.exports = async (options, config, requestManager, logManager) => {
  const { coin } = options;
  const { startBlock } = options;
  const { endBlock } = options;

  let hashResponse = {};
  let walletResponse = {};

  // Build request to platform for addresses within a certain range associated with a public key.
  const pubKeyHash = crypto
    .createHash("sha256")
    .update(config.addressGen.xpub)
    .digest("hex");

  const requestData = {
    xPubHash: pubKeyHash,
    startBlock,
    endBlock,
  };

  let platformTxs = {};

  try {
    const platformResponse = await requestManager.post(
      config.platform.routes.validateDeposits,
      requestData
    );
    platformTxs = platformResponse.data.data.deposits;
  } catch (e) {
    throw new LogError(
      `Platform server error. Raw Error: ${e.message}`,
      true,
      true
    );
  }

  // Convert the last deposit block number to a block hash which is required by the lastsinceblock RPC function.
  try {
    hashResponse = await requestManager.rpc("getblockhash", [startBlock]);
    if (
      hashResponse.data.result === undefined ||
      hashResponse.data.error != null
    ) {
      throw Error(
        `RPC getblockhash malformed. Raw Response: ${JSON.stringify(
          hashResponse.data
        )}`,
        true,
        true
      );
    }
  } catch (e) {
    throw new LogError(`RPC server error. Raw Error: ${e.message}`, true, true);
  }

  // Request transactions since last confirmed deposit.
  try {
    walletResponse = await requestManager.rpc("listsinceblock", [
      hashResponse.data.result,
      1,
      true,
    ]);
    if (
      walletResponse.data.result === undefined ||
      walletResponse.data.error != null
    ) {
      throw Error(
        `RPC getblockhash malformed. Raw Response: ${JSON.stringify(
          walletResponse.data
        )}`,
        true,
        true
      );
    }
  } catch (e) {
    throw new LogError(`RPC server error. Raw Error: ${e.message}`, true, true);
  }

  const walletTxs = walletResponse.data.result.transactions;

  let inconsistencies = "";

  // Compare wallet TXs to platform TXs to look for inconsistencies.
  walletTxs.forEach((walletTx) => {
    if (walletTx.blockheight > endBlock) {
      return;
    }

    // Confirm TX exists on platform.
    if (platformTxs[walletTx.txid] === undefined) {
      inconsistencies += `Wallet ${coin} tx ${walletTx.txid} in block ${walletTx.blockheight} missing on platform, `;
      return;
    }

    // Confirm deposit exists in tx.
    const depsInTx = platformTxs[walletTx.txid];

    if (depsInTx[walletTx.address] === undefined) {
      inconsistencies += `Wallet deposit to address ${walletTx.address} for ${walletTx.amount} ${coin} in tx ${walletTx.txid} in block ${walletTx.blockheight} missing on platform, `;
      return;
    }

    // Confirm amount of each deposit is equal.
    const depositAmount = depsInTx[walletTx.address];

    if (depositAmount !== walletTx.amount) {
      inconsistencies += `Wallet deposit to address ${walletTx.address} in tx ${walletTx.txid} in block ${walletTx.blockheight} amount is different in wallet than on platform. Wallet Amount: ${walletTx.amount} ${coin} | Platform Amount: ${depositAmount} ${coin} , `;
    }
  });

  // Format wallet transactions.
  const formWalletTxs = {};

  walletTxs.forEach((walletTx) => {
    if (formWalletTxs[walletTx.txid] === undefined) {
      formWalletTxs[walletTx.txid] = {};
    }
    formWalletTxs[walletTx.txid][walletTx.address] = walletTx.amount;
  });

  // Compare platform TXs to wallet TXs to look for inconsistencies.

  Object.keys(platformTxs).forEach((txid) => {
    const depsInTx = platformTxs[txid];
    // Confirm TX exists in wallet.
    if (formWalletTxs[txid] === undefined) {
      inconsistencies += `Platform ${coin} tx ${txid} missing in wallet, `;
      return;
    }
    Object.keys(depsInTx).forEach((address) => {
      // Confirm deposit exists in tx.
      if (formWalletTxs[txid][address] === undefined) {
        inconsistencies += `Platform deposit to address ${address} for ${formWalletTxs[txid][address]} ${coin} in tx ${txid} missing in wallet, `;
        return;
      }

      const walletAmount = formWalletTxs[txid][address];

      // Confirm deposit amount.
      if (parseFloat(walletAmount) !== parseFloat(depsInTx[address])) {
        inconsistencies += `Platform deposit to address ${address} in tx ${txid} amount is different in platform than on wallet. Wallet Amount: ${walletAmount} ${coin} | Platform Amount: ${depsInTx[address]} ${coin}, `;
      }
    });
  });

  if (inconsistencies.length > 0) {
    throw new LogError(
      `FAIL - Validation of Deposits: ${coin} deposit inconsistencies found for block range ${startBlock} to ${endBlock}. Inconsistencies: ${inconsistencies}`,
      true,
      true
    );
  } else {
    throw new LogError(
      `SUCCESS - Validation of Deposits: Platform ${coin} deposits match wallet for range ${startBlock} to ${endBlock}.`,
      true,
      false
    );
  }
};
