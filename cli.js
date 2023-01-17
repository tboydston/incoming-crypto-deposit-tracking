const RequestManager = require("./lib/RequestManager");
const LogManager = require("./lib/LogManager");
const validate = require("./lib/validationManager");

const generateAddresses = require("./commands/generateAddresses");

let requestManager = {};
let logManager = {};

(async () => {
  let command = "";
  let options = {};
  let config = {}; // Config for specific coin.

  try {
    command = await validate.command(process.argv[2]);
    options = await validate.options(process.argv);
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

    // Initiate log manager.
    try {
      logManager = new LogManager(
        command,
        options.coin,
        config.notifications.telegram.token,
        config.notifications.telegram.chatId,
        validate.commands[command].name
      );
    } catch (e) {
      throw Error(`Error loading log manager. Raw Error: ${e.message}`);
    }
  } catch (e) {
    console.log(e.message);
    return;
  }

  try {
    [command](options, config, requestManager, logManager);
  } catch (e) {
    logManager.log(e.message, e.logToConsole, e.sendToTg);
  }
})();
