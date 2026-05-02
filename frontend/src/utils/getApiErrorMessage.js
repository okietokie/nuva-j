function flattenDetail(detail) {
  if (!detail) {
    return "";
  }

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => flattenDetail(item))
      .filter(Boolean)
      .join(" ");
  }

  if (typeof detail === "object") {
    if (typeof detail.msg === "string") {
      return detail.msg;
    }

    if (typeof detail.detail === "string") {
      return detail.detail;
    }

    return Object.values(detail)
      .map((value) => flattenDetail(value))
      .filter(Boolean)
      .join(" ");
  }

  return String(detail);
}

export function getApiErrorMessage(error, fallbackMessage) {
  const detailMessage = flattenDetail(error?.response?.data?.detail);
  const messageText = typeof error?.message === "string" ? error.message : "";

  return detailMessage || messageText || fallbackMessage;
}
