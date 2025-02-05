import React, { useEffect, useRef, useState } from "react";
import { createChart, ColorType } from "lightweight-charts";

export const PortfolioChart = ({ data, loadMoreHistory }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const dataRef = useRef(data); // Создаём реф
  const hasReachedEndRef = useRef(false); // Следим, достигли ли конца данных
  
  
  useEffect(() => {
    dataRef.current = data;
  }, [data]); // Обновится только при изменении данных
  
  const earliestLoadedTimeRef = useRef(null); // ✅ Используем useRef
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    if (!chartContainerRef.current) return;
    
    // ❗ ОБНУЛЯЕМ ФЛАГ конца данных
    hasReachedEndRef.current = false;
    // console.log("♻️ Сбрасываем флаг конца данных");
    
    // Удаляем старый график перед созданием нового
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      seriesRef.current = null;
    }
    
    console.log("🆕 Создаём новый график...");
    
    chartRef.current = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "white" },
        textColor: "black",
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
    });
    
    seriesRef.current = chartRef.current.addCandlestickSeries();
    chartRef.current.timeScale().fitContent();
    
    if (data.length > 0) {
      earliestLoadedTimeRef.current = data[0].time; // ✅ Теперь ref хранит актуальное значение
      // console.log("📌 setEarliestLoadedTime", earliestLoadedTimeRef.current);
    }
    
    const handleResize = () => {
      if (chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);
    
    const handleTimeRangeChange = (range) => {
      // console.log("📡 Проверка загрузки истории...");
      // console.log(range, isLoading, earliestLoadedTimeRef.current, hasReachedEndRef.current); // ✅ Берём значение из ref
      
      if (!range || isLoading || !earliestLoadedTimeRef.current || hasReachedEndRef.current) return;
      
      const minTime = Math.min(...dataRef.current.map((c) => c.time));
      
      // console.log(`🔍 minTime=${minTime}, visible.to=${range.to}, earliestLoadedTime=${earliestLoadedTimeRef.current}`);
      
      if (range.to < earliestLoadedTimeRef.current + 100 * 86400) {
        // console.log(`⏳ Достигнут конец данных (${minTime}), загружаем новую историю...`);
        setIsLoading(true);
        
        loadMoreHistory(minTime).then((newEarliestTime) => {
          // console.log("🔄 newEarliestTime", newEarliestTime);
          
          if (newEarliestTime === undefined) {
            console.log("🚫 Достигнут конец всех данных. Останавливаем загрузку.");
            hasReachedEndRef.current = true; // Больше не загружаем данные
            setIsLoading(false);
            return;
          }
          
          if (newEarliestTime && newEarliestTime < earliestLoadedTimeRef.current) {
            earliestLoadedTimeRef.current = newEarliestTime; // ✅ Обновляем ref
          }
          setIsLoading(false);
        });
      }
    };
    
    chartRef.current.timeScale().subscribeVisibleTimeRangeChange(handleTimeRangeChange);
    
    return () => {
      // console.log("❌ График удалён");
      window.removeEventListener("resize", handleResize);
      if (chartRef.current) {
        chartRef.current.timeScale().unsubscribeVisibleTimeRangeChange(handleTimeRangeChange);
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, []);
  
  // useEffect(() => {
  //   console.log("📌 earliestLoadedTime обновлено:", earliestLoadedTimeRef.current);
  // });
  
  useEffect(() => {
    if (!seriesRef.current || !data || data.length === 0) return;
    
    console.log("📊 Обновление графика, получено данных:", data.length);
    
    const sortedData = [...data].sort((a, b) => a.time - b.time);
    seriesRef.current.setData(sortedData);
  }, [data]);
  
  return <div ref={chartContainerRef} style={{ width: "100%", height: "400px" }} />;
};