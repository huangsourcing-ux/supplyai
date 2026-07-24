import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { type Observable, map } from "rxjs";

import { type ApiSuccessEnvelope, isResponseWithMeta } from "./api-envelope.js";
import { RAW_RESPONSE_METADATA } from "./raw-response.js";

@Injectable()
export class ApiEnvelopeInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiSuccessEnvelope<unknown, unknown> | unknown> {
    const isRawResponse = this.reflector.getAllAndOverride<boolean>(
      RAW_RESPONSE_METADATA,
      [context.getHandler(), context.getClass()],
    );

    if (isRawResponse === true) {
      return next.handle();
    }

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
