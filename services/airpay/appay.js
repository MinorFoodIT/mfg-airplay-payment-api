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
const payURL = 'https://testapi.airpay.in.th/pay/barcode/pay';

const mapAtg01ToAP = (ReqHdr,TrnHdr) => {
    var payData = {
        trans_amount: 0,
        currency: 'THB',
        merchant_name: 'SG_DQ',
        trans_create_time: moment().format('YYYYMMDDHHmmss'),
        trans_name: 'instore',
        buyer_code_type: 'qrcode', //'barcode',
        store_name: 'Rama4',
        merchant_type: '5995',
        partner_tran_id: '2010121000000002',
        buyer_code: 'APTH13112012345678',
        merchant_id: 'Teminal_1026',
        memo: 'dine in',
        store_id: 'DQ1113'
    }

    payData["trans_amount"]         = Number(TrnHdr["TtlAmt"].concat('00'));
    payData["buyer_code"]           = TrnHdr["Ref1"];
    payData["trans_name"]           = TrnHdr["Ref2"];
    payData["store_name"]           = TrnHdr["Ref3"];
    payData["store_id"]             = TrnHdr["StrCd"];
    payData["trans_create_time"]    = TrnHdr["TrnDt"];
    payData["partner_tran_id"]      = ReqHdr["TxID"];

    return JSON.stringify(payData);
}

const mapResToATG = () => {

} 

const payService = (reqTimeMs,ReqHdr,TrnHdr,ReqId,callback) => {
   
   let data = mapAtg01ToAP(ReqHdr,TrnHdr); 
   //prepare message to sign
   let textToMD5 = partnerId.concat(serviceAP["pay"],data,signType,secret);
   logger.info('[payService] target to sign => ');
   logger.info(textToMD5);
    //sign message
   let sign = crypto.createHash('md5').update('textToMD5').digest("hex");
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
   dao.savePaymentRequest(reqTimeMs,ReqId,JSON.stringify(apReqBody),apReqBody,'airpay',null,null,null,'sending',1);
   request.post(payURL, {
    json: JSON.stringify(apReqBody)
   }, (error, res, body) => {
    if (error) {
        dao.savePaymentResponse(reqTimeMs,ReqId,JSON.stringify(apReqBody),apReqBody,'airpay',JSON.stringify(error),error,null,'error',1);
        logger.info('[ap.pay] error '+error)
        //return
        callback(error,null);
    }else{
        dao.savePaymentResponse(reqTimeMs,ReqId,JSON.stringify(apReqBody),apReqBody,'airpay',JSON.stringify(body),body,null,'sent',1);
        logger.info('[Airpay] pay->return '+`statusCode: ${res.statusCode}`)
        logger.info(body) 

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