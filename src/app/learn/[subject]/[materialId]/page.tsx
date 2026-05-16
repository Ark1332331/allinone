import { notFound } from 'next/navigation';

import ReadingWorkspace from '@/components/learning/ReadingWorkspace';

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

  if (!knownSubjects.has(subject) || !materialId) {
    notFound();
  }

  return <ReadingWorkspace subjectSlug={subject} materialId={materialId} />;
}
