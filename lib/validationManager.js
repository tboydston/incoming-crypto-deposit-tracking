const fs = require("fs");

const validations = {
  commands: {
    generateSigningKeyPair: {
      required: [],
      default: {},
      name: "Generate Signing Key Pair",
      help: "Generate signing key pair which is stored in the 'keys' folder and used to sign requests to platform.",
      example: "node cli.js generateSigningKeyPair",
    },
    generateAddresses: {
      required: ["coin", "startIndex", "endIndex", "mode"],
      default: { mode: "show" },
      name: "Generate Addresses",
      example:
        "node cli.js generateAddresses coin=BTC startIndex=0 endIndex=10, mode=show",
      help: "Generates a range of deterministic addresses from a coin specific xPub key specified in the config file. Address data is displayed on the console, added to the wallet, and/or sent to the platform depending on the mode option selected.",
    },
    monitorChain: {
      required: ["coin"],
      default: {},
      name: "Monitor Chain",
      example: "node cli.js monitorChain coin=BTC",
      help: "Designed to be run periodically via crontab. Confirms RPC api's are functional and blocks are updating.",
    },
    validateAddresses: {
      required: ["coin", "startIndex", "endIndex", "validationType"],
      default: {},
      name: "Validate Addresses",
      example:
        "node cli.js validateAddresses coin=BTC startIndex=0 endIndex=100 validationType=hash",
      help: "Regenerates address chain and compares addresses to platform addresses to insure that platform addresses have not been tampered with. Inconsistencies will be logged and sent to Telegram.",
    },
    validateDeposits: {
      required: ["coin", "startBlock", "endBlock"],
      default: {},
      name: "Validate Deposits",
      example: "node cli.js validateDeposits coin=BTC startBlock=1 endBlock=2",
      help: "Compares wallet deposits with deposits on the platform. Inconsistencies will be logged and sent to Telegram.",
    },
    watchDeposits: {
      required: ["coin", "method"],
      default: { method: "cli" },
      name: "Watch Deposits",
      example: "node cli.js coin=BTC method=cli",
      help: "Checks wallet for new deposits or updates on deposits within confirmations less then or equal to the config value 'notifications.watchUntil'. Incoming deposit information is sent to the specified Telegram group and logged. The block to check for deposits from is saved in the data/lastDepositBlock-[coin].txt file. You can resubmit deposits by resetting this value to one minus the block you would like to check for deposits from.",
    },
    help: {
      required: [],
      name: "Help",
      help: "Display this message or help message for individual commands.",
      usage: "help <command>",
      example: "node cli.js help generateAddresses",
    },
  },
  config: {
    defaultPath: "../config.js",
  },
  types: {
    coin: "string",
    startIndex: "number",
    endIndex: "number",
    startBlock: "number",
    endBlock: "number",
    mode: ["show", "walletOnly", "platformOnly", "add"],
    validationType: ["hash", "address"],
    method: ["cli", "silent", "blockNotify", "walletNotify", "notifyAll"],
  },
  // @TODO Description shares namespace with entire CLI. If CLI is ever expanded this should be broken down by command.
  description: {
    coin: "Name of the coin as set in the config file. Example: BTC",
    startIndex: "Index to start validating addresses from.",
    endIndex: "Index to stop validating addresses from.",
    startBlock: "Block to start validating deposits from.",
    endBlock: "Block to stop validating deposits from.",
    mode: "Destination of new addresses.",
    validationType: "Method used to validate new addresses.",
    method:
      "Method used to call watchDeposits script. Defines whether notifications should be sent to Telegram.",
    show: "Show address generation results only in console.",
    walletOnly:
      "Add addresses to wallet but not to platform as well as displaying the addresses in console.",
    platformOnly:
      "Add addresses to platform but not to wallet as well as display addresses in console.",
    add: "Add addresses to wallet and platform as well as display addresses in the console.",
    hash: "Validate addresses by comparing sha256 addresses.",
    address:
      "Validate addresses by comparing wallet addresses to platform addresses individually.",
    cli: "Accessed via cli. New deposit notifications will be sent according to config policy.",
    silent: "Accessed via cli. New deposits will only be displayed in console.",
    blockNotify:
      "Accessed via bitcoind through blockNotify. New deposit notifications will be sent according to config policy.",
    walletNotify:
      "Accessed via bitcoind through walletNotify. New deposit notifications will be sent according to config policy.",
    notifyAll:
      "Accessed via cli. ALL new deposits will be sent to Telegram. WARNING: If there are too many deposits, notification message may exceed Telegram's max message length.",
  },
};

async function command(cmd) {
  if (validations.commands[cmd] === undefined) {
    const validCommands = Object.keys(validations.commands);

    throw Error(
      `Invalid command: ${cmd}. Valid commands: ${validCommands.join(", ")}`
    );
  }

  return cmd;
}

async function options(cmd, args) {
  const opts = {};
  const validation = validations.commands[cmd];

  for (let i = 3; i < args.length; i += 1) {
    const option = args[i].split("=");

    if (option.length === 1) {
      throw Error(
        `Invalid option: ${option} . Options must be submitted in 'option=value' format.`
      );
    }

    const key = option[0];
    const value = !Number.isNaN(parseInt(option[1], 10))
      ? parseInt(option[1], 10)
      : option[1];

    if (validations.types[key] !== undefined) {
      const type = validations.types[key];

      // eslint-disable-next-line
      if (typeof value !== type && !Array.isArray(type)) {
        throw Error(
          `Options type for ${key} is invalid. Expected ${type}, received '${value}' of type ${typeof value}.`
        );
      }

      if (Array.isArray(type)) {
        if (!type.includes(value)) {
          throw Error(
            `Option ${key} is invalid. Received: ${value}, Expected one of: ${type.join(
              ","
            )}`
          );
        }
      }
    }

    opts[key] = value;
  }

  validation.required.forEach((requiredOption) => {
    if (opts[requiredOption] === undefined) {
      if (validation.default[requiredOption] !== undefined) {
        opts[requiredOption] = validation.default[requiredOption];
      } else {
        throw Error(`Required option '${requiredOption}' not set.`);
      }
    }
  });

  // Load default config if no config is specified.
  if (opts.config === undefined) {
    opts.config = validations.config.defaultPath;
  }

  return opts;
}

async function config(configPath, coin) {
  let configs = {};

  try {
    // eslint-disable-next-line
    configs = require(configPath);
  } catch (e) {
    throw Error(`Error loading config file '${configPath}'.`);
  }

  const conf = configs[coin];

  if (conf === undefined) {
    throw Error(`Error loading config for coin '${coin}'.`);
  }

  // Load remote request signing keys.
  try {
    conf.keys = {};

    if (fs.existsSync(`${__dirname}/../keys/${conf.keyFiles.pub}`)) {
      conf.keys.pub = fs.readFileSync(
        `${__dirname}/../keys/${conf.keyFiles.pub}`
      );
    } else {
      conf.keys.pub = fs.readFileSync(conf.keyFiles.pub);
    }

    if (fs.existsSync(`${__dirname}/../keys/${conf.keyFiles.priv}`)) {
      conf.keys.priv = fs.readFileSync(
        `${__dirname}/../keys/${conf.keyFiles.priv}`
      );
    } else {
      conf.keys.priv = fs.readFileSync(conf.keyFiles.priv);
    }
  } catch (e) {
    throw Error(`Error loading signing keys. Raw Error: ${e.message}`);
  }

  return conf;
}

module.exports = {
  validations,
  command,
  options,
  config,
};
