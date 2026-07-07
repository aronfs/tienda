import prisma from "../../config/prisma";

export const findAll = async () => {
  return prisma.role.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      description: true,
      rolePermissions: {
        select: { permission: { select: { id: true, name: true } } },
      },
    },
    orderBy: { id: "asc" },
  });
};
