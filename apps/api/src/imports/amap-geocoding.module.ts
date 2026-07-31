import { Module } from "@nestjs/common";
import { parseAmapGeocodingEnv } from "@chinasupply/config/env/api";

import {
  AmapGeocodingClient,
  type AmapGeocodingConfig,
} from "./amap-geocoding.client.js";

export const AMAP_GEOCODING_CONFIG = Symbol("AMAP_GEOCODING_CONFIG");

@Module({
  providers: [
    {
      provide: AMAP_GEOCODING_CONFIG,
      useFactory: (): Readonly<AmapGeocodingConfig> =>
        Object.freeze(parseAmapGeocodingEnv(process.env)),
    },
    {
      provide: AmapGeocodingClient,
      inject: [AMAP_GEOCODING_CONFIG],
      useFactory: (config: Readonly<AmapGeocodingConfig>) =>
        new AmapGeocodingClient(config),
    },
  ],
  exports: [AmapGeocodingClient],
})
export class AmapGeocodingModule {}
