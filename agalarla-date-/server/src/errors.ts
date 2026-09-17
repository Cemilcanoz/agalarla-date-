/** Typed API error that maps to the stable `{ code, message, retryable }` body. */
import {
  ApiErrorCode,
  ERROR_HTTP_STATUS,
  RETRYABLE_CODES,
  type ApiErrorBody,
} from "./types/api.js";

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly statusCode: number;
  readonly retryable: boolean;

  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.statusCode = ERROR_HTTP_STATUS[code];
    this.retryable = RETRYABLE_CODES.has(code);
  }

  toBody(): ApiErrorBody {
    return { code: this.code, message: this.message, retryable: this.retryable };
  }
}

export const unauthenticated = (m = "Kimlik doğrulaması gerekli.") =>
  new ApiError(ApiErrorCode.UNAUTHENTICATED, m);
export const conflict = (m = "Kaynak zaten mevcut.") =>
  new ApiError(ApiErrorCode.CONFLICT, m);
export const profileIncomplete = (m = "Profil tamamlanmamış.") =>
  new ApiError(ApiErrorCode.PROFILE_INCOMPLETE, m);
export const notEligible = (m = "Bu işlem için uygun değilsiniz.") =>
  new ApiError(ApiErrorCode.NOT_ELIGIBLE, m);
export const rateLimited = (m = "Çok fazla istek. Lütfen sonra tekrar deneyin.") =>
  new ApiError(ApiErrorCode.RATE_LIMITED, m);
