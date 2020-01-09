var pool = require('./../common/pg/pooled');
var logger = require('./../common/logging/winston')(__filename);
var helper = require('./../common/helper');

/**
 * called from app.js
 * @param {*} req 
 * @param {*} jsonReq 
 */
const saveRawRequest = (req,jsonReq) => {
    pool.connect()
    .then(client => {
        return client.query('INSERT INTO raw_requests (raw_request,json_request) ' +
                            ' values( $1 ,$2)', [req,jsonReq])
            .then(res => {
                client.release();
            })
            .catch(e => {
                client.release();
                logger.info('[saveRawRequest] error => '+ e.stack);
            })
    })
    .catch(err => {
        logger.info('[Pool connect] error => '+ err.stack);
    })

}

const getSite = (bu_code) => {
    pool.connect()
    .then(client => {
        return client.query('SELECT site_group_name from sites where bu_code = $1 ', [bu_code])
        .then(res => {
             client.release();
             return res.row[0].site_group_name;
        })
        .catch(e => {
             client.release();
             logger.info('[getSite] error => '+ e.stack);
        })
    })
    .catch(err => {
        logger.info('[Pool connect] error => '+ err.stack);
    })
}

/**
 * called from app.js
 * @param {*} reqId 
 * @param {*} reqEndpoint 
 * @param {*} reqType 
 * @param {*} reqMessage 
 */
const saveReqId = (reqTimeMs,reqId,reqEndpoint,reqType,reqMessage) => {
    pool.connect()
    .then(client => {
        return client.query('INSERT INTO requests (request_id,tran_request_id,request_endpoint,request_type,request_message,response_type,response_message) ' +
                            ' values( $1 ,$2 ,$3 ,$4 , $5 ,$6 ,$7 )', [reqTimeMs,reqId,reqEndpoint,reqType,reqMessage,null,null])
            .then(res => {
                client.release();
            })
            .catch(e => {
                client.release();
                logger.info('[saveReqId] error => '+ e.stack);
            })
  })
  .catch(err => {
    logger.info('[Pool connect] error => '+ err.stack);
  })
}

const saveResId = (reqTimeMs,reqId,reqEndpoint,resType,resMessage) => {
    pool.connect()
    .then(client => {
        return client.query('UPDATE requests SET response_type = $4 ,response_message =$5  ' +
                            ' where request_id= $1 and tran_request_id=$2 and request_endpoint=$3 ', [reqTimeMs,reqId,reqEndpoint,resType,resMessage])
            .then(res => {
                client.release();
            })
            .catch(e => {
                client.release();
                logger.info('[saveResId] error => '+ e.stack);
            })
  })
  .catch(err => {
    logger.info('[Pool connect] error => '+ err.stack);
  })
}

//ReqId,JSON.stringify(apReqBody),apReqBody,'airpay',null,null,null,'sending',1
const savePaymentRequest = (reqTimeMs,reqId,reqMessage,reqJsonMessage,endpointService,resMessage,resJsonMessage,resTime,status,seq) => {
    pool.connect()
    .then(client => {
        return client.query('INSERT INTO payment_requests (request_id,tran_request_id,request_message,request_json_message,endpoint_service,response_message,response_json_message,response_time,status,request_sequence) ' +
                            ' values( $1 ,$2 ,$3 ,$4 , $5 ,$6 ,$7 ,$8, $9 ,$10)', [reqTimeMs,reqId,reqMessage,reqJsonMessage,endpointService,resMessage,resJsonMessage,resTime,status,seq])
            .then(res => {
                client.release();
            })
            .catch(e => {
                client.release();
                logger.info('[savePaymentRequest] error => '+ e.stack);
            })
  })
  .catch(err => {
    logger.info('[Pool connect] error => '+ err.stack);
  })
}

const savePaymentResponse = (reqTimeMs,reqId,reqMessage,reqJsonMessage,endpointService,resMessage,resJsonMessage,resTime,status,seq) => {
    if(!helper.IsValidJSONString(resJsonMessage)){
        resJsonMessage = null
    }
    pool.connect()
    .then(client => {
        return client.query('UPDATE payment_requests '+
                            ' SET  response_time = now() , response_message = $5   ,response_json_message = $6 ,status = $7'+
                            ' WHERE  request_id = $1 and tran_request_id = $2 and endpoint_service = $3 and request_sequence = $4 '
                            , [reqTimeMs,reqId,endpointService,seq,resMessage,resJsonMessage,status])
            .then(res => {
                client.release();
            })
            .catch(e => {
                client.release();
                logger.info('[savePaymentResponse] error => '+ e.stack);
            })
  })
  .catch(err => {
    logger.info('[Pool connect] error => '+ err.stack);
  })
}

module.exports = {getSite ,saveReqId ,saveResId ,saveRawRequest ,savePaymentRequest ,savePaymentResponse}