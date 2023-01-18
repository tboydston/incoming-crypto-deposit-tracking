const init = require("./lib/initManager");

/* eslint-disable global-require */
const commands = {
  generateSigningKeyPair: require("./commands/generateSigningKeyPair"),
  generateAddresses: require("./commands/generateAddresses"),
  monitorChain: require("./commands/monitorChain"),
  validateAddresses: require("./commands/validateAddresses"),
  validateDeposits: require("./commands/validateDeposits"),
  watchDeposits: require("./commands/watchDeposits"),
  help: require("./commands/help"),
};
/* eslint-enable global-require */

(async () => {
  let initResult = {};

  try {
    if (process.argv[2] === "help") {
      await commands.help(process.argv[3]);
      return;
    }

    if (process.argv[2] === "generateSigningKeyPair") {
      await commands.generateSigningKeyPair();
      return;
    }

    initResult = await init(process.argv);
  } catch (e) {
    console.log(e.message);
    return;
  }

  const { command, options, config, requestManager, logManager } = initResult;

  try {
    commands[command](options, config, requestManager, logManager);
  } catch (e) {
    logManager.log(e.message, e.logToConsole, e.sendToTg);
  }
})();
