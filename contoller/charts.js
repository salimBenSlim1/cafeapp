const DailyItemStat = require("../models/items_stats");
const DailyCafeStat = require("../models/order_stats");
const { fn, col, literal, Op } = require("sequelize");

function buildRange(preset, from, to) {
  const now   = new Date();
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end   = new Date(now); end.setHours(23, 59, 59, 999);

  switch (preset) {
    case "today":
      return { start, end };

    case "yesterday": {
      const s = new Date(start); s.setDate(s.getDate() - 1);
      const e = new Date(s);     e.setHours(23, 59, 59, 999);
      return { start: s, end: e };
    }

    case "7d": {
      const s = new Date(start); s.setDate(s.getDate() - 6);
      return { start: s, end };
    }

    case "30d": {
      const s = new Date(start); s.setDate(s.getDate() - 29);
      return { start: s, end };
    }

    case "90d": {
      const s = new Date(start); s.setDate(s.getDate() - 89);
      return { start: s, end };
    }

    case "mtd": {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: s, end };
    }

    case "ytd": {
      const s = new Date(now.getFullYear(), 0, 1);
      return { start: s, end };
    }

    case "custom": {
      if (!from || !to) throw new Error("custom preset requires from and to");
      const s = new Date(from); s.setHours(0, 0, 0, 0);
      const e = new Date(to);   e.setHours(23, 59, 59, 999);
      return { start: s, end: e };
    }

    default:
      throw new Error(`Unknown preset: ${preset}`);
  }
}
function chooseGrouping(start, end) {
  const days = Math.round((end - start) / 86400000);
  if (days <= 9)  return "day";
  if (days <= 31) return "week";
  return "month";
}

function buildWeekBuckets(start, end) {
  const totalDays = Math.round((end - start) / 86400000) + 1;
  // snap to 4 buckets for 30-day windows, 1 for 7-day
  const numBuckets = totalDays <= 9 ? 1 : 4;
  const bucketSize = Math.ceil(totalDays / numBuckets);
  const buckets = [];

  for (let i = 0; i < numBuckets; i++) {
    const bStart = new Date(start);
    bStart.setDate(bStart.getDate() + i * bucketSize);
    bStart.setHours(0, 0, 0, 0);

    const bEnd = new Date(bStart);
    bEnd.setDate(bEnd.getDate() + bucketSize - 1);
    bEnd.setHours(23, 59, 59, 999);
    if (bEnd > end) bEnd.setTime(end.getTime());

    const label = `Week ${i + 1}`;
    buckets.push({ label, start: bStart, end: bEnd });
  }
  return buckets;
}

function dateOnly(d) {
  return d.toISOString().slice(0, 10);
}


module.exports = {
  getStats: async (req, res) => {
    try {
      const cafeId = req.cafe.id;
      if (!cafeId) return res.status(400).json({ error: "no cafe found" });

      const preset  = req.query.preset || "30d";
      const { start, end } = buildRange(preset, req.query.from, req.query.to);
      const grouping = chooseGrouping(start, end);

      const dateWhere = {
        cafeId,
        createdAt: { [Op.between]: [start, end] },
      };

      const len    = end - start;
      const pEnd   = new Date(start.getTime() - 1);
      const pStart = new Date(pEnd.getTime() - len);

      const [cafeRows, itemRows, prevCafeRows] = await Promise.all([

        DailyCafeStat.findAll({
          where: dateWhere,
          attributes: [
            [fn("SUM", col("totalRevenue")), "totalRevenue"],
            [fn("SUM", col("totalOrders")),  "totalOrders"],
          ],
          raw: true,
        }),

        DailyItemStat.findAll({
          where: dateWhere,
          attributes: [
            "itemName",
            "itemCategory",
            [fn("SUM", col("totalSold")),    "totalSold"],
            [fn("SUM", col("totalRevenue")), "totalRevenue"],
          ],
          group: ["itemName", "itemCategory"],
          order: [[literal("totalSold"), "DESC"]],
          raw: true,
        }),

        DailyCafeStat.findAll({
          where: {
            cafeId,
            createdAt: { [Op.between]: [pStart, pEnd] },
          },
          attributes: [
            [fn("SUM", col("totalRevenue")), "totalRevenue"],
            [fn("SUM", col("totalOrders")),  "totalOrders"],
          ],
          raw: true,
        }),
      ]);

      const sales = itemRows.map(row => ({
        name:         row.itemName,
        category:     row.itemCategory || "",
        totalSold:    parseInt(row.totalSold)    || 0,
        totalRevenue: parseFloat(row.totalRevenue) || 0,
      }));

      const totalRevenue = parseFloat(cafeRows[0]?.totalRevenue) || 0;
      const totalOrders  = parseInt(cafeRows[0]?.totalOrders)    || 0;
      const totalSold    = sales.reduce((s, i) => s + i.totalSold, 0);

      const prevRevenue = parseFloat(prevCafeRows[0]?.totalRevenue) || 0;
      const prevOrders  = parseInt(prevCafeRows[0]?.totalOrders)    || 0;

      const pctRev    = prevRevenue > 0
        ? ((totalRevenue - prevRevenue) / prevRevenue * 100).toFixed(1)
        : null;
      const pctOrders = prevOrders > 0
        ? ((totalOrders - prevOrders) / prevOrders * 100).toFixed(1)
        : null;

      let revenue = [];

      if (grouping === "day") {
        const dailyRows = await DailyCafeStat.findAll({
          where: dateWhere,
          attributes: [
            [fn("DATE", col("createdAt")), "period"],
            [fn("SUM", col("totalRevenue")), "revenue"],
            [fn("SUM", col("totalOrders")),  "orders"],
          ],
          group: [fn("DATE", col("createdAt"))],
          order: [[fn("DATE", col("createdAt")), "ASC"]],
          raw: true,
        });
        revenue = dailyRows.map(r => ({
          period:  r.period,
          revenue: parseFloat(r.revenue) || 0,
          orders:  parseInt(r.orders)    || 0,
        }));

      } else if (grouping === "week") {
        const buckets = buildWeekBuckets(start, end);

        const allDaily = await DailyCafeStat.findAll({
          where: dateWhere,
          attributes: ["createdAt", "totalRevenue", "totalOrders"],
          raw: true,
        });

        revenue = buckets.map(bucket => {
          const rows = allDaily.filter(r => {
            const d = new Date(r.createdAt);
            return d >= bucket.start && d <= bucket.end;
          });
          return {
            period:  bucket.label,
            revenue: rows.reduce((s, r) => s + (parseFloat(r.totalRevenue) || 0), 0),
            orders:  rows.reduce((s, r) => s + (parseInt(r.totalOrders)    || 0), 0),
          };
        });

      } else {
        const monthlyRows = await DailyCafeStat.findAll({
          where: dateWhere,
          attributes: [
            [fn("DATE_FORMAT", col("createdAt"), "%Y-%m"), "period"],
            [fn("SUM", col("totalRevenue")), "revenue"],
            [fn("SUM", col("totalOrders")),  "orders"],
          ],
          group: [fn("DATE_FORMAT", col("createdAt"), "%Y-%m")],
          order: [[fn("DATE_FORMAT", col("createdAt"), "%Y-%m"), "ASC"]],
          raw: true,
        });
        revenue = monthlyRows.map(r => ({
          period:  r.period,
          revenue: parseFloat(r.revenue) || 0,
          orders:  parseInt(r.orders)    || 0,
        }));
      }

      res.json({
        meta: {
          preset,
          grouping,
          from: start.toISOString(),
          to:   end.toISOString(),
        },
        summary: {
          totalRevenue,
          totalSold,
          totalOrders,
          avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
          pctRev,
          pctOrders,
        },
        revenue, 
        sales,    
      });

    } catch (e) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  },
};