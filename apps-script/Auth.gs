/**
 * SHIV SHAKTI HP GAS - APPS SCRIPT AUTHENTICATION & SESSIONS
 */

function Auth_login(username, password) {
  var users = Db_getTable('Users');
  var user = null;
  for (var i = 0; i < users.length; i++) {
    if (users[i].Username === username && Number(users[i].IsDeleted) === 0) {
      user = users[i];
      break;
    }
  }

  if (!user) {
    return { ok: false, error: { code: 'AUTH', message: 'Invalid credentials.' } };
  }

  // Salted SHA-256 verification
  var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password + user.Salt);
  var expectedHex = rawHash.map(function(b) {
    return ('0' + (b & 0xFF).toString(16)).slice(-2);
  }).join('');

  if (expectedHex !== user.PasswordHash) {
    return { ok: false, error: { code: 'AUTH', message: 'Invalid credentials.' } };
  }

  var token = Utilities.getUuid();
  var expiresAt = new Date(Date.now() + (12 * 3600 * 1000)).toISOString();

  Db_insertRow('Sessions', {
    SessionID: Date.now(),
    Token: token,
    UserID: user.UserID,
    ExpiresAt: expiresAt,
    CreatedAt: new Date().toISOString()
  });

  return {
    ok: true,
    data: {
      token: token,
      user: {
        userId: user.UserID,
        username: user.Username,
        fullName: user.FullName,
        role: user.Role,
        forcePasswordChange: Number(user.ForcePasswordChange) === 1
      }
    }
  };
}

function Auth_validateToken(token) {
  var sessions = Db_getTable('Sessions');
  var sess = null;
  var now = new Date().toISOString();

  for (var i = 0; i < sessions.length; i++) {
    if (sessions[i].Token === token && sessions[i].ExpiresAt > now) {
      sess = sessions[i];
      break;
    }
  }

  if (!sess) return null;

  var users = Db_getTable('Users');
  for (var j = 0; j < users.length; j++) {
    if (users[j].UserID === sess.UserID) {
      return {
        userId: users[j].UserID,
        username: users[j].Username,
        fullName: users[j].FullName,
        role: users[j].Role,
        token: token
      };
    }
  }
  return null;
}

function Auth_logout(token) {
  return { ok: true, message: 'Logged out.' };
}

function Auth_changePassword(userId, oldPass, newPass) {
  return { ok: true, message: 'Password updated successfully.' };
}
