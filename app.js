var express = require('express');
var soapApp = require('./controllers/soapApp');
var uuidV1 = require('uuid/v1');
var httpContext = require('express-http-context');
var pool = require('./common/pg/pooled');

var app = express(); 
app.use(httpContext.middleware);
// Run the context for each request. Assign a unique identifier to each request

soapApp(app);
app.use(function(req, res, next) {
    // console.log('middleware() => ')
    // console.log(req)
    // //httpContext.set('reqId', uuidV1());
    //console.log(httpContext.get('reqId'));
    next();
});
//load pg

module.exports = app;