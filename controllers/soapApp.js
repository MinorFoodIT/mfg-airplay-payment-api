Promise = require('bluebird');
var path = require('path');
var soap = require('soap');
var helper = require('./../common/helper');
var logger = require('./../common/logging/winston')(__filename);
var parser = require('fast-xml-parser');
var he = require('he');

var uuidV1 = require('uuid/v1');
const moment = require('moment');
var processAction = Promise.promisify(require('./processAction'));
const dao = require('./../services/dbClient');

//Webservice definetion
var xml = require('fs').readFileSync(path.join(__dirname,'posservices.wsdl'), 'utf8');
var service = {
    PosServices: {
      PosServicesSoap: {
        RequestService01: function (args,cb,headers, req) {
          //console.log(req.connection);//.Socket.parser.HTTPParser.parsingHeadersStart);  
          var reqTimeMs = new Date().getTime();        
          saveRequestMessage(args,reqTimeMs);

          var responseXML = mapRequestToResponse(args)
          var actionCode = helper.isNullEmptry(args["RegMsg01"]["ReqHdr"]["ActCd"])?'': args["RegMsg01"]["ReqHdr"]["ActCd"]

          processAction(actionCode,args,reqTimeMs)
          .then( (resp) => {
            logger.info('[RequestService01] callback processAction resp '+JSON.stringify(resp));
            
            return assignResCode('01',responseXML,resp);
          })
          .catch((err) => {
            logger.info('[RequestService01] processAction error => '+err);
            console.log(err.stack);
          })
          
        },
        RequestService02: function (args,cb,headers, req) {
          var reqTimeMs = new Date().getTime();        
          saveRequestMessage(args,reqTimeMs);
          var responseXML = mapRequestToResponse(args)
          var actionCode = helper.isNullEmptry(args["RegMsg02"]["ReqHdr"]["ActCd"])?'': args["RegMsg02"]["ReqHdr"]["ActCd"]
          processAction(actionCode,args,reqTimeMs)
          .then( (resp) => {
            logger.info('[RequestService02] callback processAction resp => '+JSON.stringify(resp));
            return assignResCode('02',responseXML,resp);
          })
          .catch((err) => {
            logger.info('RequestService02] processAction error => '+err);
            console.log(err.stack);
          })
        },
        RequestService03: function (args) {
            return {
                greeting: args.firstName
            };
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
                //logger.info(data);
            }else{
                //type is info
                //logger.info('Info: '+data);
            } 
        };
        

        //Map soap request    
        soapServer.on('request', function(request, methodName){
            logger.info('[AtgMessageRequestType] '+ methodName);
            //logger.info('requestXML => '+ JSON.stringify(request));
           
            
          });
        //Map response  
        soapServer.on('response', function(response, methodName){
          //console.log(httpContext.get('reqId'));
            //logger.info('responseXML => '+ JSON.stringify(response));
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

function assignResCode(massageType,responseXML,resp) {
  logger.info('responseXML => ');
  console.log(responseXML);

  logger.info('resp => ');
  console.log(resp);

  if(massageType === '01'){
    responseXML["ResMsg01"]["ResHdr"]["ResCd"]  = resp["ReqHdr"]["ResCd"];
    responseXML["ResMsg01"]["ResHdr"]["ResMsg"] = resp["ReqHdr"]["ResMsg"];
    responseXML["ResMsg01"]["ResDtl"]["ErrCd"] = resp["ResDtl"]["ErrCd"];
    responseXML["ResMsg01"]["ResDtl"]["ErrMsgEng"]  = resp["ResDtl"]["ErrMsgEng"];
    responseXML["ResMsg01"]["ResDtl"]["ErrMsgThai"] = resp["ResDtl"]["ErrMsgThai"];
    responseXML["ResMsg01"]["ResDtl"]["Ref1"] = resp["ResDtl"]["Ref1"].length > 0?resp["ResDtl"]["Ref1"]:'';
    responseXML["ResMsg01"]["ResDtl"]["Ref3"] = resp["ResDtl"]["Ref3"].length > 0?resp["ResDtl"]["Ref3"]:'';
    responseXML["ResMsg01"]["ResDtl"]["Ref4"] = resp["ResDtl"]["Ref4"].length > 0?resp["ResDtl"]["Ref4"]:'';
    responseXML["ResMsg01"]["ResDtl"]["Ref5"] = resp["ResDtl"]["Ref5"].length > 0?resp["ResDtl"]["Ref5"]:'';
    responseXML["ResMsg01"]["ResDtl"]["Ref6"] = resp["ResDtl"]["Ref6"].length > 0?resp["ResDtl"]["Ref6"]:'';
    responseXML["ResMsg01"]["ResDtl"]["Ref8"] = resp["ResDtl"]["Ref6"].length > 0?resp["ResDtl"]["Ref8"]:'';
    responseXML["ResMsg01"]["ResDtl"]["Ref9"] = resp["ResDtl"]["Ref6"].length > 0?resp["ResDtl"]["Ref9"]:'';
    responseXML["ResMsg01"]["ResDtl"]["Ref10"] = resp["ResDtl"]["Ref6"].length > 0?resp["ResDtl"]["Ref10"]:'';
  }else if(massageType === '02'){
    responseXML["ResMsg02"]["ResHdr"]["ResCd"]  = resp["ReqHdr"]["ResCd"];
    responseXML["ResMsg02"]["ResHdr"]["ResMsg"] = resp["ReqHdr"]["ResMsg"];
    responseXML["ResMsg02"]["ResDtl"]["ErrCd"] = resp["ResDtl"]["ErrCd"];
    responseXML["ResMsg02"]["ResDtl"]["ErrMsgEng"]  = resp["ResDtl"]["ErrMsgEng"];
    responseXML["ResMsg02"]["ResDtl"]["ErrMsgThai"] = resp["ResDtl"]["ErrMsgThai"];
    responseXML["ResMsg02"]["ResDtl"]["Ref1"] = resp["ResDtl"]["Ref1"].length > 0?resp["ResDtl"]["Ref1"]:'';
    responseXML["ResMsg02"]["ResDtl"]["Ref3"] = resp["ResDtl"]["Ref3"].length > 0?resp["ResDtl"]["Ref3"]:'';
    responseXML["ResMsg02"]["ResDtl"]["Ref4"] = resp["ResDtl"]["Ref4"].length > 0?resp["ResDtl"]["Ref4"]:'';
    responseXML["ResMsg02"]["ResDtl"]["Ref5"] = resp["ResDtl"]["Ref5"].length > 0?resp["ResDtl"]["Ref5"]:'';
    responseXML["ResMsg02"]["ResDtl"]["Ref6"] = resp["ResDtl"]["Ref6"].length > 0?resp["ResDtl"]["Ref6"]:'';
    responseXML["ResMsg02"]["ResDtl"]["Ref8"] = resp["ResDtl"]["Ref6"].length > 0?resp["ResDtl"]["Ref8"]:'';
    responseXML["ResMsg02"]["ResDtl"]["Ref9"] = resp["ResDtl"]["Ref6"].length > 0?resp["ResDtl"]["Ref9"]:'';
    responseXML["ResMsg02"]["ResDtl"]["Ref10"] = resp["ResDtl"]["Ref6"].length > 0?resp["ResDtl"]["Ref10"]:'';
  }
  return responseXML;
} 

function mapRequestToResponse(args){
    var responseJson = {};
    if(args["RegMsg01"]){
      responseJson["ResMsg01"] = {}
      responseJson["ResMsg01"]["ResHdr"] = {}
      responseJson["ResMsg01"]["ResDtl"] = {}

      responseJson["ResMsg01"]["ResHdr"]["ActCd"]  =  args["RegMsg01"]["ReqHdr"]["ActCd"];
      responseJson["ResMsg01"]["ResHdr"]["ResID"]  =  args["RegMsg01"]["ReqHdr"]["ReqID"];
      responseJson["ResMsg01"]["ResHdr"]["ResDt"]  =  moment().format('YYYYMMDDHHmmss');
      responseJson["ResMsg01"]["ResHdr"]["ResCd"]  = '';
      responseJson["ResMsg01"]["ResHdr"]["ResMsg"] = '';
      
      responseJson["ResMsg01"]["ResDtl"]["ErrCd"] = '';
      responseJson["ResMsg01"]["ResDtl"]["ErrMsgEng"] = '';
      responseJson["ResMsg01"]["ResDtl"]["ErrMsgThai"] = '';
      responseJson["ResMsg01"]["ResDtl"]["ApvlCd"] = '';
      responseJson["ResMsg01"]["ResDtl"]["Ref1"] = '';
      responseJson["ResMsg01"]["ResDtl"]["Ref2"] = args["RegMsg01"]["TrnHdr"]["StrCd"];
      responseJson["ResMsg01"]["ResDtl"]["Ref3"] = '';
      responseJson["ResMsg01"]["ResDtl"]["Ref4"] = '';
      responseJson["ResMsg01"]["ResDtl"]["Ref5"] = args["RegMsg01"]["TrnHdr"]["TtlAmt"];
      responseJson["ResMsg01"]["ResDtl"]["Ref6"] = args["RegMsg01"]["TrnHdr"]["TrnDt"];
      responseJson["ResMsg01"]["ResDtl"]["Ref7"] = args["RegMsg01"]["TrnHdr"]["ChkNo"];
      responseJson["ResMsg01"]["ResDtl"]["Ref8"] = '';
      responseJson["ResMsg01"]["ResDtl"]["Ref9"] = '';
      responseJson["ResMsg01"]["ResDtl"]["Ref10"] = '';

      responseJson["ResMsg01"]["MinorID"] = uuidV1();
      
    }else if(args["RegMsg02"]){
      responseJson["RegMsg02"] = {}
      responseJson["RegMsg02"]["ResHdr"] = {}
      responseJson["RegMsg02"]["ResDtl"] = {}

      responseJson["RegMsg02"]["ResHdr"]["ActCd"]  =  args["RegMsg02"]["ReqHdr"]["ActCd"];
      responseJson["RegMsg02"]["ResHdr"]["ResID"]  =  args["RegMsg02"]["ReqHdr"]["ReqID"];
      responseJson["RegMsg02"]["ResHdr"]["ResDt"]  =  moment().format('YYYYMMDDHHmmss');
      responseJson["RegMsg02"]["ResHdr"]["ResCd"]  = '';
      responseJson["RegMsg02"]["ResHdr"]["ResMsg"] = '';
      
      responseJson["RegMsg02"]["ResDtl"]["ErrCd"] = '';
      responseJson["RegMsg02"]["ResDtl"]["ErrMsgEng"] = '';
      responseJson["RegMsg02"]["ResDtl"]["ErrMsgThai"] = '';
      responseJson["RegMsg02"]["ResDtl"]["ApvlCd"] = '';
      responseJson["RegMsg02"]["ResDtl"]["Ref1"] = '';
      responseJson["RegMsg02"]["ResDtl"]["Ref2"] = args["RegMsg02"]["TrnHdr"]["StrCd"];
      responseJson["RegMsg02"]["ResDtl"]["Ref3"] = '';
      responseJson["RegMsg02"]["ResDtl"]["Ref4"] = '';
      responseJson["RegMsg02"]["ResDtl"]["Ref5"] = args["RegMsg02"]["TrnHdr"]["TtlAmt"];
      responseJson["RegMsg02"]["ResDtl"]["Ref6"] = args["RegMsg02"]["TrnHdr"]["TrnDt"];
      responseJson["RegMsg02"]["ResDtl"]["Ref7"] = args["RegMsg02"]["TrnHdr"]["ChkNo"];
      responseJson["RegMsg02"]["ResDtl"]["Ref8"] = '';
      responseJson["RegMsg02"]["ResDtl"]["Ref9"] = '';
      responseJson["RegMsg02"]["ResDtl"]["Ref10"] = '';

      responseJson["RegMsg02"]["MinorID"] = uuidV1();
    }
    return responseJson;
}

function saveRequestMessage(request,reqTimeMs){
  //if(request["Body"]["RequestService01"]["RegMsg01"]["ReqHdr"]["ReqID"]){
  if(request["RegMsg01"]["ReqHdr"]["ReqID"]){ 
    let reqId = request["RegMsg01"]["ReqHdr"]["ReqID"]
    dao.saveReqId(reqTimeMs,reqId,'','message01',JSON.stringify(request))
  }else if(request["RegMsg02"]["ReqHdr"]["ReqID"]){
    let reqId = request["RegMsg02"]["ReqHdr"]["ReqID"]
    dao.saveReqId(reqTimeMs,reqId,'','message02',JSON.stringify(request))
  }
} 

module.exports = soapApp;