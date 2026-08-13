const VALID_PRODUCT_WORKSPACE_SECTIONS = new Set([
  "overview",
  "catalog",
  "pricing",
  "purchase",
  "inventory",
  "media",
  "variants",
  "packaging",
  "workflow"
]);

const VALID_PRODUCT_WORKSPACE_SOURCES = new Set([
  "products",
  "packaging",
  "inventory",
  "purchases"
]);

const RETURN_TARGETS = {
  products: "/admin/products",
  packaging: "/admin/packaging",
  inventory: "/admin/inventory",
  purchases: "/admin/purchases"
};

export function normalizeProductWorkspaceSection(value) {
  return VALID_PRODUCT_WORKSPACE_SECTIONS.has(value) ? value : "overview";
}

export function normalizeProductWorkspaceSource(value) {
  return VALID_PRODUCT_WORKSPACE_SOURCES.has(value) ? value : "products";
}

export function getProductWorkspaceReturnTarget(source) {
  return RETURN_TARGETS[normalizeProductWorkspaceSource(source)];
}

export function buildProductWorkspaceState(options = {}) {
  const source = normalizeProductWorkspaceSource(options.from);
  const fallbackPath = getProductWorkspaceReturnTarget(source);
  const routeState = options.routeState || {};
  const pathname =
    typeof options.pathname === "string" && options.pathname.startsWith("/admin/")
      ? options.pathname
      : fallbackPath;

  return {
    ...routeState,
    productWorkspaceReturn: {
      from: source,
      pathname,
      search: typeof options.search === "string" ? options.search : "",
      label: options.label || null,
      snapshot: options.snapshot || null
    }
  };
}

export function getProductWorkspaceTarget(productId, options = {}) {
  const searchParams = new URLSearchParams();
  searchParams.set("section", normalizeProductWorkspaceSection(options.section));
  searchParams.set("from", normalizeProductWorkspaceSource(options.from));

  return {
    pathname: `/admin/products/${productId}`,
    search: `?${searchParams.toString()}`,
    state: buildProductWorkspaceState(options)
  };
}

export function openProductWorkspace(navigate, productId, options = {}) {
  navigate(getProductWorkspaceTarget(productId, options));
}

export function getValidatedWorkspaceContext(searchParams, routeState) {
  const section = normalizeProductWorkspaceSection(searchParams.get("section"));
  const from = normalizeProductWorkspaceSource(searchParams.get("from"));
  const fallbackPath = getProductWorkspaceReturnTarget(from);
  const savedReturn = routeState?.productWorkspaceReturn || {};
  const pathname =
    typeof savedReturn.pathname === "string" && savedReturn.pathname.startsWith("/admin/")
      ? savedReturn.pathname
      : fallbackPath;

  return {
    section,
    from,
    returnTarget: {
      pathname,
      search: typeof savedReturn.search === "string" ? savedReturn.search : "",
      label: savedReturn.label || null,
      snapshot: savedReturn.snapshot || null
    }
  };
}
