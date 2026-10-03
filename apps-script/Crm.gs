/**
 * SHIV SHAKTI HP GAS - APPS SCRIPT CUSTOMER CRM & DUES MODULE
 */

function Crm_listCustomers(payload, user) {
  var custs = Db_getTable('Customers');
  return { ok: true, data: custs.reverse() };
}

function Crm_saveCustomer(payload, user) {
  var id = payload.CustomerID;
  if (id) {
    var custs = Db_getTable('Customers');
    for (var i = 0; i < custs.length; i++) {
      if (custs[i].CustomerID == id) {
        Db_updateRow('Customers', custs[i]._row, payload);
        return { ok: true, data: { CustomerID: id } };
      }
    }
  } else {
    payload.CustomerID = Date.now();
    payload.CustomerCode = 'CUST-' + Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyyMMdd') + '-' + Math.floor(1000 + Math.random() * 9000);
    payload.CreatedAt = new Date().toISOString();
    Db_insertRow('Customers', payload);
    return { ok: true, data: { CustomerID: payload.CustomerID } };
  }
}

function Crm_getCustomer360(payload, user) {
  var id = payload.CustomerID;
  var custs = Db_getTable('Customers');
  var cust = null;
  for (var i = 0; i < custs.length; i++) {
    if (custs[i].CustomerID == id) {
      cust = custs[i];
      break;
    }
  }
  var bills = Db_getTable('Bills').filter(function(b) { return b.CustomerID == id; });
  var dues = Db_getTable('CustomerDues').filter(function(d) { return d.CustomerID == id; });

  return {
    ok: true,
    data: {
      customer: cust,
      bills: bills,
      dues: dues,
      metrics: { averageRefillDays: 28, totalBillsCount: bills.length }
    }
  };
}

function Crm_listDues(payload, user) {
  var dues = Db_getTable('CustomerDues');
  return { ok: true, data: dues.reverse() };
}

function Crm_recoverDue(payload, user) {
  var dueId = payload.DueID;
  var amt = Number(payload.Amount || 0);
  var dues = Db_getTable('CustomerDues');

  for (var i = 0; i < dues.length; i++) {
    if (dues[i].DueID == dueId) {
      var d = dues[i];
      d.PaidAmount = (Number(d.PaidAmount) || 0) + amt;
      d.RemainingAmount = Math.max(0, (Number(d.RemainingAmount) || 0) - amt);
      if (d.RemainingAmount === 0) d.Status = 'CLEARED';
      Db_updateRow('CustomerDues', d._row, d);

      var rctNo = 'RCT-' + Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyyMMdd') + '-' + Math.floor(1000 + Math.random() * 9000);
      Db_insertRow('DuePayments', {
        ReceiptID: Date.now(),
        ReceiptNumber: rctNo,
        DueID: dueId,
        CustomerID: d.CustomerID,
        PaymentDate: payload.PaymentDate || Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd'),
        Amount: amt,
        PaymentMode: payload.PaymentMode || 'CASH',
        Notes: payload.Notes || '',
        CreatedByName: user ? user.fullName : 'Admin',
        CreatedAt: new Date().toISOString()
      });

      return { ok: true, data: { ReceiptNumber: rctNo, RemainingAmount: d.RemainingAmount } };
    }
  }
  return { ok: false, error: { code: 'NOT_FOUND', message: 'Due not found' } };
}

function Crm_writeOffDue(payload, user) {
  var dueId = payload.DueID;
  var dues = Db_getTable('CustomerDues');
  for (var i = 0; i < dues.length; i++) {
    if (dues[i].DueID == dueId) {
      dues[i].Status = 'WRITTEN_OFF';
      dues[i].IsWrittenOff = 1;
      dues[i].WriteOffReason = payload.Reason || 'Write-off';
      Db_updateRow('CustomerDues', dues[i]._row, dues[i]);
      return { ok: true, message: 'Due written off.' };
    }
  }
  return { ok: false, error: { code: 'NOT_FOUND', message: 'Due not found' } };
}
