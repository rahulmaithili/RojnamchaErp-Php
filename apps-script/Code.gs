/**
 * SHIV SHAKTI HP GAS - GOOGLE APPS SCRIPT MASTER WEB APP ENTRY POINT
 */

function doPost(e) {
  try {
    var raw = e.postData ? e.postData.contents : '';
    var req = {};
    if (raw) {
      try {
        req = JSON.parse(raw);
      } catch (err) {
        req = {};
      }
    }

    var action = req.action || '';
    var token = req.token || '';
    var payload = req.payload || {};

    var currentUser = null;
    if (token) {
      currentUser = Auth_validateToken(token);
    }

    var publicActions = ['login', 'setupDatabase', 'getMeta'];
    if (publicActions.indexOf(action) === -1) {
      if (!currentUser) {
        return createJsonResponse({
          ok: false,
          error: {
            code: 'AUTH',
            message: 'Session expired or invalid authentication token.'
          }
        });
      }
    }

    var res = routeAction(action, payload, currentUser);
    return createJsonResponse(res);

  } catch (error) {
    return createJsonResponse({
      ok: false,
      error: {
        code: 'SERVER',
        message: 'Apps Script Server Exception: ' + error.message
      }
    });
  }
}

function doGet(e) {
  var action = (e.parameter && e.parameter.action) ? e.parameter.action : 'getMeta';
  if (action === 'setupDatabase') {
    return createJsonResponse(Setup_setupDatabase());
  }
  return createJsonResponse({
    ok: true,
    data: {
      status: 'ONLINE',
      app: 'Shiv Shakti HP Gas ERP',
      time: new Date().toISOString()
    }
  });
}

function routeAction(action, payload, user) {
  switch (action) {
    case 'setupDatabase':
      return Setup_setupDatabase();

    case 'getMeta':
      return Company_getCompany();

    case 'login':
      return Auth_login(payload.username, payload.password);

    case 'logout':
      return Auth_logout(user ? user.token : '');

    case 'changePassword':
      return Auth_changePassword(user ? user.userId : 0, payload.oldPassword, payload.newPassword);

    case 'getCompany':
      return Company_getCompany();

    case 'saveCompany':
      return Company_saveCompany(payload, user);

    case 'uploadCompanyLogo':
      return Company_uploadLogo(payload, user);

    case 'getDashboard':
      return Reports_getDashboard(payload, user);

    case 'listBills':
    case 'listEntries':
      return Billing_listBills(payload, user);

    case 'getBill':
      return Billing_getBill(payload, user);

    case 'addBill':
    case 'addEntry':
      return Billing_addBill(payload, user);

    case 'cancelBill':
      return Billing_cancelBill(payload, user);

    case 'issueNewConnectionPackage':
      return Billing_issueNewConnectionPackage(payload, user);

    case 'listCustomers':
      return Crm_listCustomers(payload, user);

    case 'getCustomer360':
      return Crm_getCustomer360(payload, user);

    case 'saveCustomer':
      return Crm_saveCustomer(payload, user);

    case 'listDues':
      return Crm_listDues(payload, user);

    case 'recoverDue':
      return Crm_recoverDue(payload, user);

    case 'writeOffDue':
      return Crm_writeOffDue(payload, user);

    case 'listDispatch':
    case 'listVendorLog':
      return Stock_listDispatch(payload, user);

    case 'saveDispatch':
    case 'saveVendorLog':
      return Stock_saveDispatch(payload, user);

    case 'getStock':
      return Stock_getStock(payload, user);

    case 'saveStock':
      return Stock_saveStock(payload, user);

    case 'getCashbook':
      return Cash_getCashbook(payload, user);

    case 'saveCashbook':
      return Cash_saveCashbook(payload, user);

    case 'closeDay':
      return Cash_closeDay(payload, user);

    case 'unlockDay':
      return Cash_unlockDay(payload, user);

    case 'listEmployees':
      return Hr_listEmployees(payload, user);

    case 'saveEmployee':
      return Hr_saveEmployee(payload, user);

    case 'markAttendance':
      return Hr_markAttendance(payload, user);

    case 'getAttendance':
      return Hr_getAttendance(payload, user);

    case 'calcSalary':
      return Hr_calcSalary(payload, user);

    case 'finalizeSalary':
      return Hr_finalizeSalary(payload, user);

    case 'listItems':
      return Admin_listItems(payload, user);

    case 'saveItem':
      return Admin_saveItem(payload, user);

    case 'adminUpdateRates':
      return Admin_updateRate(payload, user);

    case 'getReport':
      return Reports_getReport(payload, user);

    case 'getRojnamcha':
      return Reports_getRojnamcha(payload, user);

    case 'getReconciliation':
      return Reports_getReconciliation(payload, user);

    case 'listUsers':
      return Admin_listUsers(payload, user);

    case 'saveUser':
      return Admin_saveUser(payload, user);

    case 'getPermissions':
      return Admin_getPermissions();

    case 'savePermissions':
      return Admin_savePermissions(payload, user);

    case 'listAudit':
      return Admin_listAudit(payload, user);

    case 'getSystemHealth':
      return Admin_getSystemHealth();

    case 'backupDatabase':
      return Archive_backupDatabase(user);

    default:
      return { ok: false, error: { code: 'NOT_FOUND', message: 'Action not found: ' + action } };
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
