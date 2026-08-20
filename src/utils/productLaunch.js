export function isItemComingSoon(item, now = Date.now()) {
  if (!item || item.isComingSoon !== true) return false;
  if (!item.launchDate) return true;

  const launchTime = new Date(item.launchDate).getTime();
  return Number.isNaN(launchTime) || launchTime > now;
}

/** Home / marketing grids — hide locked coming-soon products. */
export function isHomeVisibleProduct(item) {
  return Boolean(item) && !isItemComingSoon(item);
}

export function filterHomeVisibleProducts(items = []) {
  return (Array.isArray(items) ? items : []).filter(isHomeVisibleProduct);
}

export function formatLaunchDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function itemLaunchCardProps(item) {
  return {
    // Keep strict boolean so home filters match isItemComingSoon()
    isComingSoon: item?.isComingSoon === true,
    launchDate: item?.launchDate ?? null,
  };
}
