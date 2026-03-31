import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import StatsStyling from "../styles/stats_styling";
import SummaryStats from "../components/SummaryStats";
import EmotionalStats from "../components/EmotionalStats";
import UserStats from "../components/UserStats";
import LinguisticStats from "../components/LinguisticStats";
import InteractionalStats from "../components/InteractionalStats";
import CulturalStats from "../components/CulturalStats";
import CorpusExplorer from "../components/CorpusExplorer";

import {
  type SummaryResponse,
  type TimeAnalysisResponse,
  type User,
  type UserEndpointResponse,
  type LinguisticAnalysisResponse,
  type EmotionalAnalysisResponse,
  type InteractionAnalysisResponse,
  type CulturalAnalysisResponse,
} from "../types/ApiTypes";
import {
  buildExplorerContext,
  type CorpusExplorerSpec,
  type DatasetRecord,
} from "../utils/corpusExplorer";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;
const styles = StatsStyling;
const DELETED_USERS = ["[deleted]", "automoderator"];

const isDeletedUser = (value: string | null | undefined) =>
  DELETED_USERS.includes((value ?? "").trim().toLowerCase());

type ActiveView =
  | "summary"
  | "emotional"
  | "user"
  | "linguistic"
  | "interactional"
  | "cultural";

type UserStatsMeta = {
  totalUsers: number;
  mostCommentHeavyUser: { author: string; commentShare: number } | null;
};

type ExplorerState = {
  open: boolean;
  title: string;
  description: string;
  emptyMessage: string;
  records: DatasetRecord[];
  loading: boolean;
  error: string;
};

const EMPTY_EXPLORER_STATE: ExplorerState = {
  open: false,
  title: "Corpus Explorer",
  description: "",
  emptyMessage: "No records found.",
  records: [],
  loading: false,
  error: "",
};

const normalizeRecordPayload = (payload: unknown): DatasetRecord[] => {
  if (typeof payload === "string") {
    try {
      return normalizeRecordPayload(JSON.parse(payload));
    } catch {
      throw new Error("Corpus endpoint returned a non-JSON string payload.");
    }
  }

  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof (payload as { error?: unknown }).error === "string"
  ) {
    throw new Error((payload as { error: string }).error);
  }

  if (Array.isArray(payload)) {
    return payload as DatasetRecord[];
  }

  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    Array.isArray((payload as { data?: unknown }).data)
  ) {
    return (payload as { data: DatasetRecord[] }).data;
  }

  if (
    payload &&
    typeof payload === "object" &&
    "records" in payload &&
    Array.isArray((payload as { records?: unknown }).records)
  ) {
    return (payload as { records: DatasetRecord[] }).records;
  }

  if (
    payload &&
    typeof payload === "object" &&
    "rows" in payload &&
    Array.isArray((payload as { rows?: unknown }).rows)
  ) {
    return (payload as { rows: DatasetRecord[] }).rows;
  }

  if (
    payload &&
    typeof payload === "object" &&
    "result" in payload &&
    Array.isArray((payload as { result?: unknown }).result)
  ) {
    return (payload as { result: DatasetRecord[] }).result;
  }

  if (payload && typeof payload === "object") {
    const values = Object.values(payload);
    if (values.length === 1 && Array.isArray(values[0])) {
      return values[0] as DatasetRecord[];
    }
    if (values.every((value) => value && typeof value === "object")) {
      return values as DatasetRecord[];
    }
  }

  throw new Error("Corpus endpoint returned an unexpected payload.");
};

const StatPage = () => {
  const { datasetId: routeDatasetId } = useParams<{ datasetId: string }>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>("summary");

  const [userData, setUserData] = useState<UserEndpointResponse | null>(null);
  const [timeData, setTimeData] = useState<TimeAnalysisResponse | null>(null);
  const [linguisticData, setLinguisticData] =
    useState<LinguisticAnalysisResponse | null>(null);
  const [emotionalData, setEmotionalData] =
    useState<EmotionalAnalysisResponse | null>(null);
  const [interactionData, setInteractionData] =
    useState<InteractionAnalysisResponse | null>(null);
  const [culturalData, setCulturalData] =
    useState<CulturalAnalysisResponse | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [userStatsMeta, setUserStatsMeta] = useState<UserStatsMeta>({
    totalUsers: 0,
    mostCommentHeavyUser: null,
  });
  const [appliedFilters, setAppliedFilters] = useState<Record<string, string>>({});
  const [allRecords, setAllRecords] = useState<DatasetRecord[] | null>(null);
  const [allRecordsKey, setAllRecordsKey] = useState("");
  const [explorerState, setExplorerState] = useState<ExplorerState>(
    EMPTY_EXPLORER_STATE,
  );

  const searchInputRef = useRef<HTMLInputElement>(null);
  const beforeDateRef = useRef<HTMLInputElement>(null);
  const afterDateRef = useRef<HTMLInputElement>(null);

  const parsedDatasetId = Number(routeDatasetId ?? "");
  const datasetId =
    Number.isInteger(parsedDatasetId) && parsedDatasetId > 0
      ? parsedDatasetId
      : null;

  const getFilterParams = () => {
    const params: Record<string, string> = {};
    const query = (searchInputRef.current?.value ?? "").trim();
    const start = (afterDateRef.current?.value ?? "").trim();
    const end = (beforeDateRef.current?.value ?? "").trim();

    if (query) {
      params.search_query = query;
    }

    if (start) {
      params.start_date = start;
    }

    if (end) {
      params.end_date = end;
    }

    return params;
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      return null;
    }

    return {
      Authorization: `Bearer ${token}`,
    };
  };

  const getFilterKey = (params: Record<string, string>) =>
    JSON.stringify(Object.entries(params).sort(([a], [b]) => a.localeCompare(b)));

  const ensureFilteredRecords = async () => {
    if (!datasetId) {
      throw new Error("Missing dataset id.");
    }

    const authHeaders = getAuthHeaders();
    if (!authHeaders) {
      throw new Error("You must be signed in to load corpus records.");
    }

    const filterKey = getFilterKey(appliedFilters);
    if (allRecords && allRecordsKey === filterKey) {
      return allRecords;
    }

    const response = await axios.get<unknown>(
      `${API_BASE_URL}/dataset/${datasetId}/all`,
      {
        params: appliedFilters,
        headers: authHeaders,
      },
    );

    const normalizedRecords = normalizeRecordPayload(response.data);

    setAllRecords(normalizedRecords);
    setAllRecordsKey(filterKey);
    return normalizedRecords;
  };

  const openExplorer = async (spec: CorpusExplorerSpec) => {
    setExplorerState({
      open: true,
      title: spec.title,
      description: spec.description,
      emptyMessage: spec.emptyMessage ?? "No matching records found.",
      records: [],
      loading: true,
      error: "",
    });

    try {
      const records = await ensureFilteredRecords();
      const context = buildExplorerContext(records);
      const matched = records.filter((record) => spec.matcher(record, context));
      matched.sort((a, b) => {
        const aValue = String(a.dt ?? a.date ?? a.timestamp ?? "");
        const bValue = String(b.dt ?? b.date ?? b.timestamp ?? "");
        return bValue.localeCompare(aValue);
      });

      setExplorerState({
        open: true,
        title: spec.title,
        description: spec.description,
        emptyMessage: spec.emptyMessage ?? "No matching records found.",
        records: matched,
        loading: false,
        error: "",
      });
    } catch (e) {
      setExplorerState({
        open: true,
        title: spec.title,
        description: spec.description,
        emptyMessage: spec.emptyMessage ?? "No matching records found.",
        records: [],
        loading: false,
        error: `Failed to load corpus records: ${String(e)}`,
      });
    }
  };

  const getStats = (params: Record<string, string> = {}) => {
    if (!datasetId) {
      setError("Missing dataset id. Open /dataset/<id>/stats.");
      return;
    }

    const authHeaders = getAuthHeaders();
    if (!authHeaders) {
      setError("You must be signed in to load stats.");
      return;
    }

    setError("");
    setLoading(true);
    setAppliedFilters(params);
    setAllRecords(null);
    setAllRecordsKey("");
    setExplorerState((current) => ({ ...current, open: false }));

    Promise.all([
      axios.get<TimeAnalysisResponse>(`${API_BASE_URL}/dataset/${datasetId}/temporal`, {
        params,
        headers: authHeaders,
      }),
      axios.get<UserEndpointResponse>(`${API_BASE_URL}/dataset/${datasetId}/user`, {
        params,
        headers: authHeaders,
      }),
      axios.get<LinguisticAnalysisResponse>(
        `${API_BASE_URL}/dataset/${datasetId}/linguistic`,
        {
          params,
          headers: authHeaders,
        },
      ),
      axios.get<EmotionalAnalysisResponse>(`${API_BASE_URL}/dataset/${datasetId}/emotional`, {
        params,
        headers: authHeaders,
      }),
      axios.get<InteractionAnalysisResponse>(
        `${API_BASE_URL}/dataset/${datasetId}/interactional`,
        {
          params,
          headers: authHeaders,
        },
      ),
      axios.get<SummaryResponse>(`${API_BASE_URL}/dataset/${datasetId}/summary`, {
        params,
        headers: authHeaders,
      }),
      axios.get<CulturalAnalysisResponse>(`${API_BASE_URL}/dataset/${datasetId}/cultural`, {
        params,
        headers: authHeaders,
      }),
    ])
      .then(
        ([
          timeRes,
          userRes,
          linguisticRes,
          emotionalRes,
          interactionRes,
          summaryRes,
          culturalRes,
        ]) => {
          const usersList = userRes.data.users ?? [];
          const topUsersList = userRes.data.top_users ?? [];
          const interactionGraphRaw = interactionRes.data?.interaction_graph ?? {};
          const topPairsRaw = interactionRes.data?.top_interaction_pairs ?? [];

          const filteredUsers: typeof usersList = [];
          for (const user of usersList) {
            if (isDeletedUser(user.author)) continue;
            filteredUsers.push(user);
          }

          const filteredTopUsers: typeof topUsersList = [];
          for (const user of topUsersList) {
            if (isDeletedUser(user.author)) continue;
            filteredTopUsers.push(user);
          }

          let mostCommentHeavyUser: UserStatsMeta["mostCommentHeavyUser"] = null;
          for (const user of filteredUsers) {
            const currentShare = user.comment_share ?? 0;
            if (!mostCommentHeavyUser || currentShare > mostCommentHeavyUser.commentShare) {
              mostCommentHeavyUser = {
                author: user.author,
                commentShare: currentShare,
              };
            }
          }

          const topAuthors = new Set(filteredTopUsers.map((entry) => entry.author));
          const summaryUsers: User[] = [];
          for (const user of filteredUsers) {
            if (topAuthors.has(user.author)) {
              summaryUsers.push(user);
            }
          }

          const filteredInteractionGraph: Record<string, Record<string, number>> = {};
          for (const [source, targets] of Object.entries(interactionGraphRaw)) {
            if (isDeletedUser(source)) {
              continue;
            }

            const nextTargets: Record<string, number> = {};
            for (const [target, count] of Object.entries(targets)) {
              if (isDeletedUser(target)) {
                continue;
              }
              nextTargets[target] = count;
            }

            filteredInteractionGraph[source] = nextTargets;
          }

          const filteredTopInteractionPairs: typeof topPairsRaw = [];
          for (const pairEntry of topPairsRaw) {
            const pair = pairEntry[0];
            const source = pair[0];
            const target = pair[1];
            if (isDeletedUser(source) || isDeletedUser(target)) {
              continue;
            }
            filteredTopInteractionPairs.push(pairEntry);
          }

          const filteredUserData: UserEndpointResponse = {
            users: summaryUsers,
            top_users: filteredTopUsers,
          };

          const filteredInteractionData: InteractionAnalysisResponse = {
            ...interactionRes.data,
            interaction_graph: filteredInteractionGraph,
            top_interaction_pairs: filteredTopInteractionPairs,
          };

          const filteredSummary: SummaryResponse = {
            ...summaryRes.data,
            unique_users: filteredUsers.length,
          };

          setUserData(filteredUserData);
          setUserStatsMeta({
            totalUsers: filteredUsers.length,
            mostCommentHeavyUser,
          });
          setTimeData(timeRes.data || null);
          setLinguisticData(linguisticRes.data || null);
          setEmotionalData(emotionalRes.data || null);
          setInteractionData(filteredInteractionData || null);
          setCulturalData(culturalRes.data || null);
          setSummary(filteredSummary || null);
        },
      )
      .catch((e) => setError(`Failed to load statistics: ${String(e)}`))
      .finally(() => setLoading(false));
  };

  const onSubmitFilters = () => {
    getStats(getFilterParams());
  };

  const resetFilters = () => {
    if (searchInputRef.current) {
      searchInputRef.current.value = "";
    }
    if (beforeDateRef.current) {
      beforeDateRef.current.value = "";
    }
    if (afterDateRef.current) {
      afterDateRef.current.value = "";
    }
    getStats();
  };

  useEffect(() => {
    setError("");
    setAllRecords(null);
    setAllRecordsKey("");
    setExplorerState(EMPTY_EXPLORER_STATE);
    if (!datasetId) {
      setError("Missing dataset id. Open /dataset/<id>/stats.");
      return;
    }
    getStats();
  }, [datasetId]);

  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <div style={{ ...styles.loadingCard, transform: "translateY(-100px)" }}>
          <div style={styles.loadingHeader}>
            <div style={styles.loadingSpinner} />
            <div>
              <h2 style={styles.loadingTitle}>Loading analytics</h2>
              <p style={styles.loadingSubtitle}>
                Fetching summary, timeline, user, and content insights.
              </p>
            </div>
          </div>

          <div style={styles.loadingSkeleton}>
            <div
              style={{
                ...styles.loadingSkeletonLine,
                ...styles.loadingSkeletonLineLong,
              }}
            />
            <div
              style={{
                ...styles.loadingSkeletonLine,
                ...styles.loadingSkeletonLineMed,
              }}
            />
            <div
              style={{
                ...styles.loadingSkeletonLine,
                ...styles.loadingSkeletonLineShort,
              }}
            />
          </div>
        </div>
      </div>
    );
  }
  if (error) return <p style={{ ...styles.page }}>{error}</p>;

  return (
    <div style={styles.page}>
      <div style={{ ...styles.container, ...styles.card, ...styles.headerBar }}>
        <div style={styles.controls}>
          <input
            type="text"
            id="query"
            ref={searchInputRef}
            placeholder="Search events..."
            style={styles.input}
          />

          <input
            type="date"
            ref={beforeDateRef}
            placeholder="Search before date"
            style={styles.input}
          />

          <input
            type="date"
            ref={afterDateRef}
            placeholder="Search before date"
            style={styles.input}
          />

          <button onClick={onSubmitFilters} style={styles.buttonPrimary}>
            Search
          </button>

          <button onClick={resetFilters} style={styles.buttonSecondary}>
            Reset
          </button>
        </div>

        <div style={styles.dashboardMeta}>Analytics Dashboard</div>
        <div style={styles.dashboardMeta}>Dataset #{datasetId ?? "-"}</div>
      </div>

      <div
        style={{
          ...styles.container,
          ...styles.tabsRow,
          justifyContent: "center",
        }}
      >
        <button
          onClick={() => setActiveView("summary")}
          style={
            activeView === "summary" ? styles.buttonPrimary : styles.buttonSecondary
          }
        >
          Summary
        </button>
        <button
          onClick={() => setActiveView("emotional")}
          style={
            activeView === "emotional"
              ? styles.buttonPrimary
              : styles.buttonSecondary
          }
        >
          Emotional
        </button>

        <button
          onClick={() => setActiveView("user")}
          style={activeView === "user" ? styles.buttonPrimary : styles.buttonSecondary}
        >
          Users
        </button>
        <button
          onClick={() => setActiveView("linguistic")}
          style={
            activeView === "linguistic"
              ? styles.buttonPrimary
              : styles.buttonSecondary
          }
        >
          Linguistic
        </button>
        <button
          onClick={() => setActiveView("interactional")}
          style={
            activeView === "interactional"
              ? styles.buttonPrimary
              : styles.buttonSecondary
          }
        >
          Interactional
        </button>
        <button
          onClick={() => setActiveView("cultural")}
          style={
            activeView === "cultural" ? styles.buttonPrimary : styles.buttonSecondary
          }
        >
          Cultural
        </button>
      </div>

      {activeView === "summary" && (
        <SummaryStats
          userData={userData}
          timeData={timeData}
          linguisticData={linguisticData}
          summary={summary}
          onExplore={openExplorer}
        />
      )}

      {activeView === "emotional" && emotionalData && (
        <EmotionalStats emotionalData={emotionalData} onExplore={openExplorer} />
      )}

      {activeView === "emotional" && !emotionalData && (
        <div style={{ ...styles.container, ...styles.card, marginTop: 16 }}>
          No emotional data available.
        </div>
      )}

      {activeView === "user" && userData && interactionData && (
        <UserStats
          topUsers={userData.top_users}
          interactionGraph={interactionData.interaction_graph}
          totalUsers={userStatsMeta.totalUsers}
          mostCommentHeavyUser={userStatsMeta.mostCommentHeavyUser}
          onExplore={openExplorer}
        />
      )}

      {activeView === "user" && (!userData || !interactionData) && (
        <div style={{ ...styles.container, ...styles.card, marginTop: 16 }}>
          No user network data available.
        </div>
      )}

      {activeView === "linguistic" && linguisticData && (
        <LinguisticStats data={linguisticData} onExplore={openExplorer} />
      )}

      {activeView === "linguistic" && !linguisticData && (
        <div style={{ ...styles.container, ...styles.card, marginTop: 16 }}>
          No linguistic data available.
        </div>
      )}

      {activeView === "interactional" && interactionData && (
        <InteractionalStats data={interactionData} onExplore={openExplorer} />
      )}

      {activeView === "interactional" && !interactionData && (
        <div style={{ ...styles.container, ...styles.card, marginTop: 16 }}>
          No interactional data available.
        </div>
      )}

      {activeView === "cultural" && culturalData && (
        <CulturalStats data={culturalData} onExplore={openExplorer} />
      )}

      {activeView === "cultural" && !culturalData && (
        <div style={{ ...styles.container, ...styles.card, marginTop: 16 }}>
          No cultural data available.
        </div>
      )}

      <CorpusExplorer
        open={explorerState.open}
        onClose={() => setExplorerState((current) => ({ ...current, open: false }))}
        title={explorerState.title}
        description={explorerState.description}
        records={explorerState.records}
        loading={explorerState.loading}
        error={explorerState.error}
        emptyMessage={explorerState.emptyMessage}
      />
    </div>
  );
};

export default StatPage;
