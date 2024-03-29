const Slimbot = require("slimbot"); // Telegram message manager.
const fs = require("fs");

class LogManager {
  /**
   * Log messages to console, file, and telegram.
   * @param {sting} logFolder Name of the folder where logs will be stored in log directory.
   * @param {string} coin Coin you will be logging information about.
   * @param {string} tgToken Telegram bot token.
   * @param {string} tgChatId Chat ID telegram bot will send messages to.
   * @param {string} serviceName Name of service. Sent with telegram message.
   */
  constructor(logFolder, coin, tgToken, tgChatId, serviceName) {
    this.logFolder = logFolder;
    this.coin = coin;
    this.tgToken = tgToken;
    this.tgChatId = tgChatId;
    this.serviceName = serviceName;

    if (this.tgToken !== undefined) {
      this.tg = new Slimbot(tgToken);
    }

    if (!fs.existsSync(`${__dirname}/../logs/${logFolder}`)) {
      fs.mkdirSync(`${__dirname}/../logs/${logFolder}`);
    }
  }

  /**
   * Log content to file, console, and/or telegram.
   * @param {string} logContent Content you would like to log.
   * @param {bool} logToConsole Send the content be outputted to console?
   * @param {bool} sendToTg Send the content to Telegram?
   */
  async log(logContent, logToConsole = true, sendToTg = false) {
    const time = new Date();
    const timeStamp = time.toISOString();
    const tgContent = logContent.replace(/\./g, "\\.").replace(/\|/g, "\\|"); // Escape common characters.
    // eslint-disable-next-line
    logContent = logContent.replace(/\\/g, ""); // Clean up escape characters for logging.

    if (logToConsole) {
      console.log(logContent);
    }

    if (sendToTg) {
      if (this.serviceName === undefined) {
        this.tg.sendMessage(this.tgChatId, tgContent, {
          parse_mode: "MarkdownV2",
        });
      } else {
        this.tg.sendMessage(
          this.tgChatId,
          `${this.serviceName}: ${tgContent}`,
          { parse_mode: "MarkdownV2" }
        );
      }
    }

    fs.appendFileSync(
      `${__dirname}/../logs/${this.logFolder}/${this.coin}-${this.logFolder}-log.txt`,
      `${timeStamp} | ${logContent}\n`
    );
  }
}

module.exports = LogManager;
