const RequestManager = require("./lib/RequestManager");
const LogManager = require("./lib/LogManager");
const validate = require("./lib/validationManager");

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

let requestManager = {};
let logManager = {};

(async () => {
  let command = "";
  let options = {};
  let config = {}; // Config for specific coin.

  try {
    command = await validate.command(process.argv[2]);

    if (command === "help") {
      await commands.help(process.argv[3]);
      return;
    }

    if (command === "generateSigningKeyPair") {
      await commands.generateSigningKeyPair();
      return;
    }

    options = await validate.options(command, process.argv);
    config = await validate.config(options.config, options.coin);

    // Initiate RequestManager class used for making RPC and signed platform API requests.
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
      throw Error(`Error loading request manager. Raw Error: ${e.message}`);
    }
    console.log(
      command,
      options.coin,
      config.notifications.telegram.token,
      config.notifications.telegram.chatId,
      validate.validations.commands[command].name
    );
    // Initiate log manager.
    try {
      logManager = new LogManager(
        command,
        options.coin,
        config.notifications.telegram.token,
        config.notifications.telegram.chatId,
        validate.validations.commands[command].name
      );
    } catch (e) {
      throw Error(`Error loading log manager. Raw Error: ${e.message}`);
    }
  } catch (e) {
    console.log(e);
    return;
  }

  try {
    commands[command](options, config, requestManager, logManager);
  } catch (e) {
    logManager.log(e.message, e.logToConsole, e.sendToTg);
  }
})();
