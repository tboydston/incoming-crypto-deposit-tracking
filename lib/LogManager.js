const Slimbot = require('slimbot') // Telegram message manager. 
const fs = require('fs')
const coinNetworkList = require('coinnetworklist')

class LogManager {

    /**
     * Log messages to console, file, and telegram. 
     * @param {sting} logFolder Name of the folder where logs will be stored in log directory.
     * @param {string} coin Coin you will be logging information about.
     * @param {string} tgToken Telegram bot token.
     * @param {string} tgChatId Chat ID telegram bot will send messages to.
     * @param {string} serviceName Name of service. Sent with telegram message. 
     */
    constructor(logFolder,coin,tgToken,tgChatId,serviceName){
        
        this.logFolder = logFolder
        this.coin = coin
        this.tgToken = tgToken 
        this.tgChatId = tgChatId
        this.serviceName = serviceName
       
        if ( this.tgToken != undefined ) {
            this.tg = new Slimbot(tgToken)
        }

        if (!fs.existsSync(`logs/${logFolder}`)) {
            fs.mkdirSync(`logs/${logFolder}`)
        }

    }

    /**
     * Log content to file, console, and/or telegram.
     * @param {string} logContent Content you would like to log.
     * @param {bool} logToConsole Send the content be outputted to console? 
     * @param {bool} sendToTg Send the content to Telegram?
     */
    async log(logContent,logToConsole=true,sendToTg=false){

        let time = new Date()
        let timeStamp = time.toISOString()

        if ( logToConsole ) { 
            console.log(logContent)
        }

        if ( sendToTg ) {
            if ( this.serviceName === undefined ){
                this.tg.sendMessage(this.tgChatId,`${serviceName}: ${logContent}`)
            } else {
                this.tg.sendMessage(this.tgChatId,logContent)
            }
        }

        fs.appendFileSync(`./logs/${this.logFolder}/${this.coin}-${this.logFolder}-log.txt`,`${timeStamp} | ${logContent}\n`)

    } 


}

module.exports = LogManager 