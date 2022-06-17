const sigMan = require("./signatureManager")
const axios = require('axios')
const https = require('https')

class RequestManager {

    timeout = 10000000
    privKey = ""
    pubKey = ""
    nonceTolerance = 10000

    /**
     * Initiation values to make remote requests to a specific node. 
     * @param {string} signingPrivKey Private key used to sign messages sent to server.
     * @param {string} verificationPubKey Public key of remote node used to verify response. 
     */
    constructor(
        remoteAddress,
        remotePort,
        rpcAddress,
        rpcPort,
        rpcUser,
        rpcPass,
        signingPrivKey,
        signingPubKey
    ){

        this.remoteAddress = remoteAddress
        this.remotePort = remotePort
        this.rpcAddress = rpcAddress
        this.rpcPort = rpcPort
        this.rpcUser = rpcUser
        this.rpcPass = rpcPass
        this.privKey = signingPrivKey
        this.pubKey = signingPubKey

    }

    /**
     * Sends signed POST requests to remote server. 
     * @param {string} route Route you are trying to access from the base URL. Example: site.com/example in this case the route would be "example".
     * @param {string|obj} data Data you will send. 
     * @returns {obj} Results object.
     */
    async post(route,data){

        let result = {}
        let headers = {}
        
        let unsignedData = {}
        unsignedData.nonce = Date.now()
        unsignedData.data = data
        
        let signedData = await sigMan.sign(this.privKey,JSON.stringify(unsignedData))
        headers = { Signature:signedData.signature }

        try{
            result = await axios({
                method:'post',
                timeout:this.timeout,
                httpsAgent: new https.Agent({
                    rejectUnauthorized: this.rejectUnauthorized(this.remoteAddress)
                }),
                url:`${this.remoteAddress}:${this.remotePort}/${route}`,
                headers:headers,
                data:JSON.parse(signedData.data)
            })
        } catch (e) {
            throw e
        }

        return result

    }

    /**
     * RPC wrapper used to communicate between node and wallet or other RPC service. 
     * @param {string} method 
     * @param {array} params 
     * @param {int} id RPC request ID used to link request with response. 
     * @returns obj
     */
    async rpc(method,params=[],id=1){

        let result = {}
        let payload = {
            jsonrpc:"2.0",
            id:id,
            method:method,
            params:params
        }
        
        try{
            result = await axios({
                method:'post',
                timeout:this.timeout,
                httpsAgent: new https.Agent({
                    rejectUnauthorized: this.rejectUnauthorized(this.rpcAddress)
                }),
                headers:{
                    'Content-Type':'application/json-rpc',
                    'Accept':'application/json-rpc'
                },
                auth : {
                    username: this.rpcUser,
                    password: this.rpcPass
                },
                url:`${this.rpcAddress}:${this.rpcPort}`,
                data:payload
            })
        } catch (e) {
            throw e
        }

        return result


    }

    /**
     * Used to disable authority check for SSL on localhost requests.
     * @param {string} address Address of requests.
     * @returns {bool}
     */
    rejectUnauthorized(address){

        if ( address.includes("127") || address.includes("localhost")  ){
            return false
        }

        return true

    }


}

module.exports = RequestManager 

