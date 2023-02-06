const crypto = require("crypto");
const HdAddGen = require("hdaddressgenerator");
const LogError = require("../lib/LogError");

/**
 * Generate deterministic addresses and add them to a local Bitcoind like wallet and remote platform API.
 */
module.exports = async (options, config, requestManager, logManager) => {
  const { coin } = options;
  const { mode } = options;
  const { startIndex } = options;
  const { endIndex } = options;

  const addGen = HdAddGen.withExtPub(
    config.addressGen.xpub,
    coin,
    parseInt(config.addressGen.bip, 10)
  );

  const numberToGenerate = endIndex - startIndex + 1;

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

  if (["walletOnly", "add"].includes(mode)) {
    try {
      await requestManager.rpc("importmulti", [rpcFormatted]);
    } catch (e) {
      logManager(`RPC server error. Raw Error: ${e.message}`);
    }
  }

  if (["platformOnly", "add"].includes(mode)) {
    try {
      await requestManager.post(
        config.platform.routes.addresses,
        remoteFormatted
      );
    } catch (e) {
      logManager(`Remote server error. Raw Error: ${e.message}`);
    }
  }
};
