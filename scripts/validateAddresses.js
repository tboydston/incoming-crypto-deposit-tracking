const fs = require("fs");
const crypto = require("crypto");
const HdAddGen = require("hdaddressgenerator");
const RequestManager = require("../lib/RequestManager");

const allConfigs = require("../config");
const LogManager = require("../lib/LogManager");

const coin = process.argv[2];
const validationType = process.argv[3];
let startIndex = process.argv[4];
let endIndex = process.argv[5];

const config = allConfigs[coin];

const validationTypes = ["hash", "address"];

/**
 * Compares platform addresses with generated addresses to make sure they have not been tampered with.
 */
(async () => {
  if (config === undefined) {
    console.log("Coin must be defined. Example: node validateAddresses.js BTC");
  }

  // Load log manager.
  try {
    lm = new LogManager(
      "validateAddresses",
      coin,
      config.notifications.telegram.token,
      config.notifications.telegram.chatId,
      "Validate Addresses"
    );
  } catch (e) {
    console.log(`Error loading log manager. Raw Error: ${e.message}`);
    return;
  }

  // Validate submitted mode.
  if (!validationTypes.includes(validationType)) {
    lm.log(
      `Invalid mode entered: ${
        process.argv[3]
      } Valid modes: ${validationTypes.join(", ")}`
    );
    return;
  }

  // Validate index and number to generate.
  if (isNaN(startIndex) || isNaN(endIndex)) {
    lm.log(
      `Index and number of addresses to validate must be a number. Example: node validateAddresses.js BTC 0 1`
    );
    return;
  }

  // Convert number in string to integer.
  startIndex = parseInt(startIndex);
  endIndex = parseInt(endIndex);

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
    lm.log(`Error loading signing keys. Raw Error: ${e.message}`);
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
    lm.log(`Error loading request manager. Raw Error: ${e.message}`);
    return;
  }

  // Generate addresses using the Xpub within the validation range.
  const addGen = HdAddGen.withExtPub(
    config.addressGen.xpub,
    coin,
    (bip = parseInt(config.addressGen.bip))
  );

  const numberToGenerate = endIndex - startIndex + 1;
  const addresses = await addGen.generate(numberToGenerate, startIndex);

  // Build request to platform for addresses within a certain range associated with a public key.
  let pubKeyHash = crypto
    .createHash("sha256")
    .update(config.addressGen.xpub)
    .digest("hex");

  let requestData = {
    xPubHash: pubKeyHash,
    validationType,
    startIndex: startIndex,
    endIndex: endIndex,
  };

  let responseData = {};

  try {
    remoteResponse = await requestManager.post(
      config.platform.routes.validateAddresses,
      requestData
    );
    responseData = remoteResponse.data.data;
  } catch (e) {
    lm.log(`Remote platform server error. Raw Error: ${e.message}`, true, true);
    return;
  }

  // If validation type is hash compare locally generated hash to platform addresses to look for inconsistencies.
  if (validationType === "hash") {
    if (responseData.hash === undefined || responseData.hash.length !== 64) {
      lm.log(
        `Remote platform request malformed. Expected hash got: ${JSON.stringify(
          responseData
        )}`,
        true,
        true
      );
      return;
    }

    let validationString = "";

    addresses.forEach((address) => {
      validationString += `${address.index},${address.address},`;
    });

    let validationHash = crypto
      .createHash("sha256")
      .update(validationString)
      .digest("hex");

    if (validationHash !== responseData.hash) {
      lm.log(
        `Platform ${coin} addresses for index range ${startIndex} to ${endIndex} do not match local addresses when compared by hash. Expected hash ${validationHash} recieved hash ${responseData.hash} . Run address by address comparison to find inconsistencies.`,
        true,
        true
      );
    } else {
      lm.log(
        `Platform ${coin} deposit addresses match deterministic addresses for range ${startIndex} to ${endIndex} when compared by hash`,
        true,
        false
      );
    }
  }

  // If validation type is address compare locally addresses hash to platform addresses to look for inconsistencies.
  if (validationType === "address") {
    if (
      responseData.addresses === undefined ||
      typeof responseData.addresses !== "object"
    ) {
      lm.log(
        `Remote platform request malformed. Expected array of addresses and index ( Example: {addresses:{index1:address1,index2:address2}} ) got: ${JSON.stringify(
          responseData
        )}`,
        true,
        true
      );
      return;
    }

    let remoteAddresses = responseData.addresses;
    let inconsistencies = "";

    let index = startIndex;
    addresses.forEach((address) => {
      if (remoteAddresses[index] !== address.address) {
        inconsistencies += `Index ${index}: expected ${
          address.address
        }, platform had ${remoteAddresses[address.index]}, `;
      }

      index++;
    });

    for (let index = startIndex; index < endIndex; index++) {
      if (remoteAddresses[index] === undefined) {
        inconsistencies += `Index ${index}: missing on platform, `;
      }
    }

    if (inconsistencies.length > 0) {
      lm.log(
        `Platform ${coin} deposit address inconsistencies found for index range ${startIndex} to ${endIndex}. Inconsistencies: ${inconsistencies}`,
        true,
        true
      );
    } else {
      lm.log(
        `Platform ${coin} deposit addresses match deterministic addresses for range ${startIndex} to ${endIndex} when compared by address.`,
        true,
        false
      );
    }
  }
})();
