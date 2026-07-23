import type { NavigationValidationFixture } from "./types.js";

export const NAVIGATION_VALIDATION_FIXTURES = [
  {
    id: "beijing-national-convention-center",
    city: "Beijing",
    cityZh: "北京",
    destinationName: "国家会议中心",
    entranceDescription: "人工确认的驾车导航落点",
    wgs84: [116.3838387, 39.9984707],
  },
  {
    id: "shanghai-national-exhibition-convention-center",
    city: "Shanghai",
    cityZh: "上海",
    destinationName: "国家会展中心（上海）",
    entranceDescription: "人工确认的驾车导航落点",
    wgs84: [121.2971952, 31.1920509],
  },
  {
    id: "yiwu-international-trade-city-district-1",
    city: "Yiwu",
    cityZh: "义乌",
    destinationName: "义乌国际商贸城一区",
    entranceDescription: "人工确认的驾车导航落点",
    wgs84: [120.0981625, 29.3306899],
  },
  {
    id: "shenzhen-convention-exhibition-center",
    city: "Shenzhen",
    cityZh: "深圳",
    destinationName: "深圳会展中心",
    entranceDescription: "人工确认的驾车导航落点",
    wgs84: [114.0547472, 22.5335041],
  },
  {
    id: "dongguan-guangdong-modern-international-exhibition-center",
    city: "Dongguan",
    cityZh: "东莞",
    destinationName: "广东现代国际展览中心",
    entranceDescription: "人工确认的驾车导航落点",
    wgs84: [113.6522266, 22.9030947],
  },
] as const satisfies readonly NavigationValidationFixture[];
