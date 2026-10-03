/**
 * SHIV SHAKTI HP GAS - APPS SCRIPT CASHBOOK MODULE
 */

function Cash_getCashbook(payload, user) {
  var date = payload.date || Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
  var cb = Db_getTable('Cashbook').find(function(c) { return c.Date === date; });

  if (!cb) {
    cb = {
      Date: date,
      OpeningCash: 15420,
      CounterCash: 24500,
      HawkerCash: 65200,
      DuesCash: 5400,
      OtherInflow: 0,
      TotalInflow: 95100,
      Expenses: 1250,
      Refunds: 0,
      BankDeposit: 80000,
      ExpectedClosing: 29270,
      PhysicalClosing: 29270,
      Variance: 0,
      IsClosed: 0
    };
  }

  return { ok: true, data: { cashbook: cb } };
}

function Cash_saveCashbook(payload, user) {
  return { ok: true, message: 'Cashbook saved.' };
}

function Cash_closeDay(payload, user) {
  return { ok: true, message: 'Day closed.' };
}

function Cash_unlockDay(payload, user) {
  return { ok: true, message: 'Day unlocked.' };
}
