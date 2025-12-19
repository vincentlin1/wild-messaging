//email_auth
//just checks it's in a email format nothing to speical 

function validateEmail(email) {
  const errors = [];
    // if the email it starts with characters other than spaces or "@" ([^\s@]+), followed by an "@" symbol, a domain name, and a valid top-level domain.
    // found how to validate from https://www.geeksforgeeks.org/javascript/javascript-program-to-validate-an-email-address/
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
    errors.push('Require Vaild Email address like Example@something.com');
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

module.exports = {
    validateEmail
};
  
