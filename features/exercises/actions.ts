"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { exerciseFormSchema } from "./schema";
import { createUniqueExerciseSlug, slugifyExerciseTitle } from "./slug";
import type { ExerciseActionState } from "./types";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

function parseExerciseForm(formData: FormData) {
  return exerciseFormSchema.safeParse({
    title: formData.get("title"),
    sessionKind: formData.get("sessionKind"),
  });
}

export async function createExerciseAction(
  _previousState: ExerciseActionState,
  formData: FormData,
): Promise<ExerciseActionState> {
  const user = await requireUser();
  const logId = String(formData.get("logId") ?? "");
  const parsed = parseExerciseForm(formData);

  if (!logId) {
    return { formError: "Log id is missing." };
  }

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const log = await prisma.log.findFirst({
    where: {
      id: logId,
      userId: user.id,
    },
  });

  if (!log) {
    notFound();
  }

  const baseSlug = slugifyExerciseTitle(parsed.data.title);
  const existingSlugs = await prisma.exercise.findMany({
    where: {
      userId: user.id,
      logId: log.id,
    },
    select: { slug: true },
  });
  const slug = createUniqueExerciseSlug(
    baseSlug,
    existingSlugs.map((exercise) => exercise.slug),
  );

  const exercise = await prisma.exercise.create({
    data: {
      title: parsed.data.title,
      slug,
      sessionKind: parsed.data.sessionKind,
      userId: user.id,
      logId: log.id,
    },
  });

  revalidatePath(`/logs/${log.slug}`);
  redirect(`/logs/${log.slug}/exercises/${exercise.slug}`);
}

export async function updateExerciseAction(
  _previousState: ExerciseActionState,
  formData: FormData,
): Promise<ExerciseActionState> {
  const user = await requireUser();
  const exerciseId = String(formData.get("exerciseId") ?? "");
  const parsed = parseExerciseForm(formData);

  if (!exerciseId) {
    return { formError: "Exercise id is missing." };
  }

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const existingExercise = await prisma.exercise.findFirst({
    where: {
      id: exerciseId,
      userId: user.id,
    },
    include: {
      log: true,
    },
  });

  if (!existingExercise) {
    notFound();
  }

  const nextSlug = slugifyExerciseTitle(parsed.data.title);
  const conflictingExercise = await prisma.exercise.findUnique({
    where: {
      logId_slug: {
        logId: existingExercise.logId,
        slug: nextSlug,
      },
    },
  });

  const slug =
    conflictingExercise && conflictingExercise.id !== existingExercise.id
      ? existingExercise.slug
      : nextSlug;

  const exercise = await prisma.exercise.update({
    where: { id: existingExercise.id },
    data: {
      title: parsed.data.title,
      slug,
      sessionKind: parsed.data.sessionKind,
    },
  });

  revalidatePath(`/logs/${existingExercise.log.slug}`);
  revalidatePath(`/logs/${existingExercise.log.slug}/exercises/${existingExercise.slug}`);
  revalidatePath(`/logs/${existingExercise.log.slug}/exercises/${existingExercise.slug}/edit`);
  redirect(`/logs/${existingExercise.log.slug}/exercises/${exercise.slug}`);
}

export async function deleteExerciseAction(formData: FormData) {
  const user = await requireUser();
  const exerciseId = String(formData.get("exerciseId") ?? "");

  if (!exerciseId) {
    notFound();
  }

  const exercise = await prisma.exercise.findFirst({
    where: {
      id: exerciseId,
      userId: user.id,
    },
    include: {
      log: true,
    },
  });

  if (!exercise) {
    notFound();
  }

  await prisma.exercise.delete({
    where: { id: exercise.id },
  });

  revalidatePath(`/logs/${exercise.log.slug}`);
  redirect(`/logs/${exercise.log.slug}`);
}
