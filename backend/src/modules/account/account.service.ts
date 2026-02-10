import { prisma } from "../../db/client.js";
import { deleteUserFile, readUserFileBase64, writeUserFile } from "../../utils/fileStorage.js";

const MAX_CONTACTS = 5;

type UpdateProfileInput = {
  firstName: string;
  lastName: string;
  role: string;
  language: string;
};

export const getOrCreateAccountProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true }
  });

  if (!user) {
    return null;
  }

  if (user.profile) {
    return user;
  }

  const profile = await prisma.profile.create({
    data: {
      userId: user.id,
      firstName: "",
      lastName: "",
      language: "est",
      role: ""
    }
  });

  return {
    ...user,
    profile
  };
};

export const updateAccountProfile = async (userId: string, input: UpdateProfileInput) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true }
  });

  if (!user) {
    return null;
  }

  const profile = user.profile
    ? await prisma.profile.update({
      where: { userId },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role,
        language: input.language
      }
    })
    : await prisma.profile.create({
      data: {
        userId,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role,
        language: input.language
      }
    });

  return {
    ...user,
    profile
  };
};

export const listContactsForUser = async (userId: string) => {
  return prisma.clinicianContact.findMany({
    where: { userId },
    orderBy: [
      { isPrimary: "desc" },
      { createdAt: "desc" }
    ]
  });
};

type SaveContactInput = {
  name: string;
  specialty?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  isPrimary: boolean;
};

export const createContactForUser = async (userId: string, input: SaveContactInput) => {
  const contactCount = await prisma.clinicianContact.count({ where: { userId } });
  if (contactCount >= MAX_CONTACTS) {
    return { error: "Contact limit reached" as const };
  }

  return prisma.$transaction(async (transaction) => {
    if (input.isPrimary) {
      await transaction.clinicianContact.updateMany({
        where: { userId, isPrimary: true },
        data: { isPrimary: false }
      });
    }

    return {
      data: await transaction.clinicianContact.create({
        data: {
          userId,
          name: input.name,
          specialty: input.specialty ?? null,
          phone: input.phone ?? null,
          email: input.email ?? null,
          notes: input.notes ?? null,
          isPrimary: input.isPrimary
        }
      })
    };
  });
};

export const updateContactForUser = async (userId: string, contactId: string, input: SaveContactInput) => {
  const contact = await prisma.clinicianContact.findFirst({
    where: {
      id: contactId,
      userId
    }
  });

  if (!contact) {
    return null;
  }

  return prisma.$transaction(async (transaction) => {
    if (input.isPrimary) {
      await transaction.clinicianContact.updateMany({
        where: { userId, isPrimary: true, NOT: { id: contactId } },
        data: { isPrimary: false }
      });
    }

    return transaction.clinicianContact.update({
      where: { id: contactId },
      data: {
        name: input.name,
        specialty: input.specialty ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        notes: input.notes ?? null,
        isPrimary: input.isPrimary
      }
    });
  });
};

export const deleteContactForUser = async (userId: string, contactId: string) => {
  const contact = await prisma.clinicianContact.findFirst({
    where: { id: contactId, userId },
    select: { id: true }
  });

  if (!contact) {
    return null;
  }

  return prisma.clinicianContact.delete({
    where: { id: contactId }
  });
};

export const listDocumentsForUser = async (userId: string) => {
  return prisma.userDocument.findMany({
    where: { userId },
    orderBy: { uploadedAt: "desc" }
  });
};

type UploadDocumentInput = {
  fileName: string;
  fileType: string;
  fileData: string;
  fileSize?: number;
};

export const uploadDocumentForUser = async (userId: string, input: UploadDocumentInput) => {
  const storedFile = await writeUserFile(userId, input.fileName, input.fileData);

  return prisma.userDocument.create({
    data: {
      userId,
      fileName: input.fileName,
      filePath: storedFile.relativePath,
      fileType: input.fileType,
      fileSize: input.fileSize ?? storedFile.size
    }
  });
};

export const getDocumentDownloadForUser = async (userId: string, documentId: string) => {
  const record = await prisma.userDocument.findFirst({
    where: {
      id: documentId,
      userId
    }
  });

  if (!record) {
    return null;
  }

  const fileDataBase64 = await readUserFileBase64(record.filePath);
  return {
    record,
    fileDataBase64
  };
};

export const deleteDocumentForUser = async (userId: string, documentId: string) => {
  const record = await prisma.userDocument.findFirst({
    where: {
      id: documentId,
      userId
    }
  });

  if (!record) {
    return null;
  }

  await deleteUserFile(record.filePath);
  return prisma.userDocument.delete({
    where: { id: documentId }
  });
};
