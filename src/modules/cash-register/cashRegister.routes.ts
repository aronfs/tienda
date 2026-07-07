import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/role.middleware";
import * as cashRegisterController from "./cashRegister.controller";

const router = Router();

router.use(authenticate);

router.post("/open", authorize("cash:open"), cashRegisterController.openRegister);
router.post("/close", authorize("cash:close"), cashRegisterController.closeRegister);
router.get("/current", cashRegisterController.getCurrent);
router.get("/history", authorize("reports:read"), cashRegisterController.getHistory);

export default router;
