import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { notFound } from "./middlewares/notFound.js";
import apiRoutes from "./routes/index.js";
import { sendSuccess } from "./utils/apiResponse.js";

const app = express();
const clientDistPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../client/dist"
);

if (env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        imgSrc: ["'self'", "data:", "https:"]
      }
    }
  })
);
app.use(
  cors({
    origin: env.CLIENT_ORIGIN || false,
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

app.use("/api", apiRoutes);

if (env.NODE_ENV === "production") {
  app.use(express.static(clientDistPath));
  app.get("/{*splat}", (req, res, next) => {
    if (req.path === "/api" || req.path.startsWith("/api/")) {
      return next();
    }

    return res.sendFile(path.join(clientDistPath, "index.html"));
  });
} else {
  app.get("/", (_req, res) => {
    return sendSuccess(res, { name: "Event Management API" }, "Welcome");
  });
}

app.use(notFound);
app.use(errorHandler);

export default app;
