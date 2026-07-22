import { Global, Module } from "@nestjs/common";
import { parseApiRuntimeEnv } from "@chinasupply/config/env/api";

export const RUNTIME_CONFIG = Symbol("RUNTIME_CONFIG");

export type RuntimeConfig = ReturnType<typeof parseApiRuntimeEnv>;

@Global()
@Module({
  providers: [
    {
      provide: RUNTIME_CONFIG,
      useFactory: (): RuntimeConfig =>
        Object.freeze(parseApiRuntimeEnv(process.env)),
    },
  ],
  exports: [RUNTIME_CONFIG],
})
export class RuntimeConfigModule {}
