import {
  Area,
  AreaChart,
  CartesianGrid,
  Label,
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
};

export const SpreadChart = ({ data }: Props) => {
  const idx = useAutoplayIndex(data.length, 2400);
  const slice = data.slice(0, Math.max(1, idx + 1));
  const fmtAxis = (v: number) =>
    new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(v);

  return (
    <div className="chart-box">
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={slice} margin={{ top: 12, right: 20, left: 24, bottom: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#243347" />
          <XAxis dataKey="t" stroke="#8aa0b6">
            <Label value="Event index (x-axis)" offset={-6} position="insideBottom" fill="#8aa0b6" />
          </XAxis>
          <YAxis stroke="#8aa0b6" width={90} tickFormatter={fmtAxis}>
            <Label
              value="Spread in price units (y-axis)"
              angle={-90}
              position="insideLeft"
              style={{ textAnchor: 'middle', fill: '#8aa0b6' }}
            />
          </YAxis>
          <Tooltip formatter={(value: number) => fmtPrice(value)} />
          <Area type="monotone" dataKey="spread" stroke="#4ea1ff" fill="#4ea1ff66" />
        </AreaChart>
      </ResponsiveContainer>
      <p className="chart-axis-note">X-axis: event sequence. Y-axis: bid-ask spread.</p>
    </div>
  );
};
