// 200 OK - Standard success response
export const statusCode200 = (res, message, data) => {
  return res.status(200).json({ success: true, message, data });
};

// 201 Created - Resource successfully created
export const statusCode201 = (res, message, data) => {
  return res.status(201).json({ success: true, message, data });
};

// 204 No Content - Success with no response body
export const statusCode204 = (res , content) => {
  return res.status(204).send({message : `${content} NOT FOUND`});
};