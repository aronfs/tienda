import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/role.middleware";
import * as dashboardController from "./dashboard.controller";

const router = Router();

router.use(authenticate);

router.get("/summary", authorize("reports:read"), dashboardController.getSummary);

export default router;
