const { default: axios } = require("axios");
const Payement = require("../models/paiement");
const Cafe = require("../models/cafe");

module.exports={
    pay:async(req,res)=>{
        if (!req.body.amount  || parseInt(req.body.amount) <= 3000) {
    return res.status(400).json({ error: 'Invalid amount' });
}
        const paymentData = {
      "receiverWalletId":`${process.env.KONNECT_WALLET_ID}`,
    "token":"TND",
    "amount":req.body.amount,
    "successUrl":`${process.env.PAYMENT_SUCCESS_URL}`,
    "silentWebhook":"false",
    "failUrl":`${process.env.PAYMENT_FAIL_URL}`
      
      }
        try {
        const response = await axios.post("https://api.preprod.konnect.network/api/v2/payments/init-payment", paymentData, {
            headers: {
                'x-api-key':`${process.env.KONNECT_API_KEY}`,
                'Content-Type': 'application/json'
            }
        })

        res.json(response.data); 

        } catch (e) {
            res.status(500).json({'server error':e})
        }
    },
    insertPayment:async(req,res)=>{
        const {id}=req.params
        axios.get("https://api.sandbox.konnect.network/api/v2/payments/"+id)
        .then(async(r)=>
        {
            const data=await Payement.create({
                amount:r.data.payment.transactions[0].amount,
                method:r.data.payment.transactions[0].method,
                token:r.data.payment.transactions[0].token,
                status:r.data.payment.transactions[0].status,
                senderName:r.data.payment.transactions[0].extSenderInfo.name,
                senderEmail:r.data.payment.transactions[0].extSenderInfo.email,
                details:r.data.payment.transactions[0].details,
                DateOfPayment:r.data.payment.createdAt,
                cafeId:req.cafe.id
                
            })

            // Check success and date within 30 days
    const paymentDate = new Date(r.data.payment.createdAt);
const now = new Date();
const monthLater=new Date()
monthLater=now.setMonth(now.getMonth() +30);

const diffDays = (now - paymentDate) / (1000 * 60 * 60 * 24); // convert ms to days
            if (r.data.payment.transactions[0].status=='success'&& diffDays <= 30){
                await Cafe.update({
                    
                    verifiedPayment:'1',apiKeyExpiresAt:monthLater},{where:{id:req.cafe.id}})
            }

            if (!data) return res.status(400).json('something went wrong')
            return res.status(200).json('created')


        }
    )
        .catch(err=>console.log(err))
    },
    getCoffePayments:async(req,res)=>{
        try {
        const data=await Cafe.findAll({
            include:[{model:Payement}]
        })
        if (!data) return res.status(400).json('something went wrong')
        res.status(200).json(data)
        } catch (e) {
            res.status(500).json('server err')
        }
    },
  checkPaymentStatus: async (req, res) => {
    const id = req.cafe.id;
    console.log(id);
    try {
        const cafe = await Cafe.findOne({
            where: { id, verifiedPayment: '1' }
        });

        const payment = await Payement.findOne({ 
            include:[{model:Cafe}],
            // fixed typo here
            where: { cafeId: id, status: 'success' },
            order: [['createdAt', 'DESC']]        // optional: get latest payment
        });

        if (!cafe || !payment) return res.status(400).json('pay');
         // Check if payment is older than 30 days
        const paymentDate = new Date(payment.DateOfPayment);
        const now = new Date();
        const diffTime = now - paymentDate; // difference in ms
        const diffDays = diffTime / (1000 * 60 * 60 * 24); // convert ms to days

        if (diffDays > 31) { // > 31 means payment is outdated
            return res.status(400).json('Payment expired. Please pay again.');
        }

        return res.status(200).json(payment);

    } catch (e) {
        console.error(e);
        res.status(500).json('server err');
    }
},
createPaymentForCoffe:async(req,res)=>{
    try {
        const data=await Payement.create(req.body)
        if (!data) return res.status(400).json('no ')
        res.status(200).json(data)
        
    } catch (e) {
        
        res.status(500).json('server err');
    }  
},
deletePaymentForCoffe:async(req,res)=>{
    const id=req.params.id
    try {
    const data=await Payement.destroy({where:{id}})
    if (!data) return res.status(400).json('something wrong')
    res.status(200).json('deleted')
    } catch (e) {
        res.status(500).json('server err')
    }
},
endPaymentForCoffee:async(req,res)=>{
    
 
    try {
    const data=await Cafe.update({verifiedPayment:'0'},{where:{id:req.params.id}})
    if (!data) return res.status(400).json('something went wrong')
        res.status(200).json('updated')
        
    } catch (e) {
        res.status(500).json('serv err')
    }
}

}