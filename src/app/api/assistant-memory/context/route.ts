import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const TARGET_SERVER_BASE_URL =
  process.env.SERVER_BASE_URL || 'http://localhost:8001';

type AssistantMemoryPurpose = 'general' | 'pre_assessment';

const memorySpecs: Record<
  AssistantMemoryPurpose,
  Array<{
    key: string;
    label: string;
    description: string;
    filename: string;
  }>
> = {
  general: [
    {
      key: 'ai_guide',
      label: 'AI Guide',
      description: '记录助手的工作原则、表达方式和协作风格约束。',
      filename: 'ai_guide.md',
    },
    {
      key: 'assistant_contract',
      label: 'Assistant Contract',
      description: '记录这个助手必须履行的职责，例如观察、更新、引导和纠偏。',
      filename: 'assistant_contract.md',
    },
    {
      key: 'user_profile',
      label: 'User Profile',
      description: '记录你的稳定偏好、反感点、触发点和长期协作方式。',
      filename: 'user_profile.md',
    },
    {
      key: 'session_state',
      label: 'Session State',
      description: '记录当前阶段的真实进展、阻塞点、风险和最近决策。',
      filename: 'session_state.md',
    },
    {
      key: 'project_direction',
      label: 'Project Direction',
      description: '记录项目主线目标、产品边界和不要误入的方向。',
      filename: 'project_direction.md',
    },
  ],
  pre_assessment: [
    {
      key: 'ai_guide',
      label: 'AI Guide',
      description: '提供前置评估阶段也必须遵守的总体工作原则。',
      filename: 'ai_guide.md',
    },
    {
      key: 'assistant_contract',
      label: 'Assistant Contract',
      description: '约束前置评估不能只做表面回答，而要体现观察、判断与引导。',
      filename: 'assistant_contract.md',
    },
    {
      key: 'user_profile',
      label: 'User Profile',
      description: '注入与你有关的长期偏好，让这次评估更像在为你本人服务。',
      filename: 'user_profile.md',
    },
    {
      key: 'session_state',
      label: 'Session State',
      description: '补充当前项目所处阶段、产品修正方向和本轮重点。',
      filename: 'session_state.md',
    },
    {
      key: 'project_direction',
      label: 'Project Direction',
      description: '提醒前置评估只是学习工作流中的一个环节，而不是全部。',
      filename: 'project_direction.md',
    },
  ],
};

async function loadLocalAssistantMemory(purpose: AssistantMemoryPurpose) {
  const workspaceRoot = process.cwd();
  const memoryRoot = path.join(workspaceRoot, '.codex', 'memory');
  const sections = [];
  const parts: string[] = [];

  for (const spec of memorySpecs[purpose]) {
    try {
      const absolutePath = path.join(memoryRoot, spec.filename);
      const content = (await readFile(absolutePath, 'utf-8')).trim();
      if (!content) {
        continue;
      }

      sections.push({
        key: spec.key,
        label: spec.label,
        description: spec.description,
        path: `.codex/memory/${spec.filename}`,
        char_count: content.length,
      });
      parts.push(`[${spec.label}]\n${content}`);
    } catch {
      continue;
    }
  }

  return {
    purpose,
    summary: sections.length
      ? `已加载 ${sections.length} 份记忆文件。`
      : '当前没有可用的助手记忆。',
    context_text: parts.join('\n\n').trim() || 'No assistant memory available.',
    sections,
  };
}

export async function GET(request: NextRequest) {
  try {
    const purpose =
      (request.nextUrl.searchParams.get('purpose') as AssistantMemoryPurpose) ||
      'general';

    const backendResponse = await fetch(
      `${TARGET_SERVER_BASE_URL}/api/assistant-memory/context?purpose=${encodeURIComponent(
        purpose
      )}`,
      {
        method: 'GET',
        cache: 'no-store',
      }
    );

    const backendPayload = await backendResponse.json().catch(() => null);

    if (!backendResponse.ok) {
      if (backendResponse.status === 404) {
        const fallbackPayload = await loadLocalAssistantMemory(purpose);
        return NextResponse.json(fallbackPayload);
      }

      return NextResponse.json(
        backendPayload || { detail: 'Assistant memory request failed.' },
        { status: backendResponse.status }
      );
    }

    return NextResponse.json(backendPayload);
  } catch (error) {
    console.error('Error in /api/assistant-memory/context:', error);
    const purpose =
      (request.nextUrl.searchParams.get('purpose') as AssistantMemoryPurpose) ||
      'general';
    const fallbackPayload = await loadLocalAssistantMemory(purpose);
    return NextResponse.json(fallbackPayload);
  }
}
