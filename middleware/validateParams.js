module.exports=(schema)=>{
    return (req,res,next)=>{
        const {error,value}=schema.validate(req.params)
        if (error){

            const errors=error.details.map(err=>({
                field: err.path[0],
                message: err.message
            }
            
            
        ))
        return res.status(400).json({
            status:'fail',
            message:'validation error',
            errors
        })
    }
    req.validatedData=value
    next()

    }
}