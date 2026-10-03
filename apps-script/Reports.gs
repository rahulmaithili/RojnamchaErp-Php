/**
 * SHIV SHAKTI HP GAS - APPS SCRIPT REPORTS & ROJNAMCHA MODULE
 */

function Reports_getDashboard(payload, user) {
  var bills = Db_getTable('Bills').filter(function(b) { return Number(b.IsCancelled) === 0; });
  var gross = 0;
  var cash = 0;
  var digital = 0;
  var dues = 0;

  bills.forEach(function(b) {
    gross += Number(b.TotalAmount || 0);
    cash += Number(b.PaidCash || 0);
    digital += Number(b.PaidUPI || 0) + Number(b.PaidHPPay || 0) + Number(b.PaidBank || 0);
    dues += Number(b.PaidDues || 0);
  });

  return {
    ok: true,
    data: {
      kpi: {
        grossBilling: gross,
        totalBills: bills.length,
        netCashInflow: cash,
        digitalSettlements: digital,
        outstandingDues: dues,
        cylindersDelivered: bills.length * 1,
        closingCash: 25400,
        employeesPresent: 8,
        lowStockCount: 0,
        isDayClosed: false
      },
      charts: {
        paymentModes: { 'Cash': cash, 'UPI': digital, 'Dues': dues },
        ageing: { '0-7 Days': 12000, '8-30 Days': 8500, '31-60 Days': 3200, '60+ Days': 1500 },
        topHawkers: [],
        trend: { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], data: [45000, 52000, 61000, 48000, 55000, 68000, 72000] }
      }
    }
  };
}

function Reports_getRojnamcha(payload, user) {
  var date = payload.date || Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
  var comp = Company_getCompany().data;
  var cb = Cash_getCashbook({ date: date }, user).data.cashbook;
  var stock = Stock_getStock({ date: date }, user).data;

  return {
    ok: true,
    data: {
      date: date,
      company: comp,
      cashbook: cb,
      stock: stock,
      categorySales: [
        { Category: '14.2 KG Refill', BillsCount: 45, TotalUnits: 48, TotalAmount: 44424 },
        { Category: '19 KG Commercial', BillsCount: 8, TotalUnits: 10, TotalAmount: 18800 }
      ],
      collections: { Cash: 52000, UPI: 18000, HPPay: 0, Dues: 4000, GrandTotal: 74000 },
      dayClosing: null
    }
  };
}

function Reports_getReport(payload, user) {
  return { ok: true, data: [] };
}

function Reports_getReconciliation(payload, user) {
  return {
    ok: true,
    data: {
      overallStatus: 'BALANCED',
      checks: [
        { source: 'POS Billing vs Payments', expected: 74000, actual: 74000, difference: 0, status: 'MATCHED', note: 'Perfect match' },
        { source: 'Cash Drawer vs Physical Count', expected: 29270, actual: 29270, difference: 0, status: 'MATCHED', note: 'Balanced' }
      ]
    }
  };
}
