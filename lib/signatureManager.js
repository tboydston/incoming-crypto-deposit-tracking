const crypto = require("crypto");

const signatureManager = {};

signatureManager.algorithm = "RSA-SHA256";
signatureManager.sigFormat = "hex";

/**
 * Sign a data package.
 * @param {string} privKey Private key you will sign with.
 * @param {string} data Data you would like to sign.
 * @returns obj Object containing signed data and data.
 */
signatureManager.sign = async (privKey, data) => {
  const result = {};
  const signer = crypto.createSign(this.algorithm);

  signer.update(data);

  result.signature = signer.sign(privKey, this.sigFormat);
  result.data = data;

  return result;
};

/**
 * Verify if signature is valid on data package.
 * @param {string} pubKey Public key from key pair used to sign data.
 * @param {string} data Data to verify signature for.
 * @param {string} sig Signature to verify.
 * @returns bool
 */
signatureManager.verify = async (pubKey, data, sig) => {
  const verifier = crypto.createVerify(this.algorithm);
  verifier.update(data);

  return verifier.verify(pubKey, sig, this.sigFormat);
};

module.exports = signatureManager;
