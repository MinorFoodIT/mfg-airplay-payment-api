var express = require("express")
var pool = require('./../../common/pg/pooled');
var logger = require("./../../common/logging/winston")(__filename)
var router = express.Router()

const helper = require('./../../common/helper')

router.get("/v1/sites", (req, res) => {
    logger.info("[Admin] GET /v1/sites")
    try{
        pool.connect()
        .then( (client) => {
              client.query('SELECT site_group,site_group_name,bu_code,site_id from sites')
                    .then( sites => {
                        logger.info('execute query => done');
                        client.release();
                        res.json(
                            {
                                code: 200,
                                message: 'Failed',
                                results: sites.rows
                            }
                        )
                    })
                    .catch(err => {
                        client.release();
                        logger.info('[getSite] error => '+ err.stack);
                        res.json(
                            {
                                code: 500,
                                message: 'Failed',
                                results: []
                            }
                        )
                    })
                
        })
        .catch(e =>{
            logger.info('[getSite] error => '+ e.stack);
            res.json(
                {
                    code: 500,
                    message: 'Failed',
                    results: []
                }
            )
        })
    }
    catch(err){
        logger.info('[Pool connect] error => '+ err.stack);
        res.json(
            {
                code: 500,
                message: 'Failed',
                results: []
            }
        )
    }

   

})

module.exports = router;