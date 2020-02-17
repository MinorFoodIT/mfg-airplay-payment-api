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

const getSite =  () => {
    try{
        pool.connect()
        .then( (client) => {
            return client.query('SELECT site_group,site_group_name,bu_code,site_id from sites')
                    .then( res => {
                        logger.info('execute query => done');
                        client.release();
                        return res.rows;
                    })
                    .catch(err => {
                        client.release();
                        logger.info('[getSite] error => '+ err.stack);
                        return [];
                    })
                
        })
        .catch(e =>{
            logger.info('[getSite] error => '+ e.stack);
            return [];
        })
    
        // const res = await pool.query('SELECT site_group,site_group_name,bu_code,site_id from sites ')
        // //return res.rows[0].site_group_name;
        // return res.rows;
    }
    catch(err){
        logger.info('[Pool connect] error => '+ err.stack);
        return [];
    }
}

const getSiteByBu = async (bu_code) => {
    try{
        pool.connect()
        .then(client => {
            return Promise.all(client.query('SELECT site_group,site_group_name,bu_code,site_id from sites where bu_code=$1 ',[bu_code])
                    .then(res => {
                        client.release();
                        logger.info('return '+res.rows);
                        return res.rows;
                    })
                    .catch(err => {
                        client.release();
                        logger.info('[saveSite] error => '+ err.stack);
                    })
            );
        })
        .catch(e =>{
            logger.info('[getSiteByBu] error => '+ e.stack);
        })
    }
    catch(err){
        logger.info('[Pool connect] error => '+ err.stack);
        return [];
    }
}

const saveSite = async (site_group,site_group_name,site_id,site_number,bu_code) => {
            await pool.connect()
            .then( async(client) => {
                  //logger.info('==> clinet');
                  await client.query('SELECT site_group,site_group_name,bu_code,site_id from sites where bu_code=$1 ',[bu_code])
                        .then( async(res) => {
                            //logger.info('====> res');
                            //logger.info('length = '+res.rows.length +' , '+ (Number(res.rows.length) === Number(0)) );
                            if(Number(res.rows.length) === Number(0)){
                                await client.query('INSERT INTO sites (site_group,site_group_name,site_id,site_number,bu_code) ' +
                                                                ' values( $1 ,$2 ,$3 ,$4 ,$5 )', [site_group,site_group_name,site_id,site_number,bu_code])
                                                    .then(res => {
                                                        logger.info('======> insert bucode '+bu_code);
                                                        client.release();
                                                    })
                                                    .catch(e => {
                                                        client.release();
                                                        logger.info('[saveSite] error => '+ e.stack);
                                                    })
                            }else{
                                //logger.info('====> client.release()');
                                client.release();
                            }
                        })
                        .catch(err => {
                            client.release();
                            logger.info('[getSiteByBu] error => '+ err.stack);
                        })
                //    ]);
            })
            .catch(e =>{
                logger.info('[Pool connect] error => '+ e.stack);
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

const savePaymentResponse = (reqTimeMs,reqId,reqMessage,reqJsonMessage,endpointService,resMessage,resJsonMessage,resTime,status,seq,respId) => {
    let dataInResp ;
    let jsonObject_dataInResp;
    if(!helper.isObject(resJsonMessage)){
        resJsonMessage = null
    }else{
        dataInResp = resJsonMessage.data; //String format
        jsonObject_dataInResp = JSON.parse(dataInResp);
    }
    pool.connect()
    .then(client => {
        return client.query('UPDATE payment_requests '+
                            ' SET  response_time = now() , response_message = $5   ,response_json_message = $6 ,status = $7 ,tran_response_id = $8'+
                            ' WHERE  request_id = $1 and tran_request_id = $2 and endpoint_service = $3 and request_sequence = $4 '
                            , [reqTimeMs,reqId,endpointService,seq,resMessage,resJsonMessage,status,respId,jsonObject_dataInResp["ap_trans_result"],jsonObject_dataInResp["ap_trans_status"],jsonObject_dataInResp["trans_amount"]])
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

module.exports = {getSite, saveSite ,saveReqId ,saveResId ,saveRawRequest ,savePaymentRequest ,savePaymentResponse}