var logger = require('./logging/winston')(__filename)
var config = require('./config')
const Agenda = require('agenda');

const agenda = new Agenda();
const sql = require('mssql');
//postgres
const dao = require('./../services/dbClient');

function internalJob(url){
    agenda.database( url ,'agendaJob');

    agenda.define('updatesites', async function(job, done) {
        logger.info('update sites'); 
        try {
            const config = {
                user: 'sysdev_si_api',
                password: 'fitsi#API2B',
                server: '10.201.134.205', // You can use 'localhost\\instance' to connect to named instance
                database: 'MFG_APIService_DB',
            }
            let pool = await sql.connect(config);
            let result = await pool.request()
            //.input('input_parameter', sql.Int, value)
            .query('select * from Master_Sites')

            // make sure that any items are correctly URL encoded in the connection string
            if(result.recordset){
                //console.dir(result.recordset[0]);
                for(i=0; i< result.recordset.length; i++){
                    let = result.recordset[i];
                    logger.info('doing bucode '+row["BusinessUnit"]);
                    await dao.saveSite(row["SiteGroup_ID"],row["SiteName"],row["SiteID"],row["SiteNumber"],row["BusinessUnit"]);
                }
                // result.recordset.forEach( async(row) => {
                // });
            } 
            done();
        } catch (err) {
            // ... error checks
            logger.info('[Job] updatesites error '+err);
            done();
        }
    });

    agenda.on('ready', async function() {
        await agenda.start();
        logger.info('[agenda] ready');
        //await agenda.every('10 0 * * *',['updatesites']);
        await agenda.every('5 minutes',['updatesites']);
        logger.info('[agenda] job scheduled');
    });
}

module.exports = {internalJob}