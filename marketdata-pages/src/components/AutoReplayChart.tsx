import {
  CartesianGrid,
  Label,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import { useAutoplayIndex } from '../lib/autoplay';
import { fmtPrice } from '../lib/format';
import { ReplayPoint } from '../lib/schema';

type Props = {
  data: ReplayPoint[];
  activeIndex?: number;
};

export const AutoReplayChart = ({ data, activeIndex }: Props) => {
  const localIdx = useAutoplayIndex(data.length, 2200);
  const idx =
    activeIndex !== undefined
      ? Math.min(Math.max(activeIndex, 0), Math.max(data.length - 1, 0))
      : localIdx;
  const slice = data.slice(0, Math.max(1, idx + 1));

  const yMin = slice.length > 0 ? Math.min(...slice.map((p) => Math.min(p.bid, p.ask))) : 0;
  const yMax = slice.length > 0 ? Math.max(...slice.map((p) => Math.max(p.bid, p.ask))) : 1;
  const yRange = Math.max(yMax - yMin, 0.01);
  const yPadding = Math.max(yRange * 0.35, 0.02);
  const yDomain: [number, number] = [yMin - yPadding, yMax + yPadding];

  return (
    <div className="chart-box">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={slice} margin={{ top: 12, right: 20, left: 24, bottom: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#243347" />
          <XAxis dataKey="t" stroke="#8aa0b6">
            <Label value="Event index (x-axis)" offset={-6} position="insideBottom" fill="#8aa0b6" />
          </XAxis>
          <YAxis stroke="#8aa0b6" width={110} domain={yDomain} tickFormatter={(v: number) => fmtPrice(v)}>
            <Label
              value="Best bid / ask price (y-axis)"
              angle={-90}
              position="insideLeft"
              style={{ textAnchor: 'middle', fill: '#8aa0b6' }}
            />
          </YAxis>
          <Tooltip formatter={(value: number) => fmtPrice(value)} />
          <Legend />
          <Line type="monotone" dataKey="bid" stroke="#23d18b" dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="ask" stroke="#ff6b6b" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
      <p className="chart-axis-note">X-axis: event sequence. Y-axis: top-of-book price.</p>
    </div>
  );
};
