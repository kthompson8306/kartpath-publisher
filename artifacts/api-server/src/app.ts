import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkClient } from "@clerk/express";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
} from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(async (req, res, next) => {
  try {
    const protocol = req.headers["x-forwarded-proto"]?.toString() || "http";
    const host = req.headers.host || "localhost";
    const request = new Request(
      `${protocol}://${host}${req.originalUrl || req.url}`,
      {
        method: req.method,
        headers: Object.entries(req.headers).reduce((headers, [key, value]) => {
          if (typeof value === "string") {
            headers.set(key, value);
          } else if (Array.isArray(value)) {
            headers.set(key, value.join(", "));
          }
          return headers;
        }, new Headers()),
      },
    );
    const requestState = await clerkClient.authenticateRequest(request, {
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
      acceptsToken: "session_token",
    });
    const auth = requestState.toAuth();
    Object.assign(req, {
      auth: () => auth,
      clerkUserId: auth?.userId ?? null,
    });
    next();
  } catch (error) {
    next(error);
  }
});

app.use("/api", router);

export default app;
