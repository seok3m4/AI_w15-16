import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError, MemoryStatus } from '../../lib/api/types';

export const POST_PAGE_SIZE = 20;

export function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function memoryStatusLabel(status: MemoryStatus): string {
  switch (status) {
    case 'pending':
      return '메모리 대기';
    case 'running':
      return '메모리 처리 중';
    case 'succeeded':
      return '메모리 완료';
    case 'failed':
      return '메모리 실패';
    default:
      return `메모리 ${status}`;
  }
}

export function memoryStatusTone(status: MemoryStatus): string {
  if (status === 'failed') {
    return 'danger';
  }
  if (status === 'succeeded') {
    return 'success';
  }
  return 'neutral';
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return error.detail;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

export function applyServerFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): void {
  if (!(error instanceof ApiError)) {
    return;
  }

  for (const fieldError of error.fieldErrors) {
    setError(fieldError.field as Path<T>, {
      message: fieldError.message,
      type: 'server',
    });
  }
}

export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}
