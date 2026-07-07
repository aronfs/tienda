import { Router } from "express";
import { inventoryAdjustSchema } from "./inventory.schema";
import { validate } from "../../middlewares/validate.middleware";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/role.middleware";
import * as inventoryController from "./inventory.controller";

const router = Router();

router.use(authenticate);

router.get("/movements", authorize("inventory:adjust"), inventoryController.getMovements);
router.post("/adjust", authorize("inventory:adjust"), validate(inventoryAdjustSchema), inventoryController.adjust);

export default router;
