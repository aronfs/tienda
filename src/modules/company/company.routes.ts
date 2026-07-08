import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/role.middleware";
import { updateCompanySchema } from "./company.schema";
import * as companyController from "./company.controller";

const router = Router();
router.use(authenticate);

router.get("/me", authorize("company:read"), companyController.getMyCompany);
router.put("/me", authorize("company:update"), validate(updateCompanySchema), companyController.updateMyCompany);
router.patch("/logo", authorize("company:update"), companyController.updateLogo);

export default router;