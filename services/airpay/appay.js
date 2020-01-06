const crypto = require('crypto');
const request = require('request')
const moment = require('moment');
var logger = require('./../../common/logging/winston')(__filename);
const dao = require('./../dbClient');
const config = require('./../../common/config');

const secret = config.app_secret;
const partnerId = config.partner_id;
const serviceAP = {
    "pay" : 'ap.pay',
    "refund": 'ap.refund',
    "query": 'ap.query',
    "notify": 'ap.notify'
}
const signType = 'MD5';
const payURL = 'https://api.airpay.in.th/pay/barcode/pay';

const mapAtg01ToAP = (reqTimeMs,ReqHdr,TrnHdr) => {
    var payData = {
        partner_tran_id: '2010121000000002',
        buyer_code_type: 'qrcode', //'barcode',
        buyer_code: 'APTH13112012345678',
        trans_create_time: moment().format('YYYYMMDDHHmmss'),
        trans_name: 'instore',
        trans_amount: 0,
        currency: 'THB',
        merchant_type: '5995',
        merchant_id: 'Teminal_1026',
        merchant_name: 'SG_DQ',
        store_id: 'DQ1113',
        store_name: 'Rama4',
        memo: 'dine in'
    }

    payData["partner_tran_id"]      = reqTimeMs+'-'+ReqHdr["TxID"];
    payData["buyer_code"]           = TrnHdr["Ref1"];
    payData["trans_create_time"]    = TrnHdr["TrnDt"];
    payData["trans_name"]           = TrnHdr["Ref2"];
    payData["trans_amount"]         = Number(TrnHdr["TtlAmt"].concat('00'));
    payData["merchant_id"]          = TrnHdr["StrCd"];
    payData["merchant_name"]        = 'SG_DQ'
    payData["store_id"]             = TrnHdr["StrCd"];
    payData["store_name"]           = TrnHdr["Ref3"]; //bu code
    payData["memo"]                 = reqTimeMs

    return JSON.stringify(payData);
}

const mapResToATG = () => {

} 

const payService = (reqTimeMs,ReqHdr,TrnHdr,ReqId,callback) => {
   
   let data = mapAtg01ToAP(reqTimeMs,ReqHdr,TrnHdr); 
   //prepare message to sign
   let textToMD5 = partnerId.concat(serviceAP["pay"],data,signType,secret);
   logger.info('[payService] target to sign => ');
   //logger.info(textToMD5);
   console.log(textToMD5); 
   
   //sign message
   let sign = crypto.createHash('md5').update(textToMD5).digest("hex");
   logger.info('[payService] message signed '+sign);

   var apReqBody = {
    "partner_id": partnerId,
    "service": serviceAP["pay"],
    "data": data,//escapeDoubleQuote(data),
    "sign_type": "MD5",
    "sign": sign
   }
   logger.info('[payService] AP request => ');
   console.log(JSON.stringify(apReqBody));

   //Send request to pay service
   dao.savePaymentRequest(reqTimeMs,ReqId,JSON.stringify(apReqBody),apReqBody,'airpay.pay',null,null,null,'sending',1);
   request.post(payURL, {
    json: JSON.stringify(apReqBody)
   }, (error, res, body) => {
    if (error) {
        dao.savePaymentResponse(reqTimeMs,ReqId,JSON.stringify(apReqBody),apReqBody,'airpay.pay',JSON.stringify(error),error,null,'error',1);
        logger.info('[ap.pay] error '+error)
        //return
        callback(error,null);
    }else{
        dao.savePaymentResponse(reqTimeMs,ReqId,JSON.stringify(apReqBody),apReqBody,'airpay.pay',JSON.stringify(body),body,null,'sent',1);
        logger.info('[Airpay] pay->return '+`statusCode: ${res.statusCode}`)
        //logger.info(body) 
        logger.info(res) 

        let resMsgBody = body
        if(body["error_code"] && body["error_code"].length > 0 ){
            //have error code
            callback(null,resMsgBody.error_code);
        }else{
            callback(null,resMsgBody.data);
        }
    }
   })

}

module.exports = payService