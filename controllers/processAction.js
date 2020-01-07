var logger = require('./../common/logging/winston')(__filename);
var helper = require('./../common/helper');
Promise = require('bluebird');
var payService = Promise.promisify(require('./../services/airpay/appay'));
var apResCode = require('./../model/apResCode');
var resCode = require('./../model/resCode');

const _resMsg01 = {
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
        "Ref4": ''
    }
}
//ATG message incoming
const processAction =  (actionCode ,atgReq,reqTimeMs,callback) => {
    if( atgReq["RegMsg01"] ){
       var resMsg01 = processMsg01(actionCode,atgReq,reqTimeMs);
       callback(null,resMsg01);
    }else if(atgReq["RegMsg02"]){
        var resMsg02 = processMsg02(actionCode,atgReq,reqTimeMs);
        callback(null,resMsg02);
    }
}

//Request message type 01
const processMsg01 = (actionCode ,atgReq ,reqTimeMs) => {
    var ReqHdr = atgReq["RegMsg01"]["ReqHdr"];
    var TrnHdr = atgReq["RegMsg01"]["TrnHdr"];
    var ReqId  = atgReq["RegMsg01"]["ReqHdr"]["ReqID"];

    if(actionCode === 'APPAY'){
        logger.info('call AP.PAY');
        let resMsg01 = Object.assign({},_resMsg01);
        payService(reqTimeMs,ReqHdr,TrnHdr,ReqId)
        .then( apResp => {
            logger.info('callback message => '+apResp);
            if(helper.isString(apResp)){
                if(helper.IsValidJSONString(apResp)){
                    let data = JSON.parse(apResp);
                    if(String(data["ap_trans_result"]) === String(apResCode.transResult.SUCCESSFUL)){
                        resMsg01.ResHdr.ResCd = '0000';
                        resMsg01.ResHdr.ResMsg = resCode.code["0000"] +' : '+ apResCode.transResult[data["ap_trans_result"]] +', '+apResCode.transStatus[data["ap_trans_status"]];
                        resMsg01.ResDtl.ErrCd = '0000';

                        resMsg01.ResDtl.Ref1 = data["ap_trans_id"];
                        resMsg01.ResDtl.Ref3 = data["partner_trans_id"]; //partner tran id
                        resMsg01.ResDtl.Ref4 = data["ap_buyer_ref"];
                        resMsg01.ResDtl.Ref5 = data["trans_amount"];
                        resMsg01.ResDtl.Ref6 = data["ap_pay_time"];
                    }else{
                        resMsg01.ResHdr.ResCd = '8006';
                        resMsg01.ResHdr.ResMsg = resCode.code["8006"] +' : '+ apResCode.transResult[data["ap_trans_result"]] +', '+apResCode.transStatus[data["ap_trans_status"]];
                        resMsg01.ResDtl.ErrCd = '8006';
                        resMsg01.ResDtl.ErrMsgThai = resCode.code["8006"] +' : '+ apResCode.transResult[data["ap_trans_result"]] +', '+apResCode.transStatus[data["ap_trans_status"]];
                        resMsg01.ResDtl.ErrMsgEng = resCode.code["8006"] +' : '+ apResCode.transResult[data["ap_trans_result"]] +', '+apResCode.transStatus[data["ap_trans_status"]];
                    }
                }else{ //error_code
                    resMsg01.ResHdr.ResCd = '8006';
                    resMsg01.ResHdr.ResMsg = resCode.code["8006"] +' : '+ apResCode.errorCode[apResp];
                    resMsg01.ResDtl.ErrCd = '8006';
                    resMsg01.ResDtl.ErrMsgThai = resCode.code["8006"] +' : '+ apResCode.errorCode[apResp];
                    resMsg01.ResDtl.ErrMsgEng = resCode.code["8006"] +' : '+ apResCode.errorCode[apResp];   
                }
            }
            return resMsg01;
        })
        .catch(err => {
            return resMsg01;
        }) 
    }else{
       //Invalid action code
       return Object.assign({},_resMsg01);
    }
}
//Request message type 02
const processMsg02 = (actionCode ,atgReq ,reqTimeMs) => {
    var ReqHdr = atgReq["RegMsg02"]["ReqHdr"];
    var TrnHdr = atgReq["RegMsg02"]["TrnHdr"];
    var ReqId  = atgReq["RegMsg02"]["ReqHdr"]["ReqID"];

    if(actionCode === 'APPAY'){
        logger.info('call AP.PAY');
        payService(reqTimeMs,ReqHdr,TrnHdr,ReqId)
        .then( apResp => {
            //apResp
            return {"status": 'ok'};
        })
        .catch(err => {

        })

        
    }
}

module.exports = processAction;