const crypto = require('crypto');
//const request = require('request'); //{ json: JSON.stringify(apReqBody)}
const axios = require('axios');
const moment = require('moment');
var logger = require('./../../common/logging/winston')(__filename);
const dao = require('./../dbClient');
const config = require('./../../common/config');
var helper = require('./../../common/helper');
const myCache = require('./../../common/nodeCache');
const merchantCofig = require('./../../common/merchant');

const serviceAP = {
    "pay" : 'ap.pay',
    "refund": 'ap.refund',
    "query": 'ap.query',
    "notify": 'ap.notify'
}
const secret = config.app_secret;
const partnerId = config.partner_id;
const signType = 'MD5';
const payURL = config.ap_url+'/pay';
const inqURL = config.ap_url+'/query';

const mapAtg01ToAP = (reqTimeMs,ReqHdr,TrnHdr) => {
    var payData = {
        partner_trans_id: '',
        buyer_code_type: 'qrcode', //'barcode',
        buyer_code: '',
        trans_create_time: moment().format('YYYYMMDDHHmmss'),
        trans_name: 'instore',
        trans_amount: 0,
        currency: 'THB',
        merchant_type: '5995',
        merchant_id: '',
        merchant_name: '',
        store_id: '',
        store_name: '',
        memo: ''
    }
    payData["partner_trans_id"]     = TrnHdr["StrCd"]+'-'+reqTimeMs+'-'+ReqHdr["TxID"];
    payData["buyer_code"]           = TrnHdr["Ref1"];
    payData["trans_create_time"]    = TrnHdr["TrnDt"];
    payData["trans_name"]           = String(Number(TrnHdr["Ref2"].substring(11))); //0XXXXX
    payData["trans_amount"]         = Number(TrnHdr["TtlAmt"])*100;  //has 2 digits
   
    console.log('myCache.get("sites").length = '+myCache.get("sites").length);
    let sites = myCache.get("sites").filter(row => {
        return String(row.bu_code).trim() === String(TrnHdr["StrCd"]).trim();
    });
    logger.info('site group = '+ (sites.length > 0 ?sites[0].site_group.trim():'Not found')) ; 
    // console.log(merchant_name.length);
    // console.log(merchant_name);

    payData["merchant_id"]          = sites.length > 0 ?merchantCofig.merchant[sites[0].site_group.trim()] : 'MinorFood' ;       //TrnHdr["StrCd"];
    payData["merchant_name"]        = sites.length > 0 ?merchantCofig.merchat_group[sites[0].site_group.trim()] : 'MinorFood' ;
    //payData["merchant_name"]        = sites.length > 0 ?sites[0].site_group_name.trim() : 'MinorFood' ; 
    //console.log(payData["merchant_name"] );
    payData["store_id"]             = TrnHdr["StrCd"];
    payData["store_name"]           = TrnHdr["Ref3"]; //bu code
    payData["memo"]                 = TrnHdr["Ref3"]+'|'+'Ref: '+TrnHdr["StrCd"]+'-'+reqTimeMs+'-'+ReqHdr["TxID"]
    return JSON.stringify(payData);
}

const mapResToATG = () => {

} 

var apPostBody = {
    "partner_id": partnerId,
    "service": serviceAP["query"],
    "data": '',  
    "sign_type": "MD5",
    "sign": ''
   }

const takeMsgSign = (data,apiFunction) => {
    let textToMD5_retry = partnerId.concat(serviceAP["query"],data,signType,secret);
    let sign_retry = crypto.createHash('md5').update(textToMD5_retry).digest("hex");
    let apReqBody = {...apPostBody};
    apReqBody["service"] = serviceAP[apiFunction];
    apReqBody["data"] = data;
    apReqBody["sign"] = sign_retry;
    return apReqBody;
}

const sendInquiry = (callback,apReqBody,retryNo,reqTimeMs,partner_trans_id) => {
    if(retryNo <= 2){
        logger.info('[ap.query] api request | retry['+retryNo+'] => ');
        axios.post(inqURL, apReqBody, {timeout: 25000})
        .then(res => {
            logger.info('[ap.query] api resp => ');  
            let resMsgBody = res.data; //body
            if(helper.IsValidJSONString(resMsgBody.data)){
                console.log(resMsgBody.data);
                let respData = JSON.parse(resMsgBody.data);
                //Save retry request
                try{
                    let apRespData = {...respData};
                    dao.savePaymentResponse(reqTimeMs,apReqBody["partner_trans_id"],JSON.stringify(apReqBody),apReqBody,'airpay.pay',JSON.stringify(resMsgBody),resMsgBody,null,'resent',1,apRespData["ap_trans_id"]);
                }catch(err){
                    dao.savePaymentResponse(reqTimeMs,apReqBody["partner_trans_id"],JSON.stringify(apReqBody),apReqBody,'airpay.pay',JSON.stringify(resMsgBody),resMsgBody,null,'resent',1,null);
                }

                if(String(respData["ap_trans_status"]) === String('TRANS_PROCESSING') || String(respData["ap_trans_status"]) === String('WAIT_BUYER_PAY')){
                    logger.info('[ap.query] wait to retry again => 5s'); 
                    setTimeout(function(){
                        let apReqBody = takeMsgSign(data,'query');
                        sendInquiry(callback,apReqBody,++retryNo,reqTimeMs,partner_trans_id);
                    },5000);
                }else{
                    //other status of waiting 
                    callback(null,resMsgBody.data);
                }

                if(resMsgBody["error_code"] && resMsgBody["error_code"].length > 0 ){
                    //have error code
                    callback(null,resMsgBody.error_code);
                }else{
                    callback(null,resMsgBody.data);
                }
            }else{
                console.log(resMsgBody);
                callback(null,resMsgBody.data);
            }
        })
        .catch(err => {
            logger.info('[ap.query] error '+err.message);
            if(String(err.code) == String('ECONNABORTED') && String(err.message).includes('timeout')){
                callback(err,null);
            }else{
                callback(err,null);
            }
        })
    }else{
        callback(null,'INVALID_BARCODE');
    }
}

const payService = (reqTimeMs,ReqHdr,TrnHdr,ReqId,callback) => { 
   let data = mapAtg01ToAP(reqTimeMs,ReqHdr,TrnHdr); 
   //prepare message to sign
   let textToMD5 = partnerId.concat(serviceAP["pay"],data,signType,secret);
   // logger.info('[payService] target to sign => ');
   // console.log(textToMD5); 
   
   //sign message
   let sign = crypto.createHash('md5').update(textToMD5).digest("hex");
   //logger.info('[payService] message signed '+sign);

   var apReqBody = {
    "partner_id": partnerId,
    "service": serviceAP["pay"],
    "data": data,  //escapeDoubleQuote(data),
    "sign_type": "MD5",
    "sign": sign
   }
   logger.info('[ap.pay] api request => start');
   //console.log(JSON.stringify(apReqBody));

   let jsonReq = JSON.parse(data);
   //Send request to pay service
   dao.savePaymentRequest(reqTimeMs,jsonReq["partner_trans_id"],JSON.stringify(apReqBody),apReqBody,'airpay.pay',null,null,null,'sending',1);
   axios.post(payURL, apReqBody, {timeout: 25000})
   .then(res => {
    logger.info('[ap.pay] api resp => ');  //+`statusCode: ${res.statusCode}`
    if(helper.isObject(res.data)){
        let respData = res.data;
        try{
            let apRespData = JSON.parse(respData.data)
            dao.savePaymentResponse(reqTimeMs,jsonReq["partner_trans_id"],JSON.stringify(apReqBody),apReqBody,'airpay.pay',JSON.stringify(res.data),res.data,null,'sent',1,apRespData["ap_trans_id"]);
        }catch(err){
            dao.savePaymentResponse(reqTimeMs,jsonReq["partner_trans_id"],JSON.stringify(apReqBody),apReqBody,'airpay.pay',JSON.stringify(res.data),res.data,null,'sent',1,null);
        }
       console.log(res.data.data);
    }

    let resMsgBody = res.data; //body
    if(resMsgBody["error_code"] && resMsgBody["error_code"].length > 0 ){
        //have error code
        callback(null,resMsgBody.error_code);
    }else{
        //logger.info('ap.pay return data =>');
        //logger.info(resMsgBody.data);
        if(helper.IsValidJSONString(resMsgBody.data)){
            //logger.info('Valid JSON');
            let respData = JSON.parse(resMsgBody.data);
            if( String(respData["ap_trans_status"]) === String('TRANS_PROCESSING') || String(respData["ap_trans_status"]) === String('WAIT_BUYER_PAY')){
                console.log(respData);
                setTimeout(function(){
                    let apReqBody = takeMsgSign(data,'query');
                    sendInquiry(callback,apReqBody,1,reqTimeMs,jsonReq["partner_trans_id"]);
                },30000);
            }else{
                //logger.info('Will callback =>');
                callback(null,resMsgBody.data);
            }
        }
        //callback(null,resMsgBody.data);
    }
   })
   .catch(error => {
    logger.info('[ap.pay] error '+error.message);
    let error_code    = error.code;
    let error_message = String(error.message);  //timeout of 2ms exceeded
    let error_stack    = error.stack;   //Error: timeout of 2ms exceeded
    if(String(error_code) == String('ECONNABORTED') && error_message.includes('timeout')){
        //timeout
        dao.savePaymentResponse(reqTimeMs,ReqId,JSON.stringify(apReqBody),apReqBody.data,'airpay.pay',helper.isObject(error)?JSON.stringify(error):error.message,error.message,null,'timeout',1,null);
        //retry inquiry
        let textToMD5_retry = partnerId.concat(serviceAP["query"],data,signType,secret);
        let sign_retry = crypto.createHash('md5').update(textToMD5_retry).digest("hex");
        apReqBody["service"] = serviceAP["query"];
        apReqBody["sign"] = sign_retry;

        sendInquiry(callback,apReqBody,1,reqTimeMs,ReqId);
        /*
        // logger.info('[ap.query] api request => ');
        // console.log(JSON.stringify(apReqBody));
        // axios.post(inqURL, apReqBody, {timeout: 25000})
        //     .then(res => {
        //         logger.info('[ap.query] resp => ');  //+`statusCode: ${res.statusCode}`
        //         if(helper.isObject(res.data)){
        //             dao.savePaymentResponse(reqTimeMs,ReqId,JSON.stringify(apReqBody),apReqBody.data,'airpay.pay|query',JSON.stringify(res.data),res.data,null,'sent_timeout_retry',1);
        //             logger.info(res.data);
        //         }
        //         let resMsgBody = res.data; //body
        //         if(resMsgBody["error_code"] && resMsgBody["error_code"].length > 0 ){
        //             //have error code
        //             callback(null,resMsgBody.error_code);
        //         }else{
        //             callback(null,resMsgBody.data);
        //         }
        //     })
        //     .catch(err => {
        //         logger.info('[ap.query] error '+error.message);
        //         if(String(err.code) == String('ECONNABORTED') && String(err.message).includes('timeout')){
        //             dao.savePaymentResponse(reqTimeMs,ReqId,JSON.stringify(apReqBody),apReqBody.data,'airpay.pay|query',helper.isObject(error)?JSON.stringify(error):error.message,error.message,null,'error_retry_timeout',1);
        //             callback(err,null);
        //         }else{
        //             dao.savePaymentResponse(reqTimeMs,ReqId,JSON.stringify(apReqBody),apReqBody.data,'airpay.pay|query',helper.isObject(error)?JSON.stringify(error):error.message,error.message,null,'error_retry_error',1);
        //             callback(err,null);
        //         }
        //     })
        */
    }else{
        dao.savePaymentResponse(reqTimeMs,ReqId,JSON.stringify(apReqBody),apReqBody.data,'airpay.pay',helper.isObject(error)?JSON.stringify(error):error.message,error.message,null,'error',1,null);
        callback(error,null);
    }
   }) 
}

module.exports = payService