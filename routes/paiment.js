const paymentRouter=require('express').Router()
const paymentController=require('../contoller/paiement')
const adminMidlware = require('../middleware/adminMidlware')
// paymentRouter.post('/pay',paymentController.pay)
paymentRouter.post('/insertPaymentData/:id',paymentController.insertPayment)
// paymentRouter.post('/createUserPayment',adminMidlware,paymentController.createPaymentForCoffe)
// paymentRouter.get('/getPayments',paymentController.getCoffePayments)
paymentRouter.get('/checkPaymentStatus',paymentController.checkPaymentStatus)
paymentRouter.put('/endPaymentCoffe',paymentController.endPaymentForCoffee)


module.exports=paymentRouter