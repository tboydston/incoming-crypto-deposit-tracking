class LogError extends Error {
  constructor(message, logToConsole = true, sendToTg = false) {
    super(message);
    this.logToConsole = logToConsole;
    this.sendToTg = sendToTg;
  }
}

module.exports = LogError;
