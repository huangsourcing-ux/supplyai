import { Controller, Get, Header } from "@nestjs/common";

import { RawResponse } from "../common/http/raw-response.js";
import {
  openApiDocument,
  type ChinaSupplyOpenApiDocument,
} from "./openapi-document.js";

@Controller("api")
export class OpenApiController {
  @Get("openapi.json")
  @Header("Cache-Control", "no-store")
  @RawResponse()
  document(): ChinaSupplyOpenApiDocument {
    return openApiDocument;
  }
}
