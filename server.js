const express = require("express")
const bodyParser = require('body-parser');
const cors = require('cors');
const orderItems = require('./routes/orderItem');
const helmet =require('helmet')
// const tenantResolver = require('./middleware/tenantResolver');
const http = require("http");
const { initSocket } = require("./socket");
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const server = http.createServer(app);

// Initialize socket and store instance
initSocket(server);
const db = require('./models/relation');
const itemRoute = require("./routes/items");
const { globalLimiter, orderLimiter} = require('./middleware/rateLimiter');
const orderRoute = require("./routes/order");
const verifyApiKey = require("./middleware/verifyApiKey");
const cafeRoute = require("./routes/cafe");
const messageFormRoute = require("./routes/messagesForm");
const functionRoute = require("./routes/functions");
const tableRoute = require("./routes/table");
const { addOrder } = require("./contoller/orderItem");
const chartRoute = require("./routes/charts");
const verifyTableSession = require("./middleware/verifyTableSession");
const { getItemsForUser } = require("./contoller/items");
const { startSession } = require("./contoller/tables");
const { pay, getCoffePayments, createPaymentForCoffe, deletePaymentForCoffe } = require("./contoller/paiement");
const paymentRouter = require("./routes/paiment");
const adminMidlware = require("./middleware/adminMidlware");
// Configure CORS to accept both localhost and ngrok
app.use(cors({
  origin: 'https://cafeapp-frontend-lij4.vercel.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 'Authorization', 'x-api-key', 'key', 'token',
    'X-User-Lng', 'X-User-Lat', 'token-jwt'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));
app.options('*', cors()); // ✅ handle preflight
app.enable('trust proxy');
app.use((req, res, next) => {
  if (req.secure || req.method === 'OPTIONS') return next();
  res.redirect(`https://${req.headers.host}${req.url}`);
});
app.use(express.json())
app.use(bodyParser.json());

// Configure Helmet with custom CSP for WebSocket
// app.use(helmet({
//   contentSecurityPolicy: {
//     directives: {
//       defaultSrc: ["'self'"],
//       connectSrc: ["'self'", 
//         "ws://localhost:5000", 
//         "wss://f3a36c3ff427.ngrok-free.app",
//         "wss://f3a36c3ff427.ngrok-free.app:3000",
//         "http://localhost:5000",
//         "https://f3a36c3ff427.ngrok-free.app"
//       ],
//       // Add other directives as needed
//       imgSrc: ["'self'", "*"],
//       scriptSrc: ["'self'", "'unsafe-inline'"],
//       styleSrc: ["'self'", "'unsafe-inline'"]
//     }
//   }
// }));

// Resolve tenant from subdomain
// app.use(tenantResolver);

// API routes should be defined BEFORE the proxy middleware
app.use("/api", verifyApiKey);
app.use('/',messageFormRoute)
app.use('/',cafeRoute)
app.use('/api',orderItems)
app.use('/api',itemRoute)
app.use('/api',orderRoute)
app.use('/',functionRoute)
app.use('/api',tableRoute)
app.use('/api',chartRoute)
app.use('/api',paymentRouter)
app.post('/addOrder',
  // orderLimiter,
verifyTableSession,
  addOrder)
app.get('/getUserItems/:id',getItemsForUser)
app.get('/start-session',startSession)
app.post('/pay',pay)
app.post('/createUserPayment',adminMidlware,createPaymentForCoffe)
app.delete('/deleteUserPayment/:id',adminMidlware,deletePaymentForCoffe)
app.get('/getPayments',adminMidlware,getCoffePayments)
// Proxy middleware for frontend - handle non-API routes
// app.use('/', createProxyMiddleware({
//     target: 'http://localhost:3000',
//     changeOrigin: true,
//     logLevel: 'debug',
//     filter: (pathname, req) => {
//         // Don't proxy API routes and other specific endpoints
//         return !pathname.startsWith('/api') && 
//                pathname !== '/addOrder' &&
//                pathname !== '/getUserItems' &&
//                pathname !== '/start-session' &&
//                pathname !== '/pay';
//     }
// }));

// Apply global rate limiter to all routes
// app.use(globalLimiter);
server.listen(5000,"0.0.0.0",()=>{
    console.log('connected')
})