import { Router } from "express";
import { createProviderSchema, updateProviderSchema } from "./provider.schema";
import { validate } from "../../middlewares/validate.middleware";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/role.middleware";
import * as providerController from "./provider.controller";

const router = Router();

router.use(authenticate);

router.get("/", providerController.findAll);
router.post("/", authorize("products:create"), validate(createProviderSchema), providerController.create);
router.put("/:id", authorize("products:update"), validate(updateProviderSchema), providerController.update);
router.patch("/:id/deactivate", authorize("products:delete"), providerController.deactivate);

export default router;
