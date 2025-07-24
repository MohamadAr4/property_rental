// 400 Bad Request - Invalid syntax
export const statusCode400 = (res, message, errors) => {
  return res.status(400).json({ success: false, message, errors });
};

// 401 Unauthorized - Authentication required
export const statusCode401 = (res, message = 'Unauthorized') => {
  return res.status(401).json({ success: false, message });
};

// 403 Forbidden - Authenticated but no permission
export const statusCode403 = (res, message = 'Forbidden') => {
  return res.status(403).json({ success: false, message });
};

// 404 Not Found - Resource doesn't exist
export const statusCode404 = (res, message = 'Not Found') => {
  return res.status(404).json({ success: false, message });
};

// 422 Unprocessable Entity - Validation errors
export const statusCode422 = (res, message, errors) => {
  return res.status(422).json({ success: false, message, errors });
};

// 429 Too Many Requests - Rate limiting
export const statusCode429 = (res, message = 'Too Many Requests') => {
  return res.status(429).json({ success: false, message });
};


export const statusCode500 = (res, message, errors) => {
  return res.status(500).json({ success: false, message, errors });
};