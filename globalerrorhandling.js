module.exports=(err,req,res,next)=>{
    if (err.isOperational){
        return res.status(err.statusCode||500).json({
            status:err.status||'',
            message:err.message||''
        })

    }
    else{
        if (err.name==='TokenExpiredError') return res.status(401).json({redirectedTo:'/login'})
        if (err.name==='JsonWebTokenError') return res.status(401).json({redirectedTo:'/login'})
        console.error(err)
        return res.status(500).json({
            status:'fail',
            message:'something went wrong'
        })
    }
}