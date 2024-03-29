const { generateKeyPairSync } = require("crypto");
/*
 * Generates a RSA key pair used to sign API requests to the platform. Results are outputted to the console.
 */
module.exports = async () => {
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

  console.log(publicKey);
  console.log("");
  console.log(privateKey);

  return {
    publicKey,
    privateKey,
  };
};
