export function sendSuccess(res, data, message = "Success", statusCode = 200) {
  return res.status(statusCode).json({
    status: "success",
    message,
    data
  });
}

export function sendError(
  res,
  message = "Something went wrong",
  statusCode = 500,
  details = null
) {
  return res.status(statusCode).json({
    status: "error",
    message,
    details
  });
}
