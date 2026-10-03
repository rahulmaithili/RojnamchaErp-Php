/**
 * SHIV SHAKTI HP GAS - APPS SCRIPT POS BILLING MODULE
 */

function Billing_listBills(payload, user) {
  var bills = Db_getTable('Bills');
  return { ok: true, data: bills.reverse() };
}

function Billing_getBill(payload, user) {
  var bId = payload.BillID;
  var bills = Db_getTable('Bills');
  var target = null;
  for (var i = 0; i < bills.length; i++) {
    if (bills[i].BillID == bId) {
      target = bills[i];
      break;
    }
  }
  if (!target) return { ok: false, error: { code: 'NOT_FOUND', message: 'Bill not found' } };

  var allItems = Db_getTable('BillItems');
  target.items = allItems.filter(function (it) { return it.BillID == bId; });
  return { ok: true, data: target };
}

function Billing_addBill(payload, user) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    var datePrefix = Utilities.formatDate(new Date(payload.BillDate || Date.now()), 'Asia/Kolkata', 'yyyyMMdd');
    var billNo = 'INV-' + datePrefix + '-' + Math.floor(1000 + Math.random() * 9000);
    var billId = Date.now();

    var totalPaise = Math.round(Number(payload.TotalAmount || 0) * 100);
    var paidCash = Number(payload.PaidCash || 0);
    var paidUPI = Number(payload.PaidUPI || 0);
    var paidHPPay = Number(payload.PaidHPPay || 0);
    var paidDues = Number(payload.PaidDues || 0);
    var paidBank = Number(payload.PaidBank || 0);

    Db_insertRow('Bills', {
      BillID: billId,
      BillNumber: billNo,
      BillDate: payload.BillDate || Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd'),
      CustomerID: payload.CustomerID || '',
      CustomerName: payload.CustomerName || 'Counter',
      CustomerMobile: payload.CustomerMobile || '',
      ConsumerNo: payload.ConsumerNo || '',
      Subtotal: payload.Subtotal || payload.TotalAmount,
      TaxAmount: payload.TaxAmount || 0,
      DiscountAmount: payload.DiscountAmount || 0,
      TotalAmount: payload.TotalAmount || 0,
      TotalPaise: totalPaise,
      SettlementPaise: totalPaise,
      PaidCash: paidCash,
      PaidUPI: paidUPI,
      PaidHPPay: paidHPPay,
      PaidDues: paidDues,
      PaidBank: paidBank,
      Status: 'FINAL',
      IsCancelled: 0,
      CreatedByName: user ? user.fullName : 'Admin',
      CreatedAt: new Date().toISOString()
    });

    var items = payload.items || [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      Db_insertRow('BillItems', {
        BillItemID: billId + i + 1,
        BillID: billId,
        ItemID: it.ItemID || 0,
        ItemName: it.ItemName || '',
        Category: it.Category || 'SALE',
        CylinderType: it.CylinderType || '',
        Quantity: it.Quantity || 1,
        Rate: it.Rate || 0,
        TaxPercent: it.TaxPercent || 0,
        Total: it.Total || 0
      });
    }

    lock.releaseLock();
    return { ok: true, data: { BillID: billId, BillNumber: billNo } };
  } catch (e) {
    lock.releaseLock();
    return { ok: false, error: { code: 'SERVER', message: e.message } };
  }
}

function Billing_cancelBill(payload, user) {
  var bId = payload.BillID;
  var reason = payload.Reason || 'Cancelled';
  var bills = Db_getTable('Bills');
  for (var i = 0; i < bills.length; i++) {
    if (bills[i].BillID == bId) {
      bills[i].IsCancelled = 1;
      bills[i].CancelReason = reason;
      Db_updateRow('Bills', bills[i]._row, bills[i]);
      return { ok: true, message: 'Bill cancelled.' };
    }
  }
  return { ok: false, error: { code: 'NOT_FOUND', message: 'Bill not found' } };
}

function Billing_issueNewConnectionPackage(payload, user) {
  return Billing_addBill(payload, user);
}
