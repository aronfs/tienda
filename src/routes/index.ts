import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import userRoutes from "../modules/users/user.routes";
import roleRoutes from "../modules/roles/role.routes";
import categoryRoutes from "../modules/categories/category.routes";
import productRoutes from "../modules/products/product.routes";
import providerRoutes from "../modules/providers/provider.routes";
import clientRoutes from "../modules/clients/client.routes";
import purchaseRoutes from "../modules/purchases/purchase.routes";
import saleRoutes from "../modules/sales/sale.routes";
import inventoryRoutes from "../modules/inventory/inventory.routes";
import cashRegisterRoutes from "../modules/cash-register/cashRegister.routes";
import returnRoutes from "../modules/returns/return.routes";
import dashboardRoutes from "../modules/dashboard/dashboard.routes";
import analyticsRoutes from "../modules/analytics/analytics.routes";
import setupRoutes from "../modules/setup/setup.routes";
import companyRoutes from "../modules/company/company.routes";
import branchRoutes from "../modules/branches/branch.routes";
import taxRoutes from "../modules/taxes/tax.routes";
import billingRoutes from "../modules/billing/billing.routes";
import { authenticate, requireCompany } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/role.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/response";
import * as auditService from "../modules/audit/audit.service";

const router = Router();

router.use("/auth", authRoutes);
router.use("/setup", setupRoutes);

router.use("/users", authenticate, requireCompany, userRoutes);
router.use("/roles", authenticate, requireCompany, roleRoutes);
router.use("/company", authenticate, requireCompany, companyRoutes);
router.use("/branches", authenticate, requireCompany, branchRoutes);
router.use("/taxes", authenticate, requireCompany, taxRoutes);
router.use("/billing", authenticate, requireCompany, billingRoutes);
router.use("/categories", authenticate, requireCompany, categoryRoutes);
router.use("/products", authenticate, requireCompany, productRoutes);
router.use("/providers", authenticate, requireCompany, providerRoutes);
router.use("/clients", authenticate, requireCompany, clientRoutes);
router.use("/purchases", authenticate, requireCompany, purchaseRoutes);
router.use("/sales", authenticate, requireCompany, saleRoutes);
router.use("/inventory", authenticate, requireCompany, inventoryRoutes);
router.use("/cash-register", authenticate, requireCompany, cashRegisterRoutes);
router.use("/returns", authenticate, requireCompany, returnRoutes);
router.use("/dashboard", authenticate, requireCompany, dashboardRoutes);
router.use("/analytics", authenticate, requireCompany, analyticsRoutes);

router.get(
  "/audit",
  authenticate,
  requireCompany,
  authorize("users:manage"),
  asyncHandler(async (req: any, res) => {
    const logs = await auditService.findAll(req.user?.companyId);
    sendSuccess(res, logs);
  })
);

export default router;
