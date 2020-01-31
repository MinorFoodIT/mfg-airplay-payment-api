const transResult = {
        NOT_FOUND: 'NOT_FOUND',         //'Transaction is not found in the system',
        SUCCESSFUL: 'SUCCESSFUL' ,      //'Transaction is successful',
        FAILED:  'FAILED',              //'Transaction is failed',
        REFUNDED: 'REFUNDED' ,          //'Transaction is refunded',
        CANCELLED: 'CANCELLED',         //'Transaction is cancelled',
        UNKNOWN: 'UNKNOWN'              //'Transaction status is unknown'               
}

const transStatus = {
    PAYMENT_INIT: 'Transaction is schduled (on receiving the request)',
    PAYMENT_DONE: 'Transaction is completed',
    PAYMENT_FAIL: 'Transaction is failed',
    CANCEL_INIT: 'Cancelation is schduled',
    CANCEL_DONE: 'Cancelation is completed',
    REFUND_FULL_INIT: 'Full refund is schduled',
    REFUND_FULL_DONE: 'Full refund is completed',
    REFUND_PART_INIT: 'Partial refund is schduled',
    REFUND_PART_DONE: 'Partial refund is completed',
    TRANS_NOT_FOUND: 'Partial is not found in the system',
    TRANS_PROCESSING: 'Partial is processing',
    WAIT_BUYER_PAY: 'Waiting the buyer to pay',
    INSUFFICIENT_BALANCE: 'Insufficient funds to pay',
    PAYMENT_LIMIT_EXCEEDED: 'Payment limit has been exceed',
}


const errorCode = {
    INVALID_PARTNER: 'Illegel signature or invalid partner ID',
    INVALID_MERCHANT: 'Invalid merchant store information',
    INVALID_BARCODE: 'Invalid or expired buyer',
    INVALID_PAYMENT: 'Invalid payment',
    INVALID_REFUND: 'Invalid refund',
    INVALID_AMOUNT: 'Invalid payment amount or refund amount or invalid currency',
    INVALID_PARAMS: 'Invalid format of request parameters',
    PLEASE_RETRY: 'Unknown API response',
    NOT_ENOUGH_BALANCE: 'Not enough balance'
}

module.exports = {errorCode,transStatus,transResult}