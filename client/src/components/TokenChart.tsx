import React, { useEffect, useRef } from 'react';
import { createChart, IChartApi, CandlestickSeries, createSeriesMarkers } from 'lightweight-charts';
import { CandleData } from '../types/token';

interface TokenChartProps {
  data: CandleData[];
  markers?: any[];
  timeframe: string;
  color?: string;
}

export function TokenChart({ data, markers = [], timeframe, color }: TokenChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<any | null>(null);
  const markersPluginRef = useRef<any | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 200,
      layout: {
        background: { color: '#0d1117' },
        textColor: '#8b949e',
      },
      grid: {
        vertLines: { color: '#21262d' },
        horzLines: { color: '#21262d' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: '#30363d',
      },
      timeScale: {
        borderColor: '#30363d',
        timeVisible: true,
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (seriesRef.current && data.length > 0) {
      seriesRef.current.setData(data);
    }
  }, [data]);

  useEffect(() => {
    if (seriesRef.current && markers.length > 0) {
      try {
        if (markersPluginRef.current) {
          markersPluginRef.current.setMarkers(markers);
        } else {
          markersPluginRef.current = createSeriesMarkers(seriesRef.current, markers);
        }
      } catch {}
    }
  }, [markers, timeframe]);

  return (
    <div className="token-chart-container">
      <div className="timeframe-label">{timeframe}</div>
      <div ref={chartContainerRef} className="token-chart" />
    </div>
  );
}
