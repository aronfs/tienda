import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import routes from "./routes/index";
import { errorHandler } from "./middlewares/error.middleware";
import { env } from "process";

const app = express();

app.use(helmet());
const corsOptions = {
  origin: env.corsOrigin,
  credentials: true,
};
app.use(cors(corsOptions));
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", routes);

app.get("/health", (_req, res) => {
  res.json({ success: true, message: "API funcionando correctamente" });
});

app.use(errorHandler);

export default app;
