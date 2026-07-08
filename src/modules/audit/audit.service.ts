import prisma from "../../config/prisma";

export const findAll = async (companyId?: number) => {
  const where: any = {};
  if (companyId) where.companyId = companyId;

  return prisma.auditLog.findMany({
    where,
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
};
