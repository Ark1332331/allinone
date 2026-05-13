import { NextRequest, NextResponse } from 'next/server';

const TARGET_SERVER_BASE_URL =
  process.env.SERVER_BASE_URL || 'http://localhost:8001';
const MAX_IMPORT_BYTES = 15 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json(
        { detail: 'No file provided for import.' },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { detail: 'The uploaded file is empty.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_IMPORT_BYTES) {
      return NextResponse.json(
        { detail: 'The uploaded file is too large for current beta import.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const contentBase64 = Buffer.from(arrayBuffer).toString('base64');

    const backendResponse = await fetch(
      `${TARGET_SERVER_BASE_URL}/api/learning-entry/import`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: file.name,
          mime_type: file.type || undefined,
          content_base64: contentBase64,
        }),
        cache: 'no-store',
      }
    );

    const payload = await backendResponse.json().catch(() => null);

    if (!backendResponse.ok) {
      if (backendResponse.status === 404) {
        return NextResponse.json(
          {
            detail:
              '学习材料导入后端路由不存在。大概率是后端服务还没重启，当前运行中的 8001 进程没有加载新的 learning-entry import 接口。',
          },
          { status: 502 }
        );
      }

      return NextResponse.json(
        payload || { detail: 'Failed to import learning material.' },
        { status: backendResponse.status }
      );
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Error in /api/learning-entry/import:', error);
    return NextResponse.json(
      {
        detail:
          error instanceof Error
            ? error.message
            : 'Unexpected import error occurred.',
      },
      { status: 500 }
    );
  }
}
