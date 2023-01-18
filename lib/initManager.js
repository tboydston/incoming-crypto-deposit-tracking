const RequestManager = require("./RequestManager");
const LogManager = require("./LogManager");
const validate = require("./validationManager");

module.exports = async (args) => {
  let command = "";
  let options = {};
  let config = {}; // Config for specific coin.
  let requestManager = {};
  let logManager = {};

  command = await validate.command(args[2]);
  options = await validate.options(command, args);
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
      validate.validations.commands[command].name
    );
  } catch (e) {
    throw Error(`Error loading log manager. Raw Error: ${e.message}`);
  }

  return { command, options, config, requestManager, logManager };
};
