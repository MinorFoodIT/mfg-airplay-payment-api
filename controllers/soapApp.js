Promise = require('bluebird');
var path = require('path');
var soap = require('soap');
var helper = require('./../common/helper');
var logger = require('./../common/logging/winston')(__filename);
var parser = require('fast-xml-parser');
//var he = require('he');
//var uuidV1 = require('uuid/v1');
const moment = require('moment');
var processAction = Promise.promisify(require('./processAction'));
const dao = require('./../services/dbClient');
var resCode = require('./../model/resCode');
const myCache = require('./../common/nodeCache');

dao.getSite()
.then(rows => {
  myCache.set("sites",rows);
  console.log(myCache.get("sites"));
})
.catch(err => {
  logger.info('error load cache : sites data'); 
})

//Load Webservice definetion
var xml = require('fs').readFileSync(path.join(__dirname,'posservices.wsdl'), 'utf8');
var service = {
    PosServices: {
      PosServicesSoap: {
        RequestService01: function (args,cb,headers, req) {  //soap header
          //console.log(req.connection);//.Socket.parser.HTTPParser.parsingHeadersStart);  
          var reqTimeMs = new Date().getTime(); //YYYYMMDDHHMISS       
          logger.info('[RequestService01] incoming => '+reqTimeMs);
          var responseXML = mapRequestToResponse(args) //initial xml

          let tran_request_id = args["RegMsg01"]["TrnHdr"]["StrCd"]+'-'+reqTimeMs+'-'+args["RegMsg01"]["ReqHdr"]["TxID"];
          saveRequestMessage(args,reqTimeMs,tran_request_id);   //entries message save to db
          
          var actionCode  = helper.isNullEmptry(args["RegMsg01"]["ReqHdr"]["ActCd"])?'': args["RegMsg01"]["ReqHdr"]["ActCd"]

          processAction(actionCode,args,reqTimeMs)
          .then( (resp) => {
            logger.info('[RequestService01] processAction resp '+JSON.stringify(resp));
            let _responseXML = assignResCode('01',responseXML,resp,null);
            cb(_responseXML);
            dao.saveResId(reqTimeMs,tran_request_id,'','message01',_responseXML);
          })
          .catch((err) => {
            logger.info('[RequestService01] processAction error => '+err);
            //console.log(err.stack);
            let _responseXML = assignResCode('01',responseXML,null,err);
            cb(_responseXML);
            dao.saveResId(reqTimeMs,tran_request_id,'','error_message01',_responseXML);
          })
          
        },
        RequestService02: function (args,cb,headers, req) {
          var reqTimeMs = new Date().getTime(); 
          logger.info('[RequestService01] soap message incoming => starting request-id '+reqTimeMs);    
          var responseXML = mapRequestToResponse(args);
          let tran_request_id = args["RegMsg02"]["TrnHdr"]["StrCd"]+'-'+reqTimeMs+'-'+args["RegMsg02"]["ReqHdr"]["TxID"];   
          saveRequestMessage(args,reqTimeMs,tran_request_id);
          var actionCode = helper.isNullEmptry(args["RegMsg02"]["ReqHdr"]["ActCd"])?'': args["RegMsg02"]["ReqHdr"]["ActCd"]
         
          processAction(actionCode,args,reqTimeMs)
          .then( (resp) => {
            logger.info('[RequestService02] processAction resp => '+JSON.stringify(resp));
            let _responseXML = assignResCode('02',responseXML,resp,null);
            cb(_responseXML);
            dao.saveResId(reqTimeMs,tran_request_id,'','message02',_responseXML);
          })
          .catch((err) => {
            logger.info('RequestService02] processAction error => '+err);
            //console.log(err.stack);
            let _responseXML = assignResCode('02',responseXML,null,err);
            cb(_responseXML);
            dao.saveResId(reqTimeMs,tran_request_id,'','error_message02',_responseXML);
          })
        },
        RequestService03: function (args) {
            var responseXML = mapRequestToResponse(args)
            return responseXML;
        },
      }
    }
  };

 //Start express-server with soap service 
const soapApp = (app) => {
    var port = normalizePort(process.env.PORT || '4000');

    var options = {
      ignoreNameSpace : true,
    };

    app.listen(port, function(){
        //Note: /wsdl route will be handled by soap module
        //and all other routes & middleware will continue to work
        var soapServer = soap.listen(app, '/airpay', service, xml, function(){
            logger.info('[Server] started '+new Date());
        });
     
        // soapServer.on('headers', function(headers, methodName) {
        //   // It is possible to change the value of the headers
        //   // before they are handed to the service method.
        //   // It is also possible to throw a SOAP Fault
        // });

        //logging
        soapServer.log = function(type, data) {
            // type is 'received' or 'replied'
            if(type === 'received')
            {
                //logger.info(data);
                if( parser.validate(data) === true) { //optional (it'll return an object in case it's not valid)
                    var jsonObj = parser.parse(data,options);
                    //save raw xml to db
                    dao.saveRawRequest(data,JSON.stringify(jsonObj)); 
                }
            }else if(type === 'replied')
            {
                // logger.info('replied =>');
                // logger.info(data);
            }else{
                //type is info
                //logger.info('Info: '+data);
            } 
        };
        

        //Map soap request    
        soapServer.on('request', function(request, methodName){
            // logger.info('[AtgMessageRequestType] '+ methodName);
            //logger.info('requestXML => '+ JSON.stringify(request));
           
            
          });
        //Map response  
        soapServer.on('response', function(response, methodName){
          //console.log(httpContext.get('reqId'));
            // logger.info('responseXML => '+ JSON.stringify(response));
                //assert.equal(response.result, responseXML);
                //assert.equal(methodName, 'sayHello');
                //response.result = response.result.replace('Bob','John');
              });
    });
}

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
    var port = parseInt(val, 10);
    if (isNaN(port)) {
      // named pipe
      return val;
    }
    if (port >= 0) {
      // port number
      return port;
    }
    return false;
  }

function assignResCode(massageType,responseXML,resp,error) {
  if(!helper.isNullEmptry(resp)){
    if(massageType === '01'){
      responseXML["RequestService01Result"]["ResHdr"]["ResCd"]  = resp["ResHdr"]["ResCd"];
      responseXML["RequestService01Result"]["ResHdr"]["ResMsg"] = resp["ResHdr"]["ResMsg"];
      responseXML["RequestService01Result"]["ResDtl"]["ErrCd"] = resp["ResDtl"]["ErrCd"];
      responseXML["RequestService01Result"]["ResDtl"]["ErrMsgEng"]  = resp["ResDtl"]["ErrMsgEng"];
      responseXML["RequestService01Result"]["ResDtl"]["ErrMsgThai"] = resp["ResDtl"]["ErrMsgThai"];
      responseXML["RequestService01Result"]["ResDtl"]["Ref1"] = resp["ResDtl"]["Ref1"].length > 0?resp["ResDtl"]["Ref1"]:'';
      responseXML["RequestService01Result"]["ResDtl"]["Ref3"] = resp["ResDtl"]["Ref3"].length > 0?resp["ResDtl"]["Ref3"]:'';
      responseXML["RequestService01Result"]["ResDtl"]["Ref4"] = resp["ResDtl"]["Ref4"].length > 0?resp["ResDtl"]["Ref4"]:'';
      //responseXML["RequestService01Result"]["ResDtl"]["Ref5"] = resp["ResDtl"]["Ref5"].length > 0?resp["ResDtl"]["Ref5"]:'';
      responseXML["RequestService01Result"]["ResDtl"]["Ref6"] = resp["ResDtl"]["Ref6"].length > 0?resp["ResDtl"]["Ref6"]:'';
      responseXML["RequestService01Result"]["ResDtl"]["Ref8"] = resp["ResDtl"]["Ref6"].length > 0?resp["ResDtl"]["Ref8"]:'';
      responseXML["RequestService01Result"]["ResDtl"]["Ref9"] = resp["ResDtl"]["Ref6"].length > 0?resp["ResDtl"]["Ref9"]:'';
      responseXML["RequestService01Result"]["ResDtl"]["Ref10"] = resp["ResDtl"]["Ref6"].length > 0?resp["ResDtl"]["Ref10"]:'';
    }else if(massageType === '02'){
      responseXML["RequestService02Result"]["ResHdr"]["ResCd"]  = resp["ResHdr"]["ResCd"];
      responseXML["RequestService02Result"]["ResHdr"]["ResMsg"] = resp["ResHdr"]["ResMsg"];
      responseXML["RequestService02Result"]["ResDtl"]["ErrCd"] = resp["ResDtl"]["ErrCd"];
      responseXML["RequestService02Result"]["ResDtl"]["ErrMsgEng"]  = resp["ResDtl"]["ErrMsgEng"];
      responseXML["RequestService02Result"]["ResDtl"]["ErrMsgThai"] = resp["ResDtl"]["ErrMsgThai"];
      responseXML["RequestService02Result"]["ResDtl"]["Ref1"] = resp["ResDtl"]["Ref1"].length > 0?resp["ResDtl"]["Ref1"]:'';
      responseXML["RequestService02Result"]["ResDtl"]["Ref3"] = resp["ResDtl"]["Ref3"].length > 0?resp["ResDtl"]["Ref3"]:'';
      responseXML["RequestService02Result"]["ResDtl"]["Ref4"] = resp["ResDtl"]["Ref4"].length > 0?resp["ResDtl"]["Ref4"]:'';
      //responseXML["RequestService02Result"]["ResDtl"]["Ref5"] = resp["ResDtl"]["Ref5"].length > 0?resp["ResDtl"]["Ref5"]:'';
      responseXML["RequestService02Result"]["ResDtl"]["Ref6"] = resp["ResDtl"]["Ref6"].length > 0?resp["ResDtl"]["Ref6"]:'';
      responseXML["RequestService02Result"]["ResDtl"]["Ref8"] = resp["ResDtl"]["Ref6"].length > 0?resp["ResDtl"]["Ref8"]:'';
      responseXML["RequestService02Result"]["ResDtl"]["Ref9"] = resp["ResDtl"]["Ref6"].length > 0?resp["ResDtl"]["Ref9"]:'';
      responseXML["RequestService02Result"]["ResDtl"]["Ref10"] = resp["ResDtl"]["Ref6"].length > 0?resp["ResDtl"]["Ref10"]:'';
    }
  }else if(!helper.isNullEmptry(error)){
    if(massageType === '01'){
      responseXML["RequestService01Result"]["ResHdr"]["ResCd"]  = '8007';
      responseXML["RequestService01Result"]["ResHdr"]["ResMsg"] = resCode["code"]["8007"]["msgEng"];
      responseXML["RequestService01Result"]["ResDtl"]["ErrCd"] = '8007';
      responseXML["RequestService01Result"]["ResDtl"]["ErrMsgEng"]  = resCode["code"]["8007"]["msgEng"];
      responseXML["RequestService01Result"]["ResDtl"]["ErrMsgThai"] = resCode["code"]["8007"]["msgEng"];
    }else if(massageType === '02'){
      responseXML["RequestService02Result"]["ResHdr"]["ResCd"]  = '8007';
      responseXML["RequestService02Result"]["ResHdr"]["ResMsg"] = resCode["code"]["8007"]["msgEng"];
      responseXML["RequestService02Result"]["ResDtl"]["ErrCd"] = '8007';
      responseXML["RequestService02Result"]["ResDtl"]["ErrMsgEng"]  = resCode["code"]["8007"]["msgEng"];
      responseXML["RequestService02Result"]["ResDtl"]["ErrMsgThai"] = resCode["code"]["8007"]["msgEng"];
    }
  }
  
  return responseXML;
} 

function mapRequestToResponse(args){
    var responseJson = {};
    if(args["RegMsg01"]){
      responseJson["RequestService01Result"] = {}
      responseJson["RequestService01Result"]["ResHdr"] = {}
      responseJson["RequestService01Result"]["ResDtl"] = {}

      responseJson["RequestService01Result"]["ResHdr"]["ActCd"]  =  args["RegMsg01"]["ReqHdr"]["ActCd"];
      responseJson["RequestService01Result"]["ResHdr"]["ResID"]  =  args["RegMsg01"]["ReqHdr"]["ReqID"];
      responseJson["RequestService01Result"]["ResHdr"]["ResDt"]  =  moment().format('YYYYMMDDHHmmss');
      responseJson["RequestService01Result"]["ResHdr"]["ResCd"]  = '';
      responseJson["RequestService01Result"]["ResHdr"]["ResMsg"] = '';
      
      responseJson["RequestService01Result"]["ResDtl"]["ErrCd"] = '';
      responseJson["RequestService01Result"]["ResDtl"]["ErrMsgEng"] = '';
      responseJson["RequestService01Result"]["ResDtl"]["ErrMsgThai"] = '';
      responseJson["RequestService01Result"]["ResDtl"]["ApvlCd"] = args["RegMsg01"]["ReqHdr"]["ActCd"];
      responseJson["RequestService01Result"]["ResDtl"]["Ref1"] = '';
      responseJson["RequestService01Result"]["ResDtl"]["Ref2"] = args["RegMsg01"]["TrnHdr"]["StrCd"];
      responseJson["RequestService01Result"]["ResDtl"]["Ref3"] = '';
      responseJson["RequestService01Result"]["ResDtl"]["Ref4"] = '';
      responseJson["RequestService01Result"]["ResDtl"]["Ref5"] = args["RegMsg01"]["TrnHdr"]["TtlAmt"];
      responseJson["RequestService01Result"]["ResDtl"]["Ref6"] = args["RegMsg01"]["TrnHdr"]["TrnDt"];
      responseJson["RequestService01Result"]["ResDtl"]["Ref7"] = args["RegMsg01"]["TrnHdr"]["ChkNo"];
      responseJson["RequestService01Result"]["ResDtl"]["Ref8"] = '';
      responseJson["RequestService01Result"]["ResDtl"]["Ref9"] = '';
      responseJson["RequestService01Result"]["ResDtl"]["Ref10"] = '';

      responseJson["RequestService01Result"]["MinorID"] = 0; //uuidV1();
      
    }else if(args["RegMsg02"]){
      responseJson["RequestService02Result"] = {}
      responseJson["RequestService02Result"]["ResHdr"] = {}
      responseJson["RequestService02Result"]["ResDtl"] = {}

      responseJson["RequestService02Result"]["ResHdr"]["ActCd"]  =  args["RegMsg02"]["ReqHdr"]["ActCd"];
      responseJson["RequestService02Result"]["ResHdr"]["ResID"]  =  args["RegMsg02"]["ReqHdr"]["ReqID"];
      responseJson["RequestService02Result"]["ResHdr"]["ResDt"]  =  moment().format('YYYYMMDDHHmmss');
      responseJson["RequestService02Result"]["ResHdr"]["ResCd"]  = '';
      responseJson["RequestService02Result"]["ResHdr"]["ResMsg"] = '';
      
      responseJson["RequestService02Result"]["ResDtl"]["ErrCd"] = '';
      responseJson["RequestService02Result"]["ResDtl"]["ErrMsgEng"] = '';
      responseJson["RequestService02Result"]["ResDtl"]["ErrMsgThai"] = '';
      responseJson["RequestService02Result"]["ResDtl"]["ApvlCd"] = '';
      responseJson["RequestService02Result"]["ResDtl"]["Ref1"] = '';
      responseJson["RequestService02Result"]["ResDtl"]["Ref2"] = args["RegMsg02"]["TrnHdr"]["StrCd"];
      responseJson["RequestService02Result"]["ResDtl"]["Ref3"] = '';
      responseJson["RequestService02Result"]["ResDtl"]["Ref4"] = '';
      responseJson["RequestService02Result"]["ResDtl"]["Ref5"] = args["RegMsg02"]["TrnHdr"]["TtlAmt"];
      responseJson["RequestService02Result"]["ResDtl"]["Ref6"] = args["RegMsg02"]["TrnHdr"]["TrnDt"];
      responseJson["RequestService02Result"]["ResDtl"]["Ref7"] = args["RegMsg02"]["TrnHdr"]["ChkNo"];
      responseJson["RequestService02Result"]["ResDtl"]["Ref8"] = '';
      responseJson["RequestService02Result"]["ResDtl"]["Ref9"] = '';
      responseJson["RequestService02Result"]["ResDtl"]["Ref10"] = '';

      responseJson["RequestService02Result"]["MinorID"] = 0; //uuidV1();
    }
    return responseJson;
}

function saveRequestMessage(request,reqTimeMs,tran_request_id){
  if(request["RegMsg01"]["ReqHdr"]["ReqID"]){ 
    //let reqId = request["RegMsg01"]["ReqHdr"]["ReqID"]
    dao.saveReqId(reqTimeMs,tran_request_id,'','message01',JSON.stringify(request))
  }else if(request["RegMsg02"]["ReqHdr"]["ReqID"]){
    //let reqId = request["RegMsg02"]["ReqHdr"]["ReqID"]
    dao.saveReqId(reqTimeMs,tran_request_id,'','message02',JSON.stringify(request))
  }
} 

module.exports = soapApp;