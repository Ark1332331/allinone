import { notFound, redirect } from 'next/navigation';

import ReadingWorkspace from '@/components/learning/ReadingWorkspace';
import { getLegacyMajorCourseRouteRedirect } from '@/lib/learn-content';

const knownSubjects = new Set([
  'advanced-math',
  'probability',
  'deep-learning',
  'major-course',
]);

export default async function MaterialReadingPage({
  params,
}: {
  params: Promise<{ subject: string; materialId: string }>;
}) {
  const { subject, materialId } = await params;
  const legacyRedirect = getLegacyMajorCourseRouteRedirect(subject, materialId);
  if (legacyRedirect) {
    redirect(legacyRedirect);
  }

  if (!knownSubjects.has(subject) || !materialId) {
    notFound();
  }

  return <ReadingWorkspace subjectSlug={subject} materialId={materialId} />;
}
