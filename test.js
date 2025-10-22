const axios =require('axios')
const tabs={"cafecreme":4,"delice":2}
var s=0
axios.get('http://localhost:5000/api/tables')
.then(r=>{
    r.data.forEach(e=>{
    JSON.parse(e.Commands[0]['items']).forEach(o=>{
            s+=parseInt(o.split(':')[1])*tabs[`${o.split(':')[0]}`]
        })
        // console.log(data[0])
        
        
    
    })
    
    
})
.catch(err=>console.log(err))
.then(r=>console.log(s))
