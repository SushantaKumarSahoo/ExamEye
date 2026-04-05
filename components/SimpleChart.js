export function BarChart({ data, title, color = '#dc2626' }) {
  if (!data || data.length === 0) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>No data available</div>;
  }

  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div style={{ padding: '1rem' }}>
      {title && <h4 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: '600' }}>{title}</h4>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {data.map((item, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ minWidth: '100px', fontSize: '0.875rem', color: '#6b7280' }}>
              {item.label}
            </div>
            <div style={{ flex: 1, position: 'relative', height: '32px', background: '#f3f4f6', borderRadius: '6px', overflow: 'hidden' }}>
              <div 
                style={{ 
                  height: '100%', 
                  background: color,
                  width: `${(item.value / maxValue) * 100}%`,
                  transition: 'width 0.5s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: '0.5rem'
                }}
              >
                <span style={{ color: 'white', fontSize: '0.875rem', fontWeight: '600' }}>
                  {item.value}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LineChart({ data, title, color = '#dc2626' }) {
  if (!data || data.length === 0) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>No data available</div>;
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;

  const points = data.map((item, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((item.value - minValue) / range) * 80;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div style={{ padding: '1rem' }}>
      {title && <h4 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: '600' }}>{title}</h4>}
      <div style={{ position: 'relative', height: '200px', background: '#f9fafb', borderRadius: '8px', padding: '1rem' }}>
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          {data.map((item, index) => {
            const x = (index / (data.length - 1)) * 100;
            const y = 100 - ((item.value - minValue) / range) * 80;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="3"
                fill={color}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
          {data.map((item, index) => (
            <div key={index} style={{ fontSize: '0.75rem', color: '#6b7280', textAlign: 'center' }}>
              <div>{item.label}</div>
              <div style={{ fontWeight: '600', color: '#1f2937' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PieChart({ data, title }) {
  if (!data || data.length === 0) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>No data available</div>;
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const colors = ['#dc2626', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

  let currentAngle = 0;
  const slices = data.map((item, index) => {
    const percentage = (item.value / total) * 100;
    const angle = (item.value / total) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;

    return {
      ...item,
      percentage: percentage.toFixed(1),
      startAngle,
      endAngle: currentAngle,
      color: colors[index % colors.length]
    };
  });

  return (
    <div style={{ padding: '1rem' }}>
      {title && <h4 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: '600' }}>{title}</h4>}
      <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: '200px', height: '200px' }}>
          <svg width="200" height="200" viewBox="0 0 200 200">
            {slices.map((slice, index) => {
              const startAngle = (slice.startAngle - 90) * (Math.PI / 180);
              const endAngle = (slice.endAngle - 90) * (Math.PI / 180);
              const x1 = 100 + 80 * Math.cos(startAngle);
              const y1 = 100 + 80 * Math.sin(startAngle);
              const x2 = 100 + 80 * Math.cos(endAngle);
              const y2 = 100 + 80 * Math.sin(endAngle);
              const largeArc = slice.endAngle - slice.startAngle > 180 ? 1 : 0;

              return (
                <path
                  key={index}
                  d={`M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`}
                  fill={slice.color}
                  stroke="white"
                  strokeWidth="2"
                />
              );
            })}
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: '200px' }}>
          {slices.map((slice, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: slice.color }}></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>{slice.label}</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  {slice.value} ({slice.percentage}%)
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
