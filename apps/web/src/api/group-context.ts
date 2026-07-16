const KEY = "openfit.currentGroupId";
const EVENT = "openfit-group-changed";

export function getCurrentGroupId() {
  return localStorage.getItem(KEY) || "";
}

export function setCurrentGroupId(groupId: string) {
  if (groupId) localStorage.setItem(KEY, groupId);
  else localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: groupId }));
}

export function onCurrentGroupChange(handler: (groupId: string) => void) {
  const listener = (event: Event) => handler((event as CustomEvent<string>).detail || getCurrentGroupId());
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
