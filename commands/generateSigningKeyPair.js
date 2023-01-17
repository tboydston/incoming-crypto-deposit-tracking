const { generateKeyPairSync } = require("crypto");

module.exports = async (options, config, requestManager, logManager) => {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 4096, // the length of your key in bits
    publicKeyEncoding: {
      type: "spki", // recommended to be 'spki' by the Node.js docs
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8", // recommended to be 'pkcs8' by the Node.js docs
      format: "pem",
    },
  });

  logManager.log(publicKey);
  logManager.log("");
  logManager.log(privateKey);

  return {
    publicKey,
    privateKey,
  };
};
