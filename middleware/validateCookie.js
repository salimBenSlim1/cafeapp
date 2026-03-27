module.exports=(schema)=>{
    return (req,res,next)=>{
    const {value,error}=schema.validate({refreshToken: req.cookies.refreshToken })
    if (error){
        const errors=error.details.map(e=>({
            field: e.path[0],
            message: e.message
        }))
        return res.status(400).json({
            status:'fail',
            message: 'Validation Error',
            errors
        })
    }
    req.validatedData=value
    next()
    }
}