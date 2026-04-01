export const ITEM_PRICES: Record<string, number> = {
  shirt: 20,
  tshirt: 18,
  jeans: 40,
  trousers: 35,
  dress: 60,
  jacket: 90,
  sweater: 50,
  bedsheet: 70,
  pillowcover: 20,
  towel: 22,
  curtain: 110,
  blanket: 140,
};

export const SERVICE_MULTIPLIERS: Record<string, number> = {
  wash: 1,
  dry: 2.5,
  express: 3,
};

export const DELIVERY_CHARGE = 25;
export const FREE_DELIVERY_THRESHOLD = 299;

export const getNormalizedService = (service: string | string[] | undefined) =>
  String(Array.isArray(service) ? service[0] : service || "")
    .trim()
    .toLowerCase();

export const getServiceMultiplier = (service: string | string[] | undefined) =>
  SERVICE_MULTIPLIERS[getNormalizedService(service)] ?? 1;

export const getItemPriceForService = (
  itemKey: string,
  service: string | string[] | undefined
) => Math.round((ITEM_PRICES[itemKey] || 0) * getServiceMultiplier(service));

export const calculateSubtotal = (
  items: Record<string, number>,
  service: string | string[] | undefined
) =>
  Object.keys(items).reduce(
    (sum, key) => sum + getItemPriceForService(key, service) * Number(items[key] || 0),
    0
  );
