const DEFAULT_TITLE = "Ethnograph View";

const STATIC_TITLES: Record<string, string> = {
  "/login": "Sign In",
  "/upload": "Upload Dataset",
  "/auto-fetch": "Auto Fetch Dataset",
  "/datasets": "My Datasets",
};

export const getDocumentTitle = (pathname: string) => {
  if (pathname.includes("status")) {
    return "Processing Dataset";
  }

  if (pathname.includes("stats")) {
    return "Ethnography Analysis";
  }

  return STATIC_TITLES[pathname] ?? DEFAULT_TITLE;
};
