const express = require("express")
const helmet = require('helmet');
require('./jobs/cleanupOrderItems');
const cors = require('cors');
const verifyCafe=require('./middleware/cafeMiddlwareBasic')
const orderItems = require('./routes/orderItem');
const verifyUser=require('./middleware/userMiddlware')
const http = require("http");
const  socketService  = require("./socket");
const cookieParser = require("cookie-parser");
const app = express();
const server = http.createServer(app);
socketService.init(server); 
const db = require('./models/relation');
const itemRoute = require("./routes/items");
const { globalLimiter } = require('./middleware/rateLimiter');
const orderRoute = require("./routes/order");
const cafeRoute = require("./routes/cafe");
const messageFormRoute = require("./routes/messagesForm");
const functionRoute = require("./routes/functions");
const tableRoute = require("./routes/table");
const chartRoute = require("./routes/charts");
const { getItemsForUser } = require("./contoller/items");
const { startSession } = require("./contoller/tables");
const serverRoute = require("./routes/servers");
const userRoute = require("./routes/users");
const router = require("./routes/cloudinary");
const { refresh, logout } = require("./contoller/cafe");
const globalerrorhandling = require("./globalerrorhandling");
const validateCookie = require("./middleware/validateCookie");

const { cookieSchema } = require("./validators/cookie.validator");
const aiRouter = require("./routes/ai");
const { getLastOrder } = require("./contoller/order");
// Configure CORS to accept both localhost and ngrok
app.use(cors({
 origin: ['http://localhost:3000',"https://api.anthropic.com/v1/messages"],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 'Authorization','token','server-token',
   'token-jwt','Access-Control-Allow-Origin','x-socket-id'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range','Access-Control-Allow-Origin']
}));

app.use(express.json())
app.use(helmet());
app.use(globalLimiter);
app.use(cookieParser());
app.use("/api", verifyCafe);
app.use('/',messageFormRoute)
app.use('/',cafeRoute)
app.use('/api',orderItems)
app.use('/api',serverRoute)
app.use('/api',itemRoute)
app.use('/api',orderRoute)
app.use('/',functionRoute)
app.use('/',userRoute)
app.use('/',aiRouter)
app.use('/api',tableRoute)
app.use('/api',chartRoute)
app.get('/getUserItems',verifyUser,getItemsForUser)
app.get('/orders/last',verifyUser,getLastOrder)
app.get('/start-session',startSession)
app.use('/api',router)
app.post('/refresh',validateCookie(cookieSchema),refresh)
app.post('/logout',logout)
app.use(globalerrorhandling)
server.listen(Number(process.env.PORT) || 5000,"0.0.0.0",()=>{
    console.log('connected')
})