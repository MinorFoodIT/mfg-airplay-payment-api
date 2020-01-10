var logger = require('./../common/logging/winston')(__filename);
var helper = require('./../common/helper');
Promise = require('bluebird');
var payService = Promise.promisify(require('./../services/airpay/appay'));
var apResCode = require('./../model/apResCode');
var resCode = require('./../model/resCode');
const moment = require('moment');

const _resMsg01_02 = {
    "ResHdr": {
        "ResCd":  '',
        "ResMsg": ''
    },
    "ResDtl": {
        "ErrCd": '',
        "ErrMsgEng": '',
        "ErrMsgThai": '',
        "ApvlCd": '',
        "Ref1": '',
        "Ref2": '',
        "Ref3": '',
        "Ref4": '',
        "Ref5": '',
        "Ref6": '',
        "Ref7": '',
        "Ref8": '',
        "Ref9": '',
        "Ref10": '',
    }
}

//ATG message incoming
const processAction = async (actionCode ,atgReq,reqTimeMs,callback) => {
    if( atgReq["RegMsg01"] ){
       processMsg01(actionCode,atgReq,reqTimeMs,callback);
    }else if(atgReq["RegMsg02"]){
       processMsg02(actionCode,atgReq,reqTimeMs,callback);
       //callback(null,resMsg02);
    }
}

//Request message type 01
const processMsg01 = (actionCode ,atgReq ,reqTimeMs,callback) => {
    var ReqHdr = atgReq["RegMsg01"]["ReqHdr"];
    var TrnHdr = atgReq["RegMsg01"]["TrnHdr"];
    var ReqId  = atgReq["RegMsg01"]["ReqHdr"]["ReqID"];

    if(actionCode === 'APPAY'){
        logger.info('Call AP.PAY service');
        let resMsg01 = Object.assign({},_resMsg01_02);
        //invoke airpay api
        payService(reqTimeMs,ReqHdr,TrnHdr,ReqId)
        .then( apResp => {
            logger.info('callback message => '+apResp);
            if(helper.isString(apResp)){
                if(helper.IsValidJSONString(apResp)){
                    let data = JSON.parse(apResp);
                    if(String(data["ap_trans_result"]) === String(apResCode.transResult.SUCCESSFUL)){
                        logger.info('SUCCESSFUL');
                        resMsg01.ResHdr.ResCd = '0000';
                        resMsg01.ResHdr.ResMsg = resCode.code["0000"]["msgEng"] +' : '+ apResCode.transResult[data["ap_trans_result"]] +', '+apResCode.transStatus[data["ap_trans_status"]];
                        resMsg01.ResDtl.ErrCd = '0000';

                        resMsg01.ResDtl.Ref1 = data["ap_trans_id"];
                        resMsg01.ResDtl.Ref3 = data["partner_trans_id"]; //partner tran id
                        resMsg01.ResDtl.Ref4 = data["ap_buyer_ref"];
                        //resMsg01.ResDtl.Ref5 = data["trans_amount"];
                        resMsg01.ResDtl.Ref6 = moment(data["ap_pay_time"],"YYYYMMDDHHmmss").format('MM/DD/YYYY HH:mm:ss');
                    }else{
                        resMsg01.ResHdr.ResCd = '8006';
                        resMsg01.ResHdr.ResMsg = resCode.code["8006"]["msgEng"] +' : '+ apResCode.transResult[data["ap_trans_result"]] +', '+apResCode.transStatus[data["ap_trans_status"]];
                        resMsg01.ResDtl.ErrCd = '8006';
                        resMsg01.ResDtl.ErrMsgThai = resCode.code["8006"]["msgThai"] +' : '+ apResCode.transResult[data["ap_trans_result"]] +', '+apResCode.transStatus[data["ap_trans_status"]];
                        resMsg01.ResDtl.ErrMsgEng = resCode.code["8006"]["msgEng"] +' : '+ apResCode.transResult[data["ap_trans_result"]] +', '+apResCode.transStatus[data["ap_trans_status"]];
                    }
                    callback(null,resMsg01); 
                }else{ //error_code
                    resMsg01.ResHdr.ResCd = '8006';
                    resMsg01.ResHdr.ResMsg = resCode.code["8006"]["msgEng"] +' : '+ apResCode.errorCode[apResp];
                    resMsg01.ResDtl.ErrCd = '8006';
                    resMsg01.ResDtl.ErrMsgThai = resCode.code["8006"]["msgThai"] +' : '+ apResCode.errorCode[apResp];
                    resMsg01.ResDtl.ErrMsgEng = resCode.code["8006"]["msgEng"] +' : '+ apResCode.errorCode[apResp];  
                    callback(null,resMsg01); 
                }
            }
           
        })
        .catch(err => {
            logger.info('error catch on response message');
            resMsg01.ResHdr.ResCd = '8006';
            resMsg01.ResHdr.ResMsg = resCode.code["8006"]["msgEng"] +' : '+ apResCode.errorCode["PLEASE_RETRY"];
            resMsg01.ResDtl.ErrCd = '8006';
            resMsg01.ResDtl.ErrCd = '8006';
            resMsg01.ResDtl.ErrMsgThai = err.message;
            resMsg01.ResDtl.ErrMsgEng  = err.message
            callback(null,resMsg01); 
        }) 
    }else{
       //Invalid action code
       let resMsg01 = Object.assign({},_resMsg01_02);
       resMsg01.ResHdr.ResCd = '8006';
       resMsg01.ResHdr.ResMsg = resCode.code["8006"]["msgEng"] +' : '+ apResCode.errorCode["PLEASE_RETRY"];
       resMsg01.ResDtl.ErrCd = '8006';
       resMsg01.ResDtl.ErrCd = '8006';
       resMsg01.ResDtl.ErrMsgThai = 'INVALID ACTION CODE';
       resMsg01.ResDtl.ErrMsgEng  = 'INVALID ACTION CODE';
       callback(null,resMsg01); 
    }
        
}
//Request message type 02
const processMsg02 = (actionCode ,atgReq ,reqTimeMs,callback) => {
    var ReqHdr = atgReq["RegMsg02"]["ReqHdr"];
    var TrnHdr = atgReq["RegMsg02"]["TrnHdr"];
    var ReqId  = atgReq["RegMsg02"]["ReqHdr"]["ReqID"];

    if(actionCode === 'APPAY'){
        logger.info('Call AP.PAY service');
        let resMsg02 = Object.assign({},_resMsg01_02);
        payService(reqTimeMs,ReqHdr,TrnHdr,ReqId)
        .then( apResp => {
            if(helper.isString(apResp)){
                logger.info('Data valid JSON : '+helper.IsValidJSONString(apResp));
                if(helper.IsValidJSONString(apResp)){
                    let data = JSON.parse(apResp);
                    console.log(data);
                    if(String(data["ap_trans_result"]) === String(apResCode.transResult.SUCCESSFUL)){
                        resMsg02.ResHdr.ResCd = '0000';
                        resMsg02.ResHdr.ResMsg = resCode.code["0000"]["msgEng"] +' : '+ apResCode.transResult[data["ap_trans_result"]] +', '+apResCode.transStatus[data["ap_trans_status"]];
                        resMsg02.ResDtl.ErrCd = '0000';

                        resMsg02.ResDtl.Ref1 = data["ap_trans_id"];
                        resMsg02.ResDtl.Ref3 = data["partner_trans_id"]; //partner tran id
                        resMsg02.ResDtl.Ref4 = data["ap_buyer_ref"];
                        //resMsg02.ResDtl.Ref5 = data["trans_amount"];
                        resMsg02.ResDtl.Ref6 = data["ap_pay_time"];
                    }else{
                        resMsg02.ResHdr.ResCd = '8006';
                        resMsg02.ResHdr.ResMsg = resCode.code["8006"]["msgEng"] +' : '+ apResCode.transResult[data["ap_trans_result"]] +', '+apResCode.transStatus[data["ap_trans_status"]];
                        resMsg02.ResDtl.ErrCd = '8006';
                        resMsg02.ResDtl.ErrMsgThai = resCode.code["8006"]["msgThai"] +' : '+ apResCode.transResult[data["ap_trans_result"]] +', '+apResCode.transStatus[data["ap_trans_status"]];
                        resMsg02.ResDtl.ErrMsgEng = resCode.code["8006"]["msgEng"] +' : '+ apResCode.transResult[data["ap_trans_result"]] +', '+apResCode.transStatus[data["ap_trans_status"]];
                    }
                    callback(null,resMsg02); 
                }else{ //error_code
                    resMsg02.ResHdr.ResCd = '8006';
                    resMsg02.ResHdr.ResMsg = resCode.code["8006"]["msgEng"] +' : '+ apResCode.errorCode[apResp];
                    resMsg02.ResDtl.ErrCd = '8006';
                    resMsg02.ResDtl.ErrMsgThai = resCode.code["8006"]["msgThai"] +' : '+ apResCode.errorCode[apResp];
                    resMsg02.ResDtl.ErrMsgEng = resCode.code["8006"]["msgEng"] +' : '+ apResCode.errorCode[apResp];  
                    callback(null,resMsg02); 
                }
            }
        })
        .catch(err => {
            resMsg02.ResHdr.ResCd = '8006';
            resMsg02.ResHdr.ResMsg = resCode.code["8006"]["msgEng"] +' : '+ apResCode.errorCode["PLEASE_RETRY"];
            resMsg02.ResDtl.ErrCd = '8006';
            resMsg02.ResDtl.ErrCd = '8006';
            resMsg02.ResDtl.ErrMsgThai = err.message;
            resMsg02.ResDtl.ErrMsgEng  = err.message
            callback(null,resMsg02); 
        })

    }else{
        //Invalid action code
       let resMsg02 = Object.assign({},_resMsg01_02);
       resMsg02.ResHdr.ResCd = '8006';
       resMsg02.ResHdr.ResMsg = resCode.code["8006"]["msgEng"] +' : '+ apResCode.errorCode["PLEASE_RETRY"];
       resMsg02.ResDtl.ErrCd = '8006';
       resMsg02.ResDtl.ErrCd = '8006';
       resMsg02.ResDtl.ErrMsgThai = 'INVALID ACTION CODE';
       resMsg02.ResDtl.ErrMsgEng  = 'INVALID ACTION CODE';
       callback(null,resMsg02); 
    }
}

module.exports = processAction;