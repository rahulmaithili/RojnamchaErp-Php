/**
 * SHIV SHAKTI HP GAS - APPS SCRIPT COMPANY MODULE
 */

function Company_getCompany() {
  var companies = Db_getTable('Companies');
  var comp = companies.length ? companies[0] : {
    CompanyName: 'Shiv Shakti HP Gas',
    AgencyName: 'Shiv Shakti HP Gas (Pandaul)',
    DistributorCode: 'HP-PDL-8842'
  };
  return { ok: true, data: comp };
}

function Company_saveCompany(payload, user) {
  var companies = Db_getTable('Companies');
  if (companies.length) {
    Db_updateRow('Companies', companies[0]._row, payload);
  } else {
    Db_insertRow('Companies', payload);
  }
  return { ok: true, message: 'Company updated.' };
}

function Company_uploadLogo(payload, user) {
  var companies = Db_getTable('Companies');
  if (companies.length) {
    var row = companies[0];
    row.LogoBase64 = payload.logoBase64;
    row.LogoMimeType = payload.mimeType;
    Db_updateRow('Companies', row._row, row);
  }
  return { ok: true, message: 'Logo updated.' };
}
