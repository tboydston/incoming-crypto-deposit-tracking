const fs = require("fs");

const validations = {
  commands: {
    generateSigningKeyPair: {
      required: [],
      default: {},
      name: "",
    },
    generateAddresses: {
      required: ["coin", "startIndex", "endIndex", "mode"],
      default: { mode: "show" },
      name: "Generate Addresses",
    },
  },
  config: {
    defaultPath: "./config.js",
  },
  types: {
    coin: "string",
    startIndex: "number",
    endIndex: "number",
    mode: ["show", "walletOnly", "platformOnly", "add"],
    validationType: ["hash", "address"],
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
        throw Error(`Required option ${requiredOption} not set.`);
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
