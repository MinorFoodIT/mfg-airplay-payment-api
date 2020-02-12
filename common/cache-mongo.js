var logger = require('./logging/winston')(__filename)
const agenda = require('./agentDB');
var mongoose = require('mongoose');

var MongoMemoryServer = require('mongodb-memory-server');

mongoose.Promise = Promise;
const mongod = new MongoMemoryServer.MongoMemoryServer();
const mongooseOpts = { // options for mongoose 4.11.3 and above
    autoReconnect: true,
    reconnectTries: Number.MAX_VALUE,
    reconnectInterval: 1000,
    useNewUrlParser: true,
};

mongod.getConnectionString().then((mongoUri) => {
    mongoose.connect(mongoUri, mongooseOpts);
    mongoose.connection.on('error', () => {
        throw new Error(`[Mongoose] unable to connect to database: ${mongoUri}`);
    });

    mongoose.connection.on('connected', () => {
        logger.info('[Mongoose] cached connection created')
        logger.info('init one job'); 
        //job
        agenda.internalJob(mongoUri);
    });

    mongoose.connection.on('disconnected', () => {
        logger.info('[Mongoose] connection disconnected');
    });
})

exports.stop = function() {
    // you may stop mongod manually
    mongod.stop();
    return 'Mongoose: mongod cache stoped';
}