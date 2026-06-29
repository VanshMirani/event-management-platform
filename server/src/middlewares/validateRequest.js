import { sendError } from "../utils/apiResponse.js";

export function validateRequest(schema) {
  return (req, res, next) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query
    });

    if (!result.success) {
      return sendError(res, "Validation failed", 400, result.error.flatten());
    }

    req.validated = result.data;
    return next();
  };
}
