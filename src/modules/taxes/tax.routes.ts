import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/role.middleware";
import { createTaxSchema, updateTaxSchema } from "./tax.schema";
import * as taxController from "./tax.controller";

const router = Router();
router.use(authenticate);

router.get("/", authorize("taxes:read"), taxController.findAll);
router.get("/default", authorize("taxes:read"), taxController.findDefault);
router.post("/", authorize("taxes:create"), validate(createTaxSchema), taxController.create);
router.put("/:id", authorize("taxes:update"), validate(updateTaxSchema), taxController.update);
router.patch("/:id/status", authorize("taxes:update"), taxController.updateStatus);
router.patch("/:id/set-default", authorize("taxes:update"), taxController.setDefault);
router.delete("/:id", authorize("taxes:delete"), taxController.remove);

export default router;