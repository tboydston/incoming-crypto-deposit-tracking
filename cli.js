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

  // If request is a help request display help and exit.
  try {
    if (process.argv[2] === "help") {
      await commands.help(process.argv[3]);
      return;
    }

    // Run generateSigningKeyPair escript and exit.
    if (process.argv[2] === "generateSigningKeyPair") {
      await commands.generateSigningKeyPair();
      return;
    }

    // Pass commands and option to initManager for validation and parsing.
    initResult = await init(process.argv);
  } catch (e) {
    console.log(e.message);
    return;
  }

  // Destructure initResult object to local constants.
  const { command, options, config, requestManager, logManager } = initResult;

  // Run command with provided options and required libraries. If a result message is returned it is returned by throwing a LogMessage exception. This exception is caught here and processed by the logManager which determines if the results are sent to console and/or Telegram.
  try {
    await commands[command](options, config, requestManager, logManager);
  } catch (e) {
    logManager.log(e.message, e.logToConsole, e.sendToTg);
  }
})();
