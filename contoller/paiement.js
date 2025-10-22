const { default: axios } = require("axios");

module.exports={
    pay:async(req,res)=>{
        const paymentData = {
      "receiverWalletId":"676016d78c93c45d0a4cc470",
    "token":"TND",
    "amount":req.body.amount,
    "successUrl":"http://localhost:3000/success",
    "silentWebhook":"false",
    "failUrl":"http://localhost:3000/cancel"
      
      }
        try {
        const response = await axios.post("https://api.preprod.konnect.network/api/v2/payments/init-payment", paymentData, {
            headers: {
                'x-api-key':'676016d78c93c45d0a4cc468:KmKUuGDDZrhtz7Qb',
                'Content-Type': 'application/json'
            }
        })

        res.json(response.data); 

        } catch (e) {
            res.status(500).json({'server error':e})
        }
    }
}