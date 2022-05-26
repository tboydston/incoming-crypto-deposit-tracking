const crypto = require('crypto')

const signatureManager = {}

signatureManager.algorithm = 'RSA-SHA256'
signatureManager.sigFormat = 'hex'

signatureManager.sign = async function(privKey,data){

    let result = {}
    let signer = crypto.createSign(this.algorithm)
    
    signer.update(data)
    
    result.signature = signer.sign(privKey,this.sigFormat)
    result.data = data

    return result 

}


signatureManager.verify = async function(pubKey,data,sig){
    
    let verifier = crypto.createVerify(this.algorithm)
    verifier.update(data)

    return verifier.verify(pubKey,sig,this.sigFormat)

}

module.exports = signatureManager