/**
 * SHIV SHAKTI HP GAS - APPS SCRIPT SPREADSHEET REPOSITORY LAYER
 */

function Db_getTable(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  var headers = values[0];
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var obj = { _row: i + 1 };
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    rows.push(obj);
  }
  return rows;
}

function Db_insertRow(sheetName, dataObj) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return null;
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  var row = [];
  for (var i = 0; i < headers.length; i++) {
    var h = headers[i];
    row.push(dataObj[h] !== undefined ? dataObj[h] : '');
  }
  sheet.appendRow(row);
  return sheet.getLastRow();
}

function Db_updateRow(sheetName, rowIndex, dataObj) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return false;
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  var row = [];
  for (var i = 0; i < headers.length; i++) {
    var h = headers[i];
    row.push(dataObj[h] !== undefined ? dataObj[h] : '');
  }
  sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
  return true;
}
