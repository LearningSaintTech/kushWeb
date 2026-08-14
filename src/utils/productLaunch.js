export function isItemComingSoon(item, now = Date.now()) {
  if (!item || item.isComingSoon !== true) return false;
  if (!item.launchDate) return true;

  const launchTime = new Date(item.launchDate).getTime();
  return Number.isNaN(launchTime) || launchTime > now;
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
    isComingSoon: Boolean(item?.isComingSoon),
    launchDate: item?.launchDate ?? null,
  };
}
