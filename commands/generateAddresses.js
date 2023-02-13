const crypto = require("crypto");
const HdAddGen = require("hdaddressgenerator");

/**
 * Generate deterministic addresses and add them to a local Bitcoind like wallet and remote platform API.
 */
module.exports = async (options, config, requestManager, logManager) => {
  const { coin } = options;
  const { mode } = options;
  const { startIndex } = options;
  const { endIndex } = options;

  // Init addresses generator with xpub and bip.
  const addGen = HdAddGen.withExtPub(
    config.addressGen.xpub,
    coin,
    parseInt(config.addressGen.bip, 10)
  );

  const numberToGenerate = endIndex - startIndex + 1;

  // Generate addresses from start index to end index.
  const addresses = await addGen.generate(
    parseInt(numberToGenerate, 10),
    parseInt(startIndex, 10)
  );

  const remoteFormatted = {
    coin,
    addresses: [],
  };

  const rpcFormatted = [];
  const pubKeyHash = crypto
    .createHash("sha256")
    .update(config.addressGen.xpub)
    .digest("hex");

  // Build requests to bitcoind, platform, and display output to console.
  let index = startIndex;
  addresses.forEach((address) => {
    logManager.log(
      `${address.path},${address.address},${address.pubKey}`,
      true,
      false
    );

    remoteFormatted.addresses.push({
      xPubHash: pubKeyHash,
      index: parseInt(index, 10),
      path: address.path,
      address: address.address,
      pubKey: address.pubKey,
    });

    rpcFormatted.push({
      scriptPubKey: {
        address: address.address,
      },
      timestamp: "now",
    });

    index += 1;
  });

  // Send results to bitcoind or remote platform depending on selected mode.
  if (["walletOnly", "add"].includes(mode)) {
    try {
      await requestManager.rpc("importmulti", [rpcFormatted]);
    } catch (e) {
      logManager.log(
        `RPC server error. Error Message: ${
          e.message
        } Error Data: ${JSON.stringify(e.response.data)}`
      );
    }
  }

  if (["platformOnly", "add"].includes(mode)) {
    try {
      await requestManager.post(
        config.platform.routes.addresses,
        remoteFormatted
      );
    } catch (e) {
      logManager.log(`Remote server error. Error Message: ${e.message}`);
    }
  }
};
