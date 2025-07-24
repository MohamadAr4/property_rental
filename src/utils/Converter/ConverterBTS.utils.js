function convertBigIntToString(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'bigint') {
    return obj.toString();
  }

  if (Array.isArray(obj)) {
    return obj.map(item => {
      const converted = convertBigIntToString(item);
      if (converted?.password) delete converted.password;
      return converted;
    });
  }

  if (typeof obj === 'object') {
    const newObj = {};
    for (const key in obj) {
      if (key !== 'password') { // Skip password field
        newObj[key] = convertBigIntToString(obj[key]);
      }
    }
    return newObj;
  }

  return obj;
}

export default convertBigIntToString;