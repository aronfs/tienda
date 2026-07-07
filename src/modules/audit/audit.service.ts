import prisma from "../../config/prisma";

export const findAll = async () => {
  return prisma.auditLog.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
};
