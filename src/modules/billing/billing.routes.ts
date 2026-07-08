import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/role.middleware";
import { billingConfigSchema, createInvoiceResolutionSchema, updateInvoiceResolutionSchema } from "./billing.schema";
import * as billingController from "./billing.controller";

const router = Router();
router.use(authenticate);

router.get("/config", authorize("billing:read"), billingController.getConfig);
router.put("/config", authorize("billing:update"), validate(billingConfigSchema), billingController.updateConfig);

router.get("/resolutions", authorize("billing:read"), billingController.getResolutions);
router.get("/resolutions/:id", authorize("billing:read"), billingController.getResolution);
router.post("/resolutions", authorize("billing:update"), validate(createInvoiceResolutionSchema), billingController.createResolution);
router.put("/resolutions/:id", authorize("billing:update"), validate(updateInvoiceResolutionSchema), billingController.updateResolution);
router.patch("/resolutions/:id/status", authorize("billing:update"), billingController.updateResolutionStatus);
router.delete("/resolutions/:id", authorize("billing:delete"), billingController.deleteResolution);

router.get("/next-invoice-number", authorize("billing:read"), billingController.getNextInvoiceNumber);

export default router;