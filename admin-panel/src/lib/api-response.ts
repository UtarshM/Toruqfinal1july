/**
 * src/lib/api-response.ts
 * Standardized API response contracts for Torque Auto Advisors.
 * 
 * Success Format:
 * {
 *   "success": true,
 *   "data": { ... }
 * }
 * 
 * Error Format:
 * {
 *   "success": false,
 *   "error": {
 *     "code": "VALIDATION_ERROR",
 *     "message": "Vehicle number is required",
 *     "details": { ... }
 *   },
 *   "requestId": "req_12345"
 * }
 */

import { NextResponse } from 'next/server'

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'IDEMPOTENCY_CONFLICT'
  | 'INTERNAL_ERROR'
  | 'BAD_REQUEST'

export interface ApiSuccessPayload<T = any> {
  success: true
  data: T
}

export interface ApiErrorPayload {
  success: false
  error: {
    code: ApiErrorCode | string
    message: string
    details?: any
  }
  requestId: string
}

export function generateRequestId(req?: Request): string {
  if (req) {
    const existing = req.headers.get('x-request-id')
    if (existing) return existing
  }
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Standard API success response builder
 */
export function apiSuccess<T>(data: T, status = 200): NextResponse<ApiSuccessPayload<T>> {
  return NextResponse.json(
    {
      success: true,
      data
    },
    { status }
  )
}

/**
 * Standard API error response builder - guaranteed JSON output
 */
export function apiError(
  message: string,
  code: ApiErrorCode | string = 'INTERNAL_ERROR',
  status = 500,
  details: any = null,
  req?: Request
): NextResponse<ApiErrorPayload> {
  const requestId = generateRequestId(req)
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        details: details || null
      },
      requestId
    },
    { status }
  )
}
