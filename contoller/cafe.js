const Cafe = require("../models/cafe");
const Item = require("../models/item");
const Orders = require("../models/orders");
const OrderItems = require("../models/orderItems");
const Table = require("../models/table");
const Server = require("../models/servers");
const WaiterDaily=require('../models/waiter_stats')
const ItemStat=require('../models/items_stats')
const OrderStat=require('../models/order_stats')
const sequelize = require("../db/db-config");
const CafeService = require("../services/cafe");
const TokenService = require("../services/token");
const tokenService = new TokenService()
const cafeService = new CafeService({
  orderStatModel:OrderStat,
  itemStatModel:ItemStat,
  waiterDailyModel:WaiterDaily,
    cafeModel: Cafe,
    tokenService,
    ordersModel: Orders,
    orderItemsModel: OrderItems,
    serverModel: Server,
    tableModel: Table,
    sequelize
})

const PRINTER_ROUTES = {
  'chicha': ['smoking'],
  'bar': ['coffee', 'drink'],
  'cuisine': ['food', 'dessert'],
  'caisse': 'all' // Receives complete order
};

// Generate receipt HTML for specific printer station
function generateStationReceipt(order, stationName, items) {
  const currentDate = new Date();
  const dateStr = currentDate.toLocaleDateString('fr-TN');
  const timeStr = currentDate.toLocaleTimeString('fr-TN');
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${stationName} - Receipt</title>
      <style>
        @page {
          size: 80mm auto;
          margin: 0;
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          width: 80mm;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          padding: 5mm;
        }
        .center {
          text-align: center;
        }
        .bold {
          font-weight: bold;
        }
        .header {
          border-bottom: 2px dashed #000;
          padding-bottom: 8px;
          margin-bottom: 8px;
        }
        .section {
          margin-bottom: 8px;
        }
        .divider {
          border-bottom: 1px dashed #000;
          margin: 8px 0;
        }
        .items {
          margin: 8px 0;
        }
        .item-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
        }
        .total {
          border-top: 2px dashed #000;
          padding-top: 8px;
          margin-top: 8px;
          font-size: 14px;
        }
        .footer {
          margin-top: 10px;
          border-top: 2px dashed #000;
          padding-top: 8px;
        }
        .station-name {
          background: #000;
          color: #fff;
          padding: 4px;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="header center">
        <div class="bold station-name">${stationName.toUpperCase()}</div>
        <div style="font-size: 14px; margin-top: 4px;">BON DE COMMANDE</div>
        <div style="margin-top: 4px;">------------------------</div>
        <div>${dateStr}</div>
        <div>${timeStr}</div>
      </div>

      <div class="section">
        <div class="bold">Table: ${order.Table?.number || 'N/A'}</div>
        <div>Commande #${order.id}</div>
      </div>

      <div class="divider"></div>

      <div class="items">
        <div class="bold" style="margin-bottom: 6px;">ARTICLES</div>
        ${items.map(item => `
          <div class="item-row">
            <div>${item.quantity}x ${item.Item.name}</div>
            ${stationName === 'CAISSE' ? `<div>${(item.quantity * item.price).toFixed(3)} TND</div>` : ''}
          </div>
        `).join('')}
      </div>

      ${stationName === 'CAISSE' ? `
        <div class="total">
          <div class="item-row bold">
            <div>TOTAL</div>
            <div>${order.totalPrice.toFixed(3)} TND</div>
          </div>
        </div>
        <div class="footer center">
          <div class="bold" style="font-size: 14px; margin-bottom: 4px;">MERCI!</div>
          <div>A bientôt</div>
        </div>
      ` : ''}

      <script>
        window.onload = function() {
          window.print();
          setTimeout(function() {
            window.close();
          }, 100);
        };
      </script>
    </body>
    </html>
  `;
}
module.exports={
  printOrder:async(req,res)=>{
    
  try {
    const { orderId } = req.body;
    
    // Fetch order with items and their categories
    const order = await Orders.findOne({where:{id:orderId}, 
      include: [
        {
          model: OrderItems,
          include: [
            {
              model: Item,
              attributes: ['id', 'name', 'category']
            }
          ]
        },
        {
          model: Table,
          attributes: ['number']
        }
      ]
    }
  )

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Group items by printer station
    const itemsByStation = {
      chicha: [],
      bar: [],
      cuisine: [],
      caisse: order.OrderItems // Caisse gets all items
    };
    console.log(order)
    // Route items to appropriate stations
    order.OrderItems.forEach(orderItem => {
      const category = orderItem.Item.category;
      
      if (PRINTER_ROUTES.chicha.includes(category)) {
        itemsByStation.chicha.push(orderItem);
      }
      if (PRINTER_ROUTES.bar.includes(category)) {
        itemsByStation.bar.push(orderItem);
      }
      if (PRINTER_ROUTES.cuisine.includes(category)) {
        itemsByStation.cuisine.push(orderItem);
      }
    });

    // Generate print data for each station that has items
    const printJobs = [];

    if (itemsByStation.chicha.length > 0) {
      printJobs.push({
        station: 'chicha',
        html: generateStationReceipt(order, 'CHICHA', itemsByStation.chicha)
      });
    }

    if (itemsByStation.bar.length > 0) {
      printJobs.push({
        station: 'bar',
        html: generateStationReceipt(order, 'BAR', itemsByStation.bar)
      });
    }

    if (itemsByStation.cuisine.length > 0) {
      printJobs.push({
        station: 'cuisine',
        html: generateStationReceipt(order, 'CUISINE', itemsByStation.cuisine)
      });
    }

    // Always print to caisse
    printJobs.push({
      station: 'caisse',
      html: generateStationReceipt(order, 'CAISSE', itemsByStation.caisse)
    });

    res.json({ 
      success: true, 
      printJobs 
    });
  } catch (error) {
    console.error('Print error:', error);
    res.status(500).json({ error: 'Failed to generate print jobs' });
  }

  },
 login: async (req, res, next) => {
        try {
            const { email, password } = req.validatedData
            const { accessToken, refreshToken, cafe } = await cafeService.login(
                email, password
            )
            res.cookie("refreshToken", refreshToken, {
                httpOnly: true,
                secure: false,
                sameSite: "strict",
                maxAge: 7 * 24 * 60 * 60 * 1000
            })
            res.status(200).json({
                status: 'success',
                message: 'Login successful',
                data: { accessToken, cafe }
            })
        } catch (e) {
            next(e)
        }
    },
    getCoffee:async(req,res,next)=>{
      try {
        
        
        const coffees=await cafeService.getCoffe()
        if (coffees) return res.status(200).json({status:'success',data:coffees})
        }
        catch (e) {
          next(e)
      } 
      
    },
    deleteCafe: async (req, res, next) => {
        const { id } = req.validatedData
        try {
          
            const data = await cafeService.deleteCafe(id,sequelize)
            res.status(200).json(data)
        } catch (e) {
            next(e)
        }
    },

    updateCafe: async (req, res, next) => {
        const { id } = req.validatedData
        try {
            await cafeService.updateCafe(id)
            res.status(200).json({ status: 'success', message: 'cafe updated' })
        } catch (e) {
            next(e)
        }
    },

    updateCreatedAt: async (req, res, next) => {
        const { id } = req.validatedData
        
        try {
            await cafeService.updateCreatedAt(id, req.body.createdAt)
            res.status(200).json({ status: 'success', message: 'cafe updated' })
        } catch (e) {
            next(e)
        }
    },

    refresh: async (req, res, next) => {
        const { refreshToken } = req.validatedData
        try {
            const {token,id} = await cafeService.refresh(refreshToken)
           
            res.status(200).json({ accessToken: token,id })
        } catch (e) {
            next(e)
        }
    },

    logout: async (req, res) => {
        res.clearCookie("refreshToken", {
            httpOnly: false,
            sameSite: "strict",
            path: '/'
        })
        res.json({ message: "Logged out" })
    },
    getId:async(req,res)=>{
      const {id}=req.cafe
      res.status(200).json(id)
    }
}
