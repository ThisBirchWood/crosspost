const DEFAULT_TITLE = "Ethnograph View";

const STATIC_TITLES: Record<string, string> = {
  "/login": "Sign In",
  "/upload": "Upload Dataset",
  "/stats": "Stats",
};

export const getDocumentTitle = (pathname: string) => {
  if (pathname.includes("status")) {
    return "Processing Dataset";
  }

  return STATIC_TITLES[pathname] ?? DEFAULT_TITLE;
};
