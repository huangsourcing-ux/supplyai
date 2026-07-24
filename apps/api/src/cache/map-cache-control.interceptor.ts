import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common";
import type { FastifyReply } from "fastify";
import type { Observable } from "rxjs";
import { tap } from "rxjs";

export const MAP_CACHE_CONTROL = "public, max-age=0, s-maxage=3600" as const;

@Injectable()
export class MapCacheControlInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse<FastifyReply>();
    return next.handle().pipe(
      tap(() => {
        response.header("Cache-Control", MAP_CACHE_CONTROL);
      }),
    );
  }
}
