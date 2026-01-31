import { ResponsiveHeatMap } from "@nivo/heatmap";

type ApiRow = Record<number, number>;
type ActivityHeatmapProps = {
  data: ApiRow[];
};

type ChartPoint = {
  x: string;
  y: number;
};

type ChartSeries = {
  id: string;
  data: ChartPoint[];
};

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const hourLabel = (h: number) =>
  `${h.toString().padStart(2, "0")}:00`;

const convertWeeklyData = (dataset: ApiRow[]): ChartSeries[] => {
  return dataset.map((dayData, index) => ({
    id: DAYS[index] ?? `Day ${index + 1}`,
    data: Object.entries(dayData)
      .sort(([a], [b]) => Number(a) - Number(b)) // ensure 0 → 23
      .map(([hour, value]) => ({
        x: hourLabel(Number(hour)),
        y: value,
      })),
  }));
};


const ActivityHeatmap = ({ data }: ActivityHeatmapProps) => {
    const convertedData = convertWeeklyData(data);

    const maxValue = Math.max(
    ...convertedData.flatMap(day =>
      day.data.map(point => point.y)
    )
  );

    return (
            <ResponsiveHeatMap
                data={convertedData}
                valueFormat=">-.2s"
                axisTop={{ tickRotation: -90 }}
                axisRight={{ legend: 'Weekday', legendOffset: 70 }}
                axisLeft={{ legend: 'Weekday', legendOffset: -72 }}
                colors={{
                    type: 'diverging',
                    scheme: 'red_yellow_blue',
                    divergeAt: 0.3,
                    minValue: 0,
                    maxValue: maxValue
                }}
        />
    )
}

export default ActivityHeatmap;