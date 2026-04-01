import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import StatsStyling from "../styles/stats_styling";

const styles = StatsStyling;
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

type SourceOption = {
  id: string;
  label: string;
  search_enabled?: boolean;
  categories_enabled?: boolean;
  searchEnabled?: boolean;
  categoriesEnabled?: boolean;
};

type SourceConfig = {
  sourceName: string;
  limit: string;
  search: string;
  category: string;
};

type TopicMap = Record<string, string>;

const buildEmptySourceConfig = (sourceName = ""): SourceConfig => ({
  sourceName,
  limit: "100",
  search: "",
  category: "",
});

const supportsSearch = (source?: SourceOption): boolean =>
  Boolean(source?.search_enabled ?? source?.searchEnabled);

const supportsCategories = (source?: SourceOption): boolean =>
  Boolean(source?.categories_enabled ?? source?.categoriesEnabled);

const AutoFetchPage = () => {
  const navigate = useNavigate();
  const [datasetName, setDatasetName] = useState("");
  const [sourceOptions, setSourceOptions] = useState<SourceOption[]>([]);
  const [sourceConfigs, setSourceConfigs] = useState<SourceConfig[]>([]);
  const [returnMessage, setReturnMessage] = useState("");
  const [isLoadingSources, setIsLoadingSources] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [useCustomTopics, setUseCustomTopics] = useState(false);
  const [customTopicsText, setCustomTopicsText] = useState("");

  useEffect(() => {
    axios
      .get<SourceOption[]>(`${API_BASE_URL}/datasets/sources`)
      .then((response) => {
        const options = response.data || [];
        setSourceOptions(options);
        setSourceConfigs([buildEmptySourceConfig(options[0]?.id || "")]);
      })
      .catch((requestError: unknown) => {
        setHasError(true);
        if (axios.isAxiosError(requestError)) {
          setReturnMessage(
            `Failed to load available sources: ${String(
              requestError.response?.data?.error || requestError.message,
            )}`,
          );
        } else {
          setReturnMessage("Failed to load available sources.");
        }
      })
      .finally(() => {
        setIsLoadingSources(false);
      });
  }, []);

  const updateSourceConfig = (
    index: number,
    field: keyof SourceConfig,
    value: string,
  ) => {
    setSourceConfigs((previous) =>
      previous.map((config, configIndex) =>
        configIndex === index
          ? field === "sourceName"
            ? { ...config, sourceName: value, search: "", category: "" }
            : { ...config, [field]: value }
          : config,
      ),
    );
  };

  const getSourceOption = (sourceName: string) =>
    sourceOptions.find((option) => option.id === sourceName);

  const addSourceConfig = () => {
    setSourceConfigs((previous) => [
      ...previous,
      buildEmptySourceConfig(sourceOptions[0]?.id || ""),
    ]);
  };

  const removeSourceConfig = (index: number) => {
    setSourceConfigs((previous) =>
      previous.filter((_, configIndex) => configIndex !== index),
    );
  };

  const autoFetch = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setHasError(true);
      setReturnMessage("You must be signed in to auto fetch a dataset.");
      return;
    }

    const normalizedDatasetName = datasetName.trim();
    if (!normalizedDatasetName) {
      setHasError(true);
      setReturnMessage("Please add a dataset name before continuing.");
      return;
    }

    if (sourceConfigs.length === 0) {
      setHasError(true);
      setReturnMessage("Please add at least one source.");
      return;
    }

    const normalizedSources = sourceConfigs.map((source) => {
      const sourceOption = getSourceOption(source.sourceName);

      return {
        name: source.sourceName,
        limit: Number(source.limit || 100),
        search: supportsSearch(sourceOption)
          ? source.search.trim() || undefined
          : undefined,
        category: supportsCategories(sourceOption)
          ? source.category.trim() || undefined
          : undefined,
      };
    });

    const invalidSource = normalizedSources.find(
      (source) =>
        !source.name || !Number.isFinite(source.limit) || source.limit <= 0,
    );

    if (invalidSource) {
      setHasError(true);
      setReturnMessage(
        "Every source needs a name and a limit greater than zero.",
      );
      return;
    }

    let normalizedTopics: TopicMap | undefined;

    if (useCustomTopics) {
      const customTopicsJson = customTopicsText.trim();

      if (!customTopicsJson) {
        setHasError(true);
        setReturnMessage(
          "Custom topics are enabled, so please provide a JSON topic map.",
        );
        return;
      }

      let parsedTopics: unknown;
      try {
        parsedTopics = JSON.parse(customTopicsJson);
      } catch {
        setHasError(true);
        setReturnMessage("Custom topic list must be valid JSON.");
        return;
      }

      if (
        !parsedTopics ||
        Array.isArray(parsedTopics) ||
        typeof parsedTopics !== "object"
      ) {
        setHasError(true);
        setReturnMessage(
          "Custom topic list must be a JSON object: {\"Topic\": \"keywords\"}.",
        );
        return;
      }

      const entries = Object.entries(parsedTopics);
      if (entries.length === 0) {
        setHasError(true);
        setReturnMessage("Custom topic list cannot be empty.");
        return;
      }

      const hasInvalidTopic = entries.some(
        ([topicName, keywords]) =>
          !topicName.trim() ||
          typeof keywords !== "string" ||
          !keywords.trim(),
      );

      if (hasInvalidTopic) {
        setHasError(true);
        setReturnMessage(
          "Every custom topic must have a non-empty name and keyword string.",
        );
        return;
      }

      normalizedTopics = Object.fromEntries(
        entries.map(([topicName, keywords]) => [
          topicName.trim(),
          String(keywords).trim(),
        ]),
      );
    }

    const requestBody: {
      name: string;
      sources: Array<{
        name: string;
        limit: number;
        search?: string;
        category?: string;
      }>;
      topics?: TopicMap;
    } = {
      name: normalizedDatasetName,
      sources: normalizedSources,
    };

    if (normalizedTopics) {
      requestBody.topics = normalizedTopics;
    }

    try {
      setIsSubmitting(true);
      setHasError(false);
      setReturnMessage("");

      const response = await axios.post(
        `${API_BASE_URL}/datasets/fetch`,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const datasetId = Number(response.data.dataset_id);

      setReturnMessage(
        `Auto fetch queued successfully (dataset #${datasetId}). Redirecting to processing status...`,
      );

      setTimeout(() => {
        navigate(`/dataset/${datasetId}/status`);
      }, 400);
    } catch (requestError: unknown) {
      setHasError(true);
      if (axios.isAxiosError(requestError)) {
        const message = String(
          requestError.response?.data?.error ||
            requestError.message ||
            "Auto fetch failed.",
        );
        setReturnMessage(`Auto fetch failed: ${message}`);
      } else {
        setReturnMessage("Auto fetch failed due to an unexpected error.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.containerWide}>
        <div style={{ ...styles.card, ...styles.headerBar }}>
          <div>
            <h1 style={styles.sectionHeaderTitle}>Auto Fetch Dataset</h1>
            <p style={styles.sectionHeaderSubtitle}>
              Select sources and fetch settings, then queue processing
              automatically.
            </p>
            <p
              style={{
                ...styles.subtleBodyText,
                marginTop: 6,
                color: "#9a6700",
              }}
            >
              Warning: Fetching more than 250 posts from any single site can
              take hours due to rate limits.
            </p>
          </div>
          <button
            type="button"
            style={{
              ...styles.buttonPrimary,
              opacity: isSubmitting || isLoadingSources ? 0.75 : 1,
            }}
            onClick={autoFetch}
            disabled={isSubmitting || isLoadingSources}
          >
            {isSubmitting ? "Queueing..." : "Auto Fetch and Analyze"}
          </button>
        </div>

        <div
          style={{
            ...styles.grid,
            marginTop: 14,
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          }}
        >
          <div style={{ ...styles.card, gridColumn: "auto" }}>
            <h2 style={{ ...styles.sectionTitle, color: "#24292f" }}>
              Dataset Name
            </h2>
            <p style={styles.sectionSubtitle}>
              Use a clear label so you can identify this run later.
            </p>
            <input
              style={{ ...styles.input, ...styles.inputFullWidth }}
              type="text"
              placeholder="Example: r/cork subreddit - Jan 2026"
              value={datasetName}
              onChange={(event) => setDatasetName(event.target.value)}
            />
          </div>

          <div style={{ ...styles.card, gridColumn: "auto" }}>
            <h2 style={{ ...styles.sectionTitle, color: "#24292f" }}>
              Sources
            </h2>
            <p style={styles.sectionSubtitle}>
              Configure source, limit, optional search, and optional category.
            </p>

            {isLoadingSources && (
              <p style={styles.subtleBodyText}>Loading sources...</p>
            )}

            {!isLoadingSources && sourceOptions.length === 0 && (
              <p style={styles.subtleBodyText}>
                No source connectors are currently available.
              </p>
            )}

            {!isLoadingSources && sourceOptions.length > 0 && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {sourceConfigs.map((source, index) => {
                  const sourceOption = getSourceOption(source.sourceName);
                  const searchEnabled = supportsSearch(sourceOption);
                  const categoriesEnabled = supportsCategories(sourceOption);

                  return (
                    <div
                      key={`source-${index}`}
                      style={{
                        border: "1px solid #d0d7de",
                        borderRadius: 8,
                        padding: 12,
                        background: "#f6f8fa",
                        display: "grid",
                        gap: 8,
                      }}
                    >
                      <select
                        value={source.sourceName}
                        style={{ ...styles.input, ...styles.inputFullWidth }}
                        onChange={(event) =>
                          updateSourceConfig(
                            index,
                            "sourceName",
                            event.target.value,
                          )
                        }
                      >
                        {sourceOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min={1}
                        value={source.limit}
                        placeholder="Limit"
                        style={{ ...styles.input, ...styles.inputFullWidth }}
                        onChange={(event) =>
                          updateSourceConfig(index, "limit", event.target.value)
                        }
                      />

                      <input
                        type="text"
                        value={source.search}
                        placeholder={
                          searchEnabled
                            ? "Search term (optional)"
                            : "Search not supported for this source"
                        }
                        style={{ ...styles.input, ...styles.inputFullWidth }}
                        disabled={!searchEnabled}
                        onChange={(event) =>
                          updateSourceConfig(
                            index,
                            "search",
                            event.target.value,
                          )
                        }
                      />

                      <input
                        type="text"
                        value={source.category}
                        placeholder={
                          categoriesEnabled
                            ? "Category (optional)"
                            : "Categories not supported for this source"
                        }
                        style={{ ...styles.input, ...styles.inputFullWidth }}
                        disabled={!categoriesEnabled}
                        onChange={(event) =>
                          updateSourceConfig(
                            index,
                            "category",
                            event.target.value,
                          )
                        }
                      />

                      {sourceConfigs.length > 1 && (
                        <button
                          type="button"
                          style={styles.buttonSecondary}
                          onClick={() => removeSourceConfig(index)}
                        >
                          Remove source
                        </button>
                      )}
                    </div>
                  );
                })}

                <button
                  type="button"
                  style={styles.buttonSecondary}
                  onClick={addSourceConfig}
                >
                  Add another source
                </button>
              </div>
            )}
          </div>

          <div style={{ ...styles.card, gridColumn: "auto" }}>
            <h2 style={{ ...styles.sectionTitle, color: "#24292f" }}>
              Topic List
            </h2>
            <p style={styles.sectionSubtitle}>
              Use the default topic list, or provide your own JSON topic map.
            </p>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 14,
                color: "#24292f",
                marginBottom: 10,
              }}
            >
              <input
                type="checkbox"
                checked={useCustomTopics}
                onChange={(event) => setUseCustomTopics(event.target.checked)}
              />
              Use custom topic list
            </label>

            <textarea
              value={customTopicsText}
              onChange={(event) => setCustomTopicsText(event.target.value)}
              disabled={!useCustomTopics}
              placeholder='{"Politics": "election, policy, government", "Housing": "rent, landlords, tenancy"}'
              style={{
                ...styles.input,
                ...styles.inputFullWidth,
                minHeight: 170,
                resize: "vertical",
                fontFamily:
                  '"IBM Plex Mono", "Fira Code", "JetBrains Mono", monospace',
              }}
            />
            <p style={styles.subtleBodyText}>
              Format: JSON object where each key is a topic and each value is a
              keyword string.
            </p>
          </div>
        </div>

        <div
          style={{
            ...styles.card,
            marginTop: 14,
            ...(hasError ? styles.alertCardError : styles.alertCardInfo),
          }}
        >
          {returnMessage ||
            "After queueing, your dataset is fetched and processed in the background automatically."}
        </div>
      </div>
    </div>
  );
};

export default AutoFetchPage;
