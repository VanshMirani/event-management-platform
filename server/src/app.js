import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { notFound } from "./middlewares/notFound.js";
import apiRoutes from "./routes/index.js";
import { sendSuccess } from "./utils/apiResponse.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true
  })
);
app.use(
  express.json({
    verify: (req, _res, buffer) => {
      if (req.originalUrl === "/api/webhooks/razorpay") {
        req.rawBody = buffer;
      }
    }
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

app.get("/", (_req, res) => {
  return sendSuccess(res, { name: "Event Management API" }, "Welcome");
});

app.use("/api", apiRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
