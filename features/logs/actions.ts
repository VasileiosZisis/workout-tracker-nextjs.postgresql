"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { logFormSchema } from "./schema";
import { createUniqueSlug, slugifyTitle } from "./slug";
import type { LogActionState } from "./types";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

function parseLogForm(formData: FormData) {
  return logFormSchema.safeParse({
    title: formData.get("title"),
  });
}

export async function createLogAction(
  _previousState: LogActionState,
  formData: FormData,
): Promise<LogActionState> {
  const user = await requireUser();
  const parsed = parseLogForm(formData);

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const baseSlug = slugifyTitle(parsed.data.title);
  const existingSlugs = await prisma.log.findMany({
    where: { userId: user.id },
    select: { slug: true },
  });
  const slug = createUniqueSlug(
    baseSlug,
    existingSlugs.map((log) => log.slug),
  );

  const log = await prisma.log.create({
    data: {
      title: parsed.data.title,
      slug,
      userId: user.id,
    },
  });

  revalidatePath("/logs");
  redirect(`/logs/${log.slug}`);
}

export async function updateLogAction(
  _previousState: LogActionState,
  formData: FormData,
): Promise<LogActionState> {
  const user = await requireUser();
  const logId = String(formData.get("logId") ?? "");
  const parsed = parseLogForm(formData);

  if (!logId) {
    return { formError: "Log id is missing." };
  }

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const existingLog = await prisma.log.findFirst({
    where: {
      id: logId,
      userId: user.id,
    },
  });

  if (!existingLog) {
    notFound();
  }

  const nextSlug = slugifyTitle(parsed.data.title);
  const conflictingLog = await prisma.log.findUnique({
    where: {
      userId_slug: {
        userId: user.id,
        slug: nextSlug,
      },
    },
  });

  const slug =
    conflictingLog && conflictingLog.id !== existingLog.id
      ? existingLog.slug
      : nextSlug;

  const log = await prisma.log.update({
    where: { id: existingLog.id },
    data: {
      title: parsed.data.title,
      slug,
    },
  });

  revalidatePath("/logs");
  revalidatePath(`/logs/${existingLog.slug}`);
  revalidatePath(`/logs/${existingLog.slug}/edit`);
  redirect(`/logs/${log.slug}`);
}

export async function deleteLogAction(formData: FormData) {
  const user = await requireUser();
  const logId = String(formData.get("logId") ?? "");

  if (!logId) {
    notFound();
  }

  const deleted = await prisma.$transaction(async (tx) => {
    await tx.paceSession.deleteMany({
      where: {
        logId,
        userId: user.id,
      },
    });

    await tx.weightliftingSession.deleteMany({
      where: {
        logId,
        userId: user.id,
      },
    });

    await tx.exercise.deleteMany({
      where: {
        logId,
        userId: user.id,
      },
    });

    return tx.log.deleteMany({
      where: {
        id: logId,
        userId: user.id,
      },
    });
  });

  if (deleted.count === 0) {
    notFound();
  }

  revalidatePath("/logs");
  redirect("/logs");
}
