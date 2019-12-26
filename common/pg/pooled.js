const pg = require('pg');
const config   = require('./../config'); //load env variable
var logger = require('./../logging/winston')(__filename);

var dbconfig = {
    user: config.pg_user,
    host: config.pg_host,
    password: config.pg_password,
    database: config.pg_database,
    port: config.pg_port,
    max: 500,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
}

const pool = new pg.Pool(dbconfig);

// the pool will emit an error on behalf of any idle clients
// it contains if a backend error or network partition happens
pool.on('error', (err, client) => {
    logger.info('[Database pool connection error] =>');
    logger.info('Unexpected error on idle client', err);
    pool.end();
    process.exit(-1);
  })

 module.exports = pool; 


// pool.connect()
//     .then(client => {
//         return client.query('SELECT * FROM requests WHERE id = $1', [1])
//             .then(res => {
//                 client.release();
//                 console.log(res.rows[0]);
//             })
//             .catch(e => {
//                 client.release();
//                 console.log(e.stack);
//             })
//   })
//   .catch(err => {
//     console.log(err);
//   })
//   .finally(() => pool.end());