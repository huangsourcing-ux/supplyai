import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common";
import { type Observable, map } from "rxjs";

import { type ApiSuccessEnvelope, isResponseWithMeta } from "./api-envelope.js";

@Injectable()
export class ApiEnvelopeInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiSuccessEnvelope<unknown, unknown>> {
    return next.handle().pipe(
      map((result: unknown) => {
        if (isResponseWithMeta(result)) {
          return {
            data: result.data,
            error: null,
            meta: result.meta,
          };
        }

        return {
          data: result,
          error: null,
          meta: {},
        };
      }),
    );
  }
}
