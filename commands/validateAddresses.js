const HdAddGen = require("hdaddressgenerator");
const crypto = require("crypto");

const LogError = require("../lib/LogError");

module.exports = async (options, config, requestManager, logManager) => {
  const { coin } = options;
  const { validationType } = options;
  const { startIndex } = options;
  const { endIndex } = options;

  // Generate addresses using the Xpub within the validation range.
  const addGen = HdAddGen.withExtPub(
    config.addressGen.xpub,
    coin,
    parseInt(config.addressGen.bip, 10)
  );

  const numberToGenerate = endIndex - startIndex + 1;
  const addresses = await addGen.generate(numberToGenerate, startIndex);

  // Build request to platform for addresses within a certain range associated with a public key.
  const pubKeyHash = crypto
    .createHash("sha256")
    .update(config.addressGen.xpub)
    .digest("hex");

  const requestData = {
    xPubHash: pubKeyHash,
    validationType,
    startIndex,
    endIndex,
  };

  let responseData = {};
  let remoteResponse = {};

  try {
    remoteResponse = await requestManager.post(
      config.platform.routes.validateAddresses,
      requestData
    );
    responseData = remoteResponse.data.data;
  } catch (e) {
    throw new LogError(
      `Remote platform server error. Raw Error: ${e.message}`,
      true,
      true
    );
  }

  // If validation type is hash compare locally generated hash to platform addresses to look for inconsistencies.
  if (validationType === "hash") {
    if (responseData.hash === undefined || responseData.hash.length !== 64) {
      throw new LogError(
        `Remote platform request malformed. Expected hash got: ${JSON.stringify(
          responseData
        )}`,
        true,
        true
      );
    }

    let validationString = "";

    addresses.forEach((address) => {
      validationString += `${address.index},${address.address},`;
    });

    const validationHash = crypto
      .createHash("sha256")
      .update(validationString)
      .digest("hex");

    if (validationHash !== responseData.hash) {
      throw new LogError(
        `FAIL - Validation of Addresses by Hash: Platform ${coin} addresses for index range ${startIndex} to ${endIndex} do not match local addresses when compared by hash. Expected hash ${validationHash} received hash ${responseData.hash} . Run address by address comparison to find inconsistencies.`,
        true,
        true
      );
    } else {
      throw new LogError(
        `SUCCESS - Validation of Addresses by Hash: Platform ${coin} deposit addresses match deterministic addresses for range ${startIndex} to ${endIndex} when compared by hash`,
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
      throw new LogError(
        `Remote platform request malformed. Expected object of addresses and index ( Example: {addresses:{index1:address1,index2:address2}} ) got: ${JSON.stringify(
          responseData
        )}`,
        true,
        true
      );
    }

    const remoteAddresses = responseData.addresses;
    let inconsistencies = "";

    let index = startIndex;
    addresses.forEach((address) => {
      if (remoteAddresses[index] !== address.address) {
        inconsistencies += `Index ${index}: expected ${
          address.address
        }, platform had ${remoteAddresses[address.index]}, `;
      }

      index += 1;
    });

    for (let i = startIndex; i < endIndex; i += 1) {
      if (remoteAddresses[i] === undefined) {
        inconsistencies += `Index ${i}: missing on platform, `;
      }
    }

    if (inconsistencies.length > 0) {
      throw new LogError(
        `FAIL - Validation of Addresses: Platform ${coin} deposit address inconsistencies found for index range ${addresses} to ${endIndex}. Inconsistencies: ${inconsistencies}`,
        true,
        true
      );
    } else {
      throw new LogError(
        `SUCCESS - Validation of Addresses: Platform ${coin} deposit addresses match deterministic addresses for range ${startIndex} to ${endIndex} when compared by address.`,
        true,
        false
      );
    }
  }

  throw new LogError(
    `Unknown address validation error. Validate Address function was run but no validation was done. Validation type: ${validationType}`,
    true,
    true
  );
};
