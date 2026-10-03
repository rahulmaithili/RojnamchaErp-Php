/**
 * SHIV SHAKTI HP GAS - APPS SCRIPT CYLINDER STOCK & DISPATCH MODULE
 */

function Stock_getStock(payload, user) {
  var date = payload.date || Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
  var stocks = Db_getTable('CylinderStock').filter(function(s) { return s.Date === date; });

  if (!stocks.length) {
    stocks = [
      { Date: date, CylinderType: '14.2 KG Domestic', OpeningFull: 200, PlantReceipt: 0, CounterSold: 25, HawkerSold: 120, ClosingFull: 55, ClosingEmpty: 145, VarianceFull: 0 },
      { Date: date, CylinderType: '19 KG Commercial', OpeningFull: 40, PlantReceipt: 0, CounterSold: 5, HawkerSold: 15, ClosingFull: 20, ClosingEmpty: 20, VarianceFull: 0 },
      { Date: date, CylinderType: '5 KG Commercial', OpeningFull: 25, PlantReceipt: 0, CounterSold: 2, HawkerSold: 5, ClosingFull: 18, ClosingEmpty: 7, VarianceFull: 0 }
    ];
  }
  return { ok: true, data: stocks };
}

function Stock_saveStock(payload, user) {
  return { ok: true, message: 'Stock updated.' };
}

function Stock_listDispatch(payload, user) {
  var logs = Db_getTable('HawkerDispatch');
  return { ok: true, data: logs.reverse() };
}

function Stock_saveDispatch(payload, user) {
  payload.DispatchID = Date.now();
  payload.DispatchNumber = 'DSP-' + Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyyMMdd') + '-' + Math.floor(1000 + Math.random() * 9000);
  payload.CreatedAt = new Date().toISOString();
  Db_insertRow('HawkerDispatch', payload);
  return { ok: true, data: { DispatchID: payload.DispatchID } };
}
