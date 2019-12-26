var util = require('util');

function formatJSON(jsonObj){
   return JSON.stringify(jsonObj,null,2);
}

function formatJSONWrap(jsonObj){
    return JSON.stringify(jsonObj);
}

function IsValidJSONString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

// Returns if a value is a string
function isString (value) {
    return typeof value === 'string' || value instanceof String;
}

// Returns if a value is really a number
function isNumber (value) {
    return typeof value === 'number' && isFinite(value);
}

// Returns if a value is an array
function isArray (value) {
    return value && typeof value === 'object' && value.constructor === Array;
}

// Returns if a value is a function
function isFunction (value) {
    return typeof value === 'function';
}

// Returns if a value is an object
function isObject (value) {
    return value && typeof value === 'object' && value.constructor === Object;
}

// Returns if a value is null
function isNull (value) {
    return value === null;
}

// Returns if a value is undefined
function isUndefined (value) {
    return typeof value === 'undefined';
}

function isNullEmptry (value) {
    return isNull(value) || isUndefined(value) || value.length === 0;
}

// Returns if a value is a boolean
function isBoolean (value) {
    return typeof value === 'boolean';
}

// Returns if a value is a regexp
function isRegExp (value) {
    return value && typeof value === 'object' && value.constructor === RegExp;
}

// Returns if value is an error object
function isError (value) {
    return value instanceof Error && typeof value.message !== 'undefined';
}

// Returns if value is a date object
function isDate (value) {
    return value instanceof Date;
}

// Returns if a Symbol
function isSymbol (value) {
    return typeof value === 'symbol';
}

function printText(desc,passObject){
    if(isNull(passObject)) {
        return util.format('%s', desc);
    }else if(typeof passObject === 'object'){
        return util.format('%s : input %j',desc,passObject);
    }else{
        return util.format('%s : %s',desc ,passObject);
    }
}

function escapeDoubleQuote(str) {
    return str.replace(/(["])/g, "\\$1");
}
function escapeRegExp(str) {
    return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}
function replaceAll(str, find, replace) {
    return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

module.exports = { isString,IsValidJSONString,formatJSON , formatJSONWrap ,printText ,isUndefined ,isNull ,isNullEmptry ,isArray ,isObject ,formatJSONWrap}