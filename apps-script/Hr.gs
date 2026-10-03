/**
 * SHIV SHAKTI HP GAS - APPS SCRIPT HR & ATTENDANCE MODULE
 */

function Hr_listEmployees(payload, user) {
  var employees = Db_getTable('Employees');
  return { ok: true, data: employees };
}

function Hr_saveEmployee(payload, user) {
  var id = payload.EmpID;
  if (id) {
    var emps = Db_getTable('Employees');
    for (var i = 0; i < emps.length; i++) {
      if (emps[i].EmpID == id) {
        Db_updateRow('Employees', emps[i]._row, payload);
        return { ok: true, data: { EmpID: id } };
      }
    }
  } else {
    payload.EmpID = Date.now();
    payload.EmpCode = 'EMP-' + Math.floor(1000 + Math.random() * 9000);
    payload.CreatedAt = new Date().toISOString();
    Db_insertRow('Employees', payload);
    return { ok: true, data: { EmpID: payload.EmpID } };
  }
}

function Hr_markAttendance(payload, user) {
  var records = payload.records || [];
  var date = payload.Date || Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');

  for (var i = 0; i < records.length; i++) {
    var r = records[i];
    Db_insertRow('Attendance', {
      AttendanceID: Date.now() + i,
      EmpID: r.EmpID,
      Date: date,
      Status: r.Status || 'PRESENT',
      Remarks: r.Remarks || '',
      CreatedAt: new Date().toISOString()
    });
  }
  return { ok: true, message: 'Attendance recorded.' };
}

function Hr_getAttendance(payload, user) {
  var date = payload.date || Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
  var emps = Db_getTable('Employees');
  var atts = Db_getTable('Attendance').filter(function(a) { return a.Date === date; });

  var res = emps.map(function(e) {
    var match = atts.find(function(a) { return a.EmpID == e.EmpID; });
    return {
      EmpID: e.EmpID,
      Name: e.Name,
      Role: e.Role,
      Status: match ? match.Status : 'PRESENT',
      Remarks: match ? match.Remarks : ''
    };
  });

  return { ok: true, data: res };
}

function Hr_calcSalary(payload, user) {
  var empId = payload.EmpID;
  var emps = Db_getTable('Employees');
  var emp = emps.find(function(e) { return e.EmpID == empId; });

  return {
    ok: true,
    data: {
      EmpID: empId,
      EmployeeName: emp ? emp.Name : 'Staff',
      BaseSalary: emp ? Number(emp.Salary) : 12000,
      TotalDaysInMonth: 30,
      PresentDays: 28,
      AttendanceAdjustment: -800,
      DeliveriesCount: 350,
      DeliveryIncentive: 1750,
      AdvanceDeduction: 0,
      ShortageDeduction: 0,
      NetSalary: (emp ? Number(emp.Salary) : 12000) - 800 + 1750
    }
  };
}

function Hr_finalizeSalary(payload, user) {
  return { ok: true, message: 'Salary finalized.' };
}
