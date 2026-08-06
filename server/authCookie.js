// The session cookie's flags, in one place because more than one router now issues a token: server/auth.js on register and login, server/account.js when a password change rotates it. Duplicating the flags would mean a future change to one call site quietly dropping httpOnly or sameSite on the other, which is exactly the kind of difference nobody notices until it's a vulnerability.
function setAuthCookie(res, token) {
  res.cookie("token", token, {
    secure: true,
    httpOnly: true,
    sameSite: "strict",
  });
}

module.exports = { setAuthCookie };
